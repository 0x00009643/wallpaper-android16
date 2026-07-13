'use strict';

function Vec2(x, y) {
    if (!(this instanceof Vec2)) {
        return new Vec2(x, y);
    }
    this.x = x;
    this.y = y;
}

Vec2.Zero = new Vec2(0, 0);

Vec2.fromAngleMag = function(a, m) {
    return new Vec2(m * Math.cos(a), m * Math.sin(a));
};

Vec2.prototype.mag = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
};

Vec2.prototype.distance = function(other) {
    return this.minus(other).mag();
};

Vec2.prototype.angle = function() {
    return Math.atan2(this.y, this.x);
};

Vec2.prototype.dot = function(o) {
    return this.x * o.x + this.y * o.y;
};

Vec2.prototype.minus = function(o) {
    return new Vec2(this.x - o.x, this.y - o.y);
};

Vec2.prototype.plus = function(o) {
    return new Vec2(this.x + o.x, this.y + o.y);
};

Vec2.prototype.times = function(f) {
    return new Vec2(this.x * f, this.y * f);
};

Vec2.prototype.neg = function() {
    return new Vec2(-this.x, -this.y);
};

Vec2.prototype.rotate = function(angle, origin) {
    if (!origin) origin = Vec2.Zero;
    var translated = this.minus(origin);
    return origin.plus(new Vec2(
        translated.x * Math.cos(angle) - translated.y * Math.sin(angle),
        translated.x * Math.sin(angle) + translated.y * Math.cos(angle)
    ));
};

Vec2.prototype.str = function(fmt) {
    return '<' + this.x.toFixed(2) + ',' + this.y.toFixed(2) + '>';
};
