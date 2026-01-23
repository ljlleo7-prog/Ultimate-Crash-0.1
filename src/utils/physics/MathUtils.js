/**
 * Math Utilities for Physics Engine
 * Vector3 and Quaternion implementations
 */

export class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x; this.y = y; this.z = z;
    }

    add(v) { return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z); }
    sub(v) { return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z); }
    scale(s) { return new Vector3(this.x * s, this.y * s, this.z * s); }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    cross(v) {
        return new Vector3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }
    magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
    normalize() {
        const m = this.magnitude();
        return m > 0 ? this.scale(1 / m) : new Vector3();
    }
    clone() { return new Vector3(this.x, this.y, this.z); }
}

export class Quaternion {
    constructor(w = 1, x = 0, y = 0, z = 0) {
        this.w = w; this.x = x; this.y = y; this.z = z;
    }

    normalize() {
        const m = Math.sqrt(this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z);
        if (m > 0) {
            this.w /= m; this.x /= m; this.y /= m; this.z /= m;
        }
        return this;
    }

    // Rotate vector v by this quaternion
    rotate(v) {
        // v' = q * v * q_conjugate
        const qvec = new Vector3(this.x, this.y, this.z);
        const uv = qvec.cross(v);
        const uuv = qvec.cross(uv);
        
        return v.add(uv.scale(2 * this.w)).add(uuv.scale(2));
    }

    // Get Euler Angles (Roll, Pitch, Yaw) in Radians from Quaternion
    // Assumes standard aerospace sequence (Yaw -> Pitch -> Roll)
    toEuler() {
        // Roll (phi)
        const sinr_cosp = 2 * (this.w * this.x + this.y * this.z);
        const cosr_cosp = 1 - 2 * (this.x * this.x + this.y * this.y);
        const phi = Math.atan2(sinr_cosp, cosr_cosp);

        // Pitch (theta)
        const sinp = 2 * (this.w * this.y - this.z * this.x);
        let theta;
        if (Math.abs(sinp) >= 1)
            theta = Math.sign(sinp) * Math.PI / 2; // use 90 degrees if out of range
        else
            theta = Math.asin(sinp);

        // Yaw (psi)
        const siny_cosp = 2 * (this.w * this.z + this.x * this.y);
        const cosy_cosp = 1 - 2 * (this.y * this.y + this.z * this.z);
        const psi = Math.atan2(siny_cosp, cosy_cosp);

        return { phi, theta, psi };
    }

    static fromEuler(phi, theta, psi) {
        const cy = Math.cos(psi * 0.5);
        const sy = Math.sin(psi * 0.5);
        const cp = Math.cos(theta * 0.5);
        const sp = Math.sin(theta * 0.5);
        const cr = Math.cos(phi * 0.5);
        const sr = Math.sin(phi * 0.5);

        return new Quaternion(
            cr * cp * cy + sr * sp * sy,
            sr * cp * cy - cr * sp * sy,
            cr * sp * cy + sr * cp * sy,
            cr * cp * sy - sr * sp * cy
        );
    }
}

export class PIDController {
    constructor(kp, ki, kd, min, max) {
        this.kp = kp;
        this.ki = ki;
        this.kd = kd;
        this.min = min;
        this.max = max;
        
        this.integral = 0;
        this.prevError = 0;
    }

    reset() {
        this.integral = 0;
        this.prevError = 0;
    }

    update(setpoint, measured, dt) {
        if (dt <= 0) return 0;

        const error = setpoint - measured;
        
        // Integral with anti-windup
        this.integral += error * dt;
        
        const integralTerm = this.ki * this.integral;
        if (integralTerm > this.max) this.integral = this.max / this.ki;
        else if (integralTerm < this.min) this.integral = this.min / this.ki;

        const derivative = (error - this.prevError) / dt;
        this.prevError = error;

        let output = (this.kp * error) + (this.ki * this.integral) + (this.kd * derivative);
        
        // Clamp output
        if (output > this.max) output = this.max;
        if (output < this.min) output = this.min;

        return output;
    }
}

export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
export const lerp = (start, end, t) => start * (1 - t) + end * t;
