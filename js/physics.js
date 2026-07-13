'use strict';

var TIME_SCALE = 1;
var MAX_VALID_DT = 1;

// --- Random ---
function createRng(seed) {
    var s = seed;
    return {
        nextFloat: function() {
            s = (s * 16807 + 0) % 2147483647;
            return (s - 1) / 2147483646;
        },
        nextInt: function(from, until) {
            return Math.floor(this.nextFloat() * (until - from)) + from;
        },
        nextFloatInRange: function(from, until) {
            return from + (until - from) * this.nextFloat();
        },
        choose: function(arr) {
            return arr[this.nextInt(0, arr.length)];
        },
        shuffle: function(arr) {
            for (var i = arr.length - 1; i > 0; i--) {
                var j = this.nextInt(0, i + 1);
                var tmp = arr[i];
                arr[i] = arr[j];
                arr[j] = tmp;
            }
            return arr;
        }
    };
}

// --- Fuse ---
function Fuse(lifetime) {
    this.lifetime = lifetime;
}
Fuse.prototype.canBeRemoved = function() {
    return this.lifetime < 0;
};
Fuse.prototype.update = function(dt) {
    this.lifetime -= dt;
};

// --- Entity ---
// Interface: update(sim, dt), postUpdate(sim, dt)

// --- Body ---
function Body(name) {
    this.name = name || 'Unknown';
    this.pos = Vec2.Zero;
    this.opos = Vec2.Zero;
    this.velocity = Vec2.Zero;
    this.mass = 0;
    this.angle = 0;
    this.oangle = 0;
    this.radius = 0;
    this.collides = true;
}

Body.prototype.update = function(sim, dt) {
    if (dt <= 0) return;
    var vscaled = this.velocity.times(dt);
    this.opos = this.pos;
    this.pos = this.pos.plus(vscaled);
};

Body.prototype.postUpdate = function(sim, dt) {
    if (dt <= 0) return;
    this.velocity = this.pos.minus(this.opos).times(1 / dt);
};

// --- Container ---
function Container(radius) {
    this.radius = radius;
    this._list = [];
    this.softness = 0;
}

Container.prototype.add = function(p) {
    this._list.push(p);
};

Container.prototype.remove = function(p) {
    var idx = this._list.indexOf(p);
    if (idx >= 0) this._list.splice(idx, 1);
};

Container.prototype.solve = function(sim, dt) {
    for (var i = 0; i < this._list.length; i++) {
        var p = this._list[i];
        if (p.pos.mag() + p.radius > this.radius) {
            p.pos = Vec2.fromAngleMag(p.pos.angle(), this.radius - p.radius);
        }
    }
};

// --- Simulator ---
function Simulator(randomSeed) {
    this._wallClockMs = 0;
    this.now = 0;
    this.dt = 0;
    this.rng = createRng(randomSeed);
    this.entities = [];
    this.constraints = [];
    this._simStepListeners = [];
}

Simulator.prototype.add = function(e) {
    this.entities.push(e);
};

Simulator.prototype.remove = function(e) {
    var idx = this.entities.indexOf(e);
    if (idx >= 0) this.entities.splice(idx, 1);
};

Simulator.prototype.addConstraint = function(c) {
    this.constraints.push(c);
};

Simulator.prototype.removeConstraint = function(c) {
    var idx = this.constraints.indexOf(c);
    if (idx >= 0) this.constraints.splice(idx, 1);
};

Simulator.prototype.updateAll = function(dt, entities) {
    for (var i = 0; i < entities.length; i++) {
        entities[i].update(this, dt);
    }
};

Simulator.prototype.solveAll = function(dt, constraints) {
    for (var i = 0; i < constraints.length; i++) {
        constraints[i].solve(this, dt);
    }
};

Simulator.prototype.postUpdateAll = function(dt, entities) {
    for (var i = 0; i < entities.length; i++) {
        entities[i].postUpdate(this, dt);
    }
};

Simulator.prototype.step = function(ms) {
    var firstFrame = (this._wallClockMs === 0);
    this.dt = (ms - this._wallClockMs) / 1e3 * TIME_SCALE;
    this._wallClockMs = ms;

    if (firstFrame || this.dt > MAX_VALID_DT) return;

    this.now += this.dt;

    var localEntities = this.entities.slice();
    var localConstraints = this.constraints.slice();

    this.updateAll(this.dt, localEntities);
    this.solveAll(this.dt, localConstraints);
    this.postUpdateAll(this.dt, localEntities);

    for (var i = 0; i < this._simStepListeners.length; i++) {
        this._simStepListeners[i]();
    }
};

Simulator.prototype.addSimulationStepListener = function(listener) {
    this._simStepListeners.push(listener);
    return {
        dispose: function() {
            var idx = this._simStepListeners.indexOf(listener);
            if (idx >= 0) this._simStepListeners.splice(idx, 1);
        }.bind(this)
    };
};
