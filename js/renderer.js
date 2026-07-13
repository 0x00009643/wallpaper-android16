'use strict';

var DRAW_ORBITS = true;
var DRAW_GRAVITATIONAL_FIELDS = true;
var DRAW_STAR_GRAVITATIONAL_FIELDS = true;
var STAR_POINTS = 36;

// --- SVG Path Data for Spacecraft ---
var SPACECRAFT_PATH = 'M11.853 0 C11.853 -4.418 8.374 -8 4.083 -8 L-5.5 -8 C-6.328 -8 -7 -7.328 -7 -6.5 C-7 -5.672 -6.328 -5 -5.5 -5 L-2.917 -5 C-1.26 -5 0.083 -3.657 0.083 -2 L0.083 2 C0.083 3.657 -1.26 5 -2.917 5 L-5.5 5 C-6.328 5 -7 5.672 -7 6.5 C-7 7.328 -6.328 8 -5.5 8 L4.083 8 C8.374 8 11.853 4.418 11.853 0 Z';

var SPACECRAFT_LEGS = 'M-7 -6.5 l-3.5 0 l-1 -2 l 0 4 l 1 -2 Z M-7 6.5 l-3.5 0 l-1 -2 l 0 4 l 1 -2 Z';

// --- Parse SVG Path to Canvas Path ---
function parseSvgPath(ctx, d) {
    var regex = /([A-Za-z])\s*([-.,0-9e ]+)/g;
    var match;
    var cx = 0, cy = 0;
    while ((match = regex.exec(d)) !== null) {
        var cmd = match[1];
        var args = match[2].trim().split(/\s+/).map(Number);
        switch (cmd) {
            case 'M': ctx.moveTo(args[0], args[1]); break;
            case 'C': ctx.bezierCurveTo(args[0], args[1], args[2], args[3], args[4], args[5]); break;
            case 'L': ctx.lineTo(args[0], args[1]); break;
            case 'l': ctx.lineTo(cx + args[0], cy + args[1]); break;
            case 'Z': ctx.closePath(); break;
        }
        if (cmd === 'Z') {
            cx = 0; cy = 0;
        } else if (cmd === 'l') {
            cx += args[args.length - 2];
            cy += args[args.length - 1];
        } else if (args.length >= 2) {
            cx = args[args.length - 2];
            cy = args[args.length - 1];
        }
    }
}

function createSpacecraftPath() {
    var p = new Path2D();
    p.currentX = 0;
    p.currentY = 0;
    parseSvgPath(p, SPACECRAFT_PATH);
    return p;
}

function createSpacecraftLegsPath() {
    var p = new Path2D();
    p.currentX = 0;
    p.currentY = 0;
    parseSvgPath(p, SPACECRAFT_LEGS);
    return p;
}

function createThrustPath() {
    var p = new Path2D();
    var radius = -3;
    var sides = 3;
    var angleStep = PI2f / sides;
    p.moveTo(radius + (-5), 0);
    for (var i = 1; i < sides; i++) {
        var a = angleStep * i;
        p.lineTo(radius * Math.cos(a) + (-5), radius * Math.sin(a));
    }
    p.closePath();
    return p;
}

var _spacecraftPath = null;
var _spacecraftLegsPath = null;
var _thrustPath = null;

function getSpacecraftPath() {
    if (!_spacecraftPath) _spacecraftPath = createSpacecraftPath();
    return _spacecraftPath;
}

function getSpacecraftLegsPath() {
    if (!_spacecraftLegsPath) _spacecraftLegsPath = createSpacecraftLegsPath();
    return _spacecraftLegsPath;
}

function getThrustPath() {
    if (!_thrustPath) _thrustPath = createThrustPath();
    return _thrustPath;
}

// --- Star Burst Path ---
function createStarPath(radius1, radius2, points) {
    var p = new Path2D();
    var angleStep = PI2f / points;
    p.moveTo(radius1, 0);
    p.lineTo(radius2 * Math.cos(angleStep * 0.5), radius2 * Math.sin(angleStep * 0.5));
    for (var i = 1; i < points; i++) {
        p.lineTo(radius1 * Math.cos(angleStep * i), radius1 * Math.sin(angleStep * i));
        p.lineTo(radius2 * Math.cos(angleStep * (i + 0.5)), radius2 * Math.sin(angleStep * (i + 0.5)));
    }
    p.closePath();
    return p;
}

// --- Polygon Path ---
function createPolygonPath(radius, sides) {
    var p = new Path2D();
    var angleStep = PI2f / sides;
    p.moveTo(radius, 0);
    for (var i = 1; i < sides; i++) {
        p.lineTo(radius * Math.cos(angleStep * i), radius * Math.sin(angleStep * i));
    }
    p.closePath();
    return p;
}

// --- Drawing Functions ---
function drawUniverse(ctx, universe, zoom) {
    // constraints
    for (var i = 0; i < universe.constraints.length; i++) {
        var c = universe.constraints[i];
        if (c instanceof Landing) {
            drawLanding(ctx, c, zoom);
        } else if (c instanceof Container) {
            drawContainer(ctx, c, zoom);
        }
    }

    drawStar(ctx, universe.star, zoom);

    // entities
    for (var j = 0; j < universe.entities.length; j++) {
        var e = universe.entities[j];
        if (e === universe.star) continue;
        if (e instanceof Spark) {
            drawSpark(ctx, e, zoom);
        } else if (e instanceof Planet) {
            drawPlanet(ctx, e, zoom);
        }
    }

    if (universe.ship.autopilot) {
        drawAutopilot(ctx, universe.ship.autopilot, zoom);
    }
    drawSpacecraft(ctx, universe.ship, zoom);
}

function drawContainer(ctx, container, zoom) {
    ctx.save();
    ctx.strokeStyle = '#800000';
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([8 / zoom, 8 / zoom]);
    ctx.beginPath();
    ctx.arc(0, 0, container.radius, 0, PI2f);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

function drawGravitationalField(ctx, planet, zoom) {
    var rings = 8;
    for (var i = 0; i < rings; i++) {
        var t = i / rings;
        var force = 200 + (0.01 - 200) * t;
        var r = Math.sqrt(GRAVITATION * planet.mass * SPACECRAFT_MASS / Math.abs(force));
        var alpha = 0.5 + (0.1 - 0.5) * t;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,0,0,' + alpha + ')';
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        ctx.arc(planet.pos.x, planet.pos.y, r, 0, PI2f);
        ctx.stroke();
        ctx.restore();
    }
}

function drawPlanet(ctx, planet, zoom) {
    if (DRAW_ORBITS) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0,255,255,0.5)';
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        ctx.arc(planet.orbitCenter.x, planet.orbitCenter.y,
            planet.pos.distance(planet.orbitCenter), 0, PI2f);
        ctx.stroke();
        ctx.restore();
    }

    if (DRAW_GRAVITATIONAL_FIELDS) {
        drawGravitationalField(ctx, planet, zoom);
    }

    ctx.save();
    ctx.fillStyle = Colors.Eigengrau;
    ctx.beginPath();
    ctx.arc(planet.pos.x, planet.pos.y, planet.radius, 0, PI2f);
    ctx.fill();

    ctx.strokeStyle = planet.color;
    ctx.lineWidth = 2 / zoom;
    ctx.beginPath();
    ctx.arc(planet.pos.x, planet.pos.y, planet.radius, 0, PI2f);
    ctx.stroke();
    ctx.restore();
}

function drawStar(ctx, star, zoom) {
    ctx.save();
    ctx.translate(star.pos.x, star.pos.y);

    // star body
    ctx.fillStyle = star.color;
    ctx.beginPath();
    ctx.arc(0, 0, star.radius, 0, PI2f);
    ctx.fill();

    if (DRAW_STAR_GRAVITATIONAL_FIELDS) {
        drawGravitationalField(ctx, star, zoom);
    }

    // star burst 1
    ctx.save();
    ctx.rotate(star.anim / 23 * PI2f);
    ctx.strokeStyle = star.color;
    ctx.lineWidth = 3 / zoom;
    var path1 = createStarPath(star.radius + 80, star.radius + 250, STAR_POINTS);
    ctx.stroke(path1);
    ctx.restore();

    // star burst 2
    ctx.save();
    ctx.rotate(star.anim / -19 * PI2f);
    ctx.strokeStyle = star.color;
    ctx.lineWidth = 3 / zoom;
    var path2 = createStarPath(star.radius + 20, star.radius + 200, STAR_POINTS + 1);
    ctx.stroke(path2);
    ctx.restore();

    ctx.restore();
}

function drawSpacecraft(ctx, ship, zoom) {
    ctx.save();
    ctx.translate(ship.pos.x, ship.pos.y);
    ctx.rotate(ship.angle);

    // landing legs
    if (ship.landing) {
        ctx.save();
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 2 / zoom;
        ctx.stroke(getSpacecraftLegsPath());
        ctx.restore();
    }

    // ship body (fill)
    ctx.fillStyle = Colors.Eigengrau;
    ctx.fill(getSpacecraftPath());

    // ship body (stroke)
    ctx.strokeStyle = ship.transit ? '#000000' : '#FFFFFF';
    ctx.lineWidth = 2 / zoom;
    ctx.stroke(getSpacecraftPath());

    // thrust indicator
    if (ship.thrust.mag() > 0) {
        ctx.save();
        ctx.strokeStyle = '#FF8800';
        ctx.lineWidth = 2 / zoom;
        ctx.stroke(getThrustPath());
        ctx.restore();
    }

    ctx.restore();

    // track
    drawTrack(ctx, ship.track, zoom);
}

function drawLanding(ctx, landing, zoom) {
    var v = landing.planet.pos.plus(Vec2.fromAngleMag(landing.angle, landing.planet.radius));

    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(landing.angle);

    var height = 80;
    var strokeWidth = 2 / zoom;
    ctx.strokeStyle = Colors.Flag;
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(height, 0);
    ctx.lineTo(height * 0.875, height * 0.25);
    ctx.lineTo(height * 0.75, 0);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
}

function drawSpark(ctx, spark, zoom) {
    if (spark.fuse.lifetime < 0) return;
    var life = 1 - spark.fuse.lifetime / spark.ttl;

    switch (spark.style) {
        case SparkStyle.LINE:
            if (spark.opos.mag() > 0) {
                ctx.save();
                ctx.strokeStyle = spark.color;
                ctx.lineWidth = spark.size;
                ctx.beginPath();
                ctx.moveTo(spark.opos.x, spark.opos.y);
                ctx.lineTo(spark.pos.x, spark.pos.y);
                ctx.stroke();
                ctx.restore();
            }
            break;
        case SparkStyle.LINE_ABSOLUTE:
            if (spark.opos.mag() > 0) {
                ctx.save();
                ctx.strokeStyle = spark.color;
                ctx.lineWidth = spark.size / zoom;
                ctx.beginPath();
                ctx.moveTo(spark.opos.x, spark.opos.y);
                ctx.lineTo(spark.pos.x, spark.pos.y);
                ctx.stroke();
                ctx.restore();
            }
            break;
        case SparkStyle.DOT:
            ctx.save();
            ctx.fillStyle = spark.color;
            ctx.beginPath();
            ctx.arc(spark.pos.x, spark.pos.y, spark.size, 0, PI2f);
            ctx.fill();
            ctx.restore();
            break;
        case SparkStyle.DOT_ABSOLUTE:
            ctx.save();
            ctx.fillStyle = spark.color;
            ctx.beginPath();
            ctx.arc(spark.pos.x, spark.pos.y, spark.size / zoom, 0, PI2f);
            ctx.fill();
            ctx.restore();
            break;
        case SparkStyle.RING:
            var radius = Math.exp(lerp(spark.size, 3 * spark.size, life)) - 1;
            var alpha = 1 - life;
            ctx.save();
            ctx.strokeStyle = hexToRgba(spark.color, alpha);
            ctx.lineWidth = 1 / zoom;
            ctx.beginPath();
            ctx.arc(spark.pos.x, spark.pos.y, radius, 0, PI2f);
            ctx.stroke();
            ctx.restore();
            break;
    }
}

function drawTrack(ctx, track, zoom) {
    if (SIMPLE_TRACK_DRAWING) {
        if (track.positions.length < 2) return;
        ctx.save();
        ctx.strokeStyle = Colors.Track;
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        ctx.moveTo(track.positions[0].x, track.positions[0].y);
        for (var i = 1; i < track.positions.length; i++) {
            ctx.lineTo(track.positions[i].x, track.positions[i].y);
        }
        ctx.stroke();
        ctx.restore();
    } else {
        if (track.positions.length < 2) return;
        var a = 0.5;
        var positions = track.positions;
        var prev = positions[positions.length - 1];
        for (var i = positions.length - 2; i >= 0; i--) {
            var pos = positions[i];
            ctx.save();
            ctx.strokeStyle = 'rgba(0,255,0,' + a + ')';
            ctx.lineWidth = Math.max(1, 1 / zoom);
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            ctx.restore();
            prev = pos;
            a = clamp(a - 1 / TRACK_LENGTH, 0, 1);
        }
    }
}

function drawAutopilot(ctx, autopilot, zoom) {
    var color = 'rgba(66,133,244,0.5)';

    if (autopilot.target) {
        var target = autopilot.target;

        // rotating polygon around target
        ctx.save();
        ctx.translate(target.pos.x, target.pos.y);
        ctx.rotate(autopilot.universe.now * PI2f / 10);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 / zoom;
        var polygonPath = createPolygonPath(target.radius + autopilot.brakingDistance, 15);
        ctx.stroke(polygonPath);
        // landing altitude ring
        ctx.beginPath();
        ctx.arc(0, 0, target.radius + autopilot.landingAltitude / 2, 0, PI2f);
        ctx.lineWidth = autopilot.landingAltitude;
        ctx.globalAlpha = 0.25;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();

        // line to leading position
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        ctx.moveTo(autopilot.ship.pos.x, autopilot.ship.pos.y);
        ctx.lineTo(autopilot.leadingPos.x, autopilot.leadingPos.y);
        ctx.stroke();
        ctx.restore();

        // circle at leading position
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        ctx.arc(autopilot.leadingPos.x, autopilot.leadingPos.y, 5 / zoom, 0, PI2f);
        ctx.stroke();
        ctx.restore();
    }
}

// --- Utility ---
function lerp(a, b, t) {
    return a + (b - a) * t;
}

function hexToRgba(hex, alpha) {
    if (hex.charAt(0) === 'r') {
        // Parse existing rgba string and replace alpha
        var match = hex.match(/rgba?\((\d+),(\d+),(\d+),?([\d.]*)\)/);
        if (match) {
            return 'rgba(' + match[1] + ',' + match[2] + ',' + match[3] + ',' + (parseFloat(match[4] || 1) * alpha) + ')';
        }
        return hex;
    }
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}
