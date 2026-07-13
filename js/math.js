'use strict';

const PIf = Math.PI;
const PI2f = Math.PI * 2;

function smooth(x) {
    return x * x * x * (x * (x * 6 - 15) + 10);
}

function expSmooth(current, target, dt, speed) {
    if (dt === undefined) dt = 1 / 60;
    if (speed === undefined) speed = 5;
    return current + (target - current) * (1 - Math.exp(-dt * speed));
}

function lexp(start, end, progress) {
    return (progress - start) / (end - start);
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}
