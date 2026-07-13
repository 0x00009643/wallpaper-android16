'use strict';

var BRAKING_TIME = 5;
var SIGHTSEEING_TIME = 15;
var LAUNCH_THRUST_TIME = 5;
var STRATEGY_MIN_TIME = 0.5;

function Autopilot(ship, universe) {
    this.ship = ship;
    this.universe = universe;
    this.enabled = false;
    this.target = null;
    this.landingAltitude = 0;
    this.nextStrategyTime = 0;
    this.brakingDistance = 0;
    this.leadingPos = Vec2.Zero;
    this.leadingVector = Vec2.Zero;
    this.strategy = 'NONE';
    this._debug = '';
}

Autopilot.prototype.getTelemetry = function() {
    if (!this.enabled) return '';
    var lines = [
        '---- AUTOPILOT ENGAGED ----',
        'TGT: ' + (this.target ? this.target.name.toUpperCase() : 'SELECTING...'),
        'EXE: ' + this.strategy + (this._debug ? ' (' + this._debug + ')' : '')
    ];
    return lines.join('\n');
};

Autopilot.prototype.postUpdate = function() {};

Autopilot.prototype.update = function(sim, dt) {
    if (!this.enabled) return;
    if (sim.now < this.nextStrategyTime) return;

    var currentStrategy = this.strategy;

    if (this.ship.landing) {
        if (this.target) {
            this.strategy = 'LANDED';
            this._debug = '';
            this.target = null;
            this.landingAltitude = 0;
            this.nextStrategyTime = sim.now + SIGHTSEEING_TIME;
        } else {
            this.ship.thrust = Vec2.fromAngleMag(this.ship.angle, 1);
            this.strategy = 'LAUNCHING';
            this._debug = '';
            this.nextStrategyTime = sim.now + LAUNCH_THRUST_TIME;
        }
    } else {
        if (!this.target) {
            var sorted = this.universe.planets.slice().sort(function(a, b) {
                return a.pos.distance(this.ship.pos) - b.pos.distance(this.ship.pos);
            }.bind(this));
            this.target = null;
            for (var i = 0; i < sorted.length; i++) {
                if (!sorted[i].explored) {
                    this.target = sorted[i];
                    break;
                }
            }
            if (!this.target) {
                this.target = this.universe.planets[this.universe.rng.nextInt(0, this.universe.planets.length)];
            }
            this.brakingDistance = 0;
        }

        if (this.target) {
            var target = this.target;
            var shipV = this.ship.velocity;
            var targetV = target.velocity;
            var targetVector = target.pos.minus(this.ship.pos);
            var altitude = targetVector.mag() - target.radius;

            this.landingAltitude = Math.min(target.radius, 100);

            var relativeV = shipV.minus(targetV);
            var projection = relativeV.dot(targetVector.times(1 / targetVector.mag()));
            var relativeSpeed = relativeV.mag() * (projection >= 0 ? 1 : -1);
            var timeToTarget = relativeSpeed !== 0 ? altitude / relativeSpeed : 1000;

            var newBrakingDistance = BRAKING_TIME * (relativeSpeed > 0 ? relativeSpeed : MAIN_ENGINE_ACCEL);
            this.brakingDistance = expSmooth(this.brakingDistance, newBrakingDistance, sim.dt, 5);

            this.leadingPos = target.pos.plus(
                Vec2.fromAngleMag(target.velocity.angle(),
                    Math.min(altitude / 2, target.velocity.mag()))
            );
            this.leadingVector = this.leadingPos.minus(this.ship.pos);

            if (altitude < this.landingAltitude) {
                this.strategy = 'LANDING';
                this.ship.angle = this.ship.pos.minus(target.pos).angle();
                this.ship.thrust = Vec2.Zero;
            } else {
                if (relativeSpeed < 0 || altitude > this.brakingDistance) {
                    this.strategy = 'CHASING';
                    this.ship.angle = this.leadingVector.angle();
                    this.ship.thrust = Vec2.fromAngleMag(this.ship.angle, 1);
                } else {
                    this.strategy = 'APPROACHING';
                    this.ship.angle = this.ship.velocity.neg().angle();
                    var decel = relativeSpeed / timeToTarget;
                    var decelThrust = decel / MAIN_ENGINE_ACCEL * 0.9;
                    this.ship.thrust = Vec2.fromAngleMag(this.ship.angle, decelThrust);
                }
            }
            this._debug = ('DV=%.0f D=%.0f T%+.1f')
                .replace('%.0f', relativeSpeed.toFixed(0))
                .replace('%.0f', altitude.toFixed(0))
                .replace('%+.1f', timeToTarget.toFixed(1));
        }

        if (this.strategy !== currentStrategy) {
            this.nextStrategyTime = sim.now + STRATEGY_MIN_TIME;
        }
    }
};


