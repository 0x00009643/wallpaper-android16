'use strict';

var UNIVERSE_RANGE = 200000;
var NUM_PLANETS_MIN = 1;
var NUM_PLANETS_MAX = 10;
var STAR_RADIUS_MIN = 1000;
var STAR_RADIUS_MAX = 8000;
var PLANET_RADIUS_MIN = 50;
var PLANET_RADIUS_MAX = 2000;
var PLANET_ORBIT_MIN = STAR_RADIUS_MAX * 2;
var PLANET_ORBIT_MAX = UNIVERSE_RANGE * 0.75;

var GRAVITATION = 0.01;
var KEPLER_CONSTANT = 50;
var PLANETARY_DENSITY = 2.5;
var STELLAR_DENSITY = 0.5;
var SPACECRAFT_MASS = 10;
var CRAFT_SPEED_LIMIT = 5000;
var MAIN_ENGINE_ACCEL = 1000;
var LAUNCH_MECO = 2;
var LANDING_REMOVAL_TIME = 60 * 15;
var TRACK_LENGTH = 10000;
var SIMPLE_TRACK_DRAWING = true;

var STAR_CLASS_NAMES = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];

// --- Planet ---
function Planet(orbitCenter, radius, pos, speed, color) {
    Body.call(this, 'Planet');
    this.orbitCenter = orbitCenter;
    this.radius = radius;
    this.pos = pos;
    this.speed = speed;
    this.color = color || '#FFFFFF';
    this.orbitRadius = pos.distance(orbitCenter);
    this.mass = (4 / 3) * PIf * Math.pow(radius, 3) * PLANETARY_DENSITY;
    this.atmosphere = '';
    this.description = '';
    this.flora = '';
    this.fauna = '';
    this.explored = false;
}
Planet.prototype = Object.create(Body.prototype);
Planet.prototype.constructor = Planet;

Planet.prototype.update = function(sim, dt) {
    var orbitAngle = this.pos.minus(this.orbitCenter).angle();
    this.velocity = Vec2.fromAngleMag(orbitAngle + PIf / 2, this.speed);
    Body.prototype.update.call(this, sim, dt);
};

Planet.prototype.postUpdate = function(sim, dt) {
    var orbitAngle = this.pos.minus(this.orbitCenter).angle();
    this.pos = this.orbitCenter.plus(Vec2.fromAngleMag(orbitAngle, this.orbitRadius));
    Body.prototype.postUpdate.call(this, sim, dt);
};

// --- Star ---
function Star(cls, radius) {
    Planet.call(this, Vec2.Zero, radius, Vec2.Zero, 0, StarClassColors[cls]);
    this.name = '';
    this.cls = cls;
    this.mass = (4 / 3) * PIf * Math.pow(radius, 3) * STELLAR_DENSITY;
    this.collides = false;
    this.anim = 0;
}
Star.prototype = Object.create(Planet.prototype);
Star.prototype.constructor = Star;

Star.prototype.update = function(sim, dt) {
    this.anim += dt;
};

// --- Track ---
function Track() {
    this.positions = [];
    this.angles = [];
}

Track.prototype.add = function(x, y, a) {
    if (this.positions.length >= TRACK_LENGTH - 1) {
        this.positions.shift();
        this.angles.shift();
        this.positions.shift();
        this.angles.shift();
    }
    this.positions.push(Vec2(x, y));
    this.angles.push(a);
};

// --- Spark ---
var SparkStyle = {
    LINE: 0,
    LINE_ABSOLUTE: 1,
    DOT: 2,
    DOT_ABSOLUTE: 3,
    RING: 4
};

function Spark(ttl, collides, mass, style, color, size) {
    Body.call(this, 'Spark');
    this.ttl = ttl;
    this.collides = collides || false;
    this.mass = mass || 0;
    this.style = style !== undefined ? style : SparkStyle.LINE;
    this.color = color || '#888888';
    this.size = size || 2;
    this.fuse = new Fuse(ttl);
}
Spark.prototype = Object.create(Body.prototype);
Spark.prototype.constructor = Spark;

Spark.prototype.update = function(sim, dt) {
    Body.prototype.update.call(this, sim, dt);
    this.fuse.update(dt);
};

Spark.prototype.canBeRemoved = function() {
    return this.fuse.canBeRemoved();
};

// --- Landing ---
function Landing(ship, planet, angle, text) {
    this.ship = ship;
    this.planet = planet;
    this.angle = angle;
    this.text = text || '';
    this.fuse = new Fuse(LANDING_REMOVAL_TIME);
}
Landing.prototype.canBeRemoved = function() {
    return this.fuse.canBeRemoved();
};
Landing.prototype.solve = function(sim, dt) {
    if (this.ship) {
        var landingVector = Vec2.fromAngleMag(this.angle, this.ship.radius + this.planet.radius);
        this.ship.pos = this.planet.pos.plus(landingVector);
        this.ship.angle = this.angle;
    }
    this.fuse.update(dt);
};

// --- Spacecraft ---
function Spacecraft() {
    Body.call(this, 'Spacecraft');
    this.mass = SPACECRAFT_MASS;
    this.radius = 12;
    this.thrust = Vec2.Zero;
    this.launchClock = 0;
    this.transit = false;
    this.track = new Track();
    this.landing = null;
    this.autopilot = null;
}
Spacecraft.prototype = Object.create(Body.prototype);
Spacecraft.prototype.constructor = Spacecraft;

Spacecraft.prototype.update = function(sim, dt) {
    var thrustMag = this.thrust.mag();
    if (thrustMag > 0) {
        var deltaV = MAIN_ENGINE_ACCEL * dt;
        if (SCALED_THRUST) deltaV *= clamp(thrustMag, 0, 1);

        if (this.landing) {
            if (this.launchClock === 0) this.launchClock = sim.now + 1;
            if (sim.now > this.launchClock) {
                this.landing.ship = null;
                this.landing = null;
            } else {
                deltaV = 0;
            }
        }

        this.velocity = this.velocity.plus(Vec2.fromAngleMag(this.angle, deltaV));
    } else {
        if (this.launchClock !== 0) this.launchClock = 0;
    }

    if (this.velocity.mag() > CRAFT_SPEED_LIMIT) {
        this.velocity = Vec2.fromAngleMag(this.velocity.angle(), CRAFT_SPEED_LIMIT);
    }

    Body.prototype.update.call(this, sim, dt);
};

Spacecraft.prototype.postUpdate = function(sim, dt) {
    Body.prototype.postUpdate.call(this, sim, dt);

    this.track.add(this.pos.x, this.pos.y, this.angle);

    var mag = this.thrust.mag();
    if (sim.rng.nextFloat() < mag) {
        var spark = new Spark(
            sim.rng.nextFloatInRange(0.5, 1),
            true, 1, SparkStyle.RING, 'rgba(255,255,255,0.25)', 1
        );
        spark.pos = this.pos;
        spark.opos = this.pos;
        spark.velocity = this.velocity.plus(Vec2.fromAngleMag(
            this.angle + sim.rng.nextFloatInRange(-0.2, 0.2),
            -MAIN_ENGINE_ACCEL * mag * 10 * dt
        ));
        sim.add(spark);
    }
};

var SCALED_THRUST = true;

// --- Universe ---
function Universe(namer, randomSeed) {
    Simulator.call(this, randomSeed);
    this.namer = namer;
    this.star = null;
    this.ship = null;
    this.planets = [];
    this.follow = null;
    this.ringfence = null;
    this.latestDiscovery = null;
}

Universe.prototype = Object.create(Simulator.prototype);
Universe.prototype.constructor = Universe;

Universe.prototype.initRandom = function() {
    var systemName = this.namer.nameSystem(this.rng);
    var cls = this.rng.choose(STAR_CLASS_NAMES);
    var radius = this.rng.nextFloatInRange(STAR_RADIUS_MIN, STAR_RADIUS_MAX);

    this.star = new Star(cls, radius);
    this.star.name = systemName;

    var numPlanets = this.rng.nextInt(NUM_PLANETS_MIN, NUM_PLANETS_MAX + 1);
    for (var i = 0; i < numPlanets; i++) {
        var pr = this.rng.nextFloatInRange(PLANET_RADIUS_MIN, PLANET_RADIUS_MAX);
        var orbitRadius = this.rng.nextFloatInRange(PLANET_ORBIT_MIN, PLANET_ORBIT_MAX);
        var period = Math.sqrt(Math.pow(orbitRadius, 3) / this.star.mass) * KEPLER_CONSTANT;
        var speed = 2 * PIf * orbitRadius / period;
        var angle = this.rng.nextFloat() * PI2f;
        var pos = this.star.pos.plus(Vec2.fromAngleMag(angle, orbitRadius));

        var p = new Planet(this.star.pos, pr, pos, speed, Colors.Eigengrau4);
        p.description = this.namer.describePlanet(this.rng);
        p.atmosphere = this.namer.describeAtmo(this.rng);
        p.flora = this.namer.describeLife(this.rng);
        p.fauna = this.namer.describeLife(this.rng);
        this.planets.push(p);
        this.add(p);
    }

    var self = this;
    this.planets.sort(function(a, b) {
        return a.pos.distance(self.star.pos) - b.pos.distance(self.star.pos);
    });
    this.planets.forEach(function(planet, idx) {
        planet.name = systemName + ' ' + (idx + 1);
    });
    this.add(this.star);

    this.ship = new Spacecraft();
    var shipAngle = this.rng.nextFloat() * PI2f;
    var shipOrbit = this.rng.nextFloatInRange(PLANET_ORBIT_MIN, PLANET_ORBIT_MAX);
    this.ship.pos = this.star.pos.plus(Vec2.fromAngleMag(shipAngle, shipOrbit));
    this.ship.angle = this.rng.nextFloat() * PI2f;
    this.add(this.ship);

    this.ringfence = new Container(UNIVERSE_RANGE);
    this.ringfence.add(this.ship);
    this.addConstraint(this.ringfence);

    this.follow = this.ship;
};

Universe.prototype.closestPlanet = function() {
    var self = this;
    var all = this.planets.concat([this.star]);
    all.sort(function(a, b) {
        return a.pos.distance(self.ship.pos) - b.pos.distance(self.ship.pos);
    });
    return all[0];
};

Universe.prototype.updateAll = function(dt, entities) {
    this.ship.transit = false;

    if (!this.ship.landing && this.ship.autopilot && this.ship.autopilot.enabled) {
        var allBodies = this.planets.concat([this.star]);
        for (var i = 0; i < allBodies.length; i++) {
            var planet = allBodies[i];
            var vector = planet.pos.minus(this.ship.pos);
            var d = vector.mag();
            if (d < planet.radius) {
                if (planet instanceof Star) this.ship.transit = true;
            } else if (this.now > this.ship.launchClock + LAUNCH_MECO) {
                this.ship.velocity = this.ship.velocity.plus(
                    Vec2.fromAngleMag(vector.angle(),
                        GRAVITATION * (this.ship.mass * planet.mass) / Math.pow(d, 2)
                    ).times(dt)
                );
            }
        }
    }

    Simulator.prototype.updateAll.call(this, dt, entities);
};

Universe.prototype.solveAll = function(dt, constraints) {
    if (this.ship.landing === null) {
        var planet = this.closestPlanet();
        if (planet.collides) {
            var d = this.ship.pos.distance(planet.pos) - this.ship.radius - planet.radius;
            var a = this.ship.pos.minus(planet.pos).angle();

            if (d < 0) {
                var vDiff = this.ship.velocity.minus(planet.velocity).mag();
                var aDiff = Math.abs(this.ship.angle - a);

                if (aDiff < PIf / 4) {
                    var landing = new Landing(this.ship, planet, a,
                        this.namer.describeActivity(this.rng, planet));
                    if (this.ship.thrust.mag() > 0) {
                        this.ship.thrust = Vec2.Zero;
                    }
                    this.ship.landing = landing;
                    this.ship.velocity = planet.velocity;
                    this.addConstraint(landing);
                    planet.explored = true;
                    this.latestDiscovery = planet;
                } else {
                    var impact = planet.pos.plus(Vec2.fromAngleMag(a, planet.radius));
                    this.ship.pos = planet.pos.plus(
                        Vec2.fromAngleMag(a, planet.radius + this.ship.radius - d)
                    );
                    for (var j = 0; j < 10; j++) {
                        var spark = new Spark(
                            this.rng.nextFloatInRange(0.5, 2),
                            false, 0, SparkStyle.DOT, '#FFFFFF', 1
                        );
                        spark.pos = impact.plus(Vec2.fromAngleMag(
                            this.rng.nextFloatInRange(0, 2 * PIf),
                            this.rng.nextFloatInRange(0.1, 0.5)
                        ));
                        spark.opos = spark.pos;
                        spark.velocity = this.ship.velocity.times(0.8).plus(Vec2.fromAngleMag(
                            this.rng.nextFloatInRange(0, 2 * PIf),
                            this.rng.nextFloatInRange(0.1, 0.5)
                        ));
                        this.add(spark);
                    }
                }
            }
        }
    }

    Simulator.prototype.solveAll.call(this, dt, constraints);
};

Universe.prototype.postUpdateAll = function(dt, entities) {
    Simulator.prototype.postUpdateAll.call(this, dt, entities);

    for (var i = this.entities.length - 1; i >= 0; i--) {
        if (this.entities[i].canBeRemoved && this.entities[i].canBeRemoved()) {
            this.entities.splice(i, 1);
        }
    }
    for (var j = this.constraints.length - 1; j >= 0; j--) {
        if (this.constraints[j].canBeRemoved && this.constraints[j].canBeRemoved()) {
            this.constraints.splice(j, 1);
        }
    }
};
