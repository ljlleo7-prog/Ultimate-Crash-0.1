import { Vector3 } from '../../utils/physics/MathUtils.js';

class EnvironmentService {
    constructor() {
        this.CONSTANTS = {
            G: 9.80665,
            R_GAS: 287.05,
            GAMMA: 1.4,
            SEA_LEVEL_PRESSURE: 101325,
            SEA_LEVEL_DENSITY: 1.225,
            SEA_LEVEL_TEMP: 288.15,
            TEMP_LAPSE_RATE: -0.0065
        };
        
        this.environment = {
            wind: new Vector3(0, 0, 0),
            turbulence: 0,
            precipitation: 0
        };
    }

    calculateEnvironment(z_down) {
        // Altitude = -z_down
        const h = -z_down; 
        
        // Simple ISA model
        let temp = this.CONSTANTS.SEA_LEVEL_TEMP + (this.CONSTANTS.TEMP_LAPSE_RATE * h);
        if (temp < 216.65) temp = 216.65; // Tropopause floor

        const pressure = this.CONSTANTS.SEA_LEVEL_PRESSURE * Math.pow(temp / this.CONSTANTS.SEA_LEVEL_TEMP, -this.CONSTANTS.G / (this.CONSTANTS.TEMP_LAPSE_RATE * this.CONSTANTS.R_GAS));
        const density = pressure / (this.CONSTANTS.R_GAS * temp);
        const speedOfSound = Math.sqrt(this.CONSTANTS.GAMMA * this.CONSTANTS.R_GAS * temp);

        return { 
            density, 
            pressure, 
            temp, 
            speedOfSound, 
            wind: this.environment.wind, 
            turbulence: this.environment.turbulence,
            precipitation: this.environment.precipitation
        };
    }

    setEnvironment(envData) {
        if (!envData) return;
        
        const speedMs = (envData.windSpeed || 0) * 0.514444; // knots -> m/s
        const dirRad = (envData.windDirection || 0) * Math.PI / 180;
        
        const windX = -speedMs * Math.cos(dirRad);
        const windY = -speedMs * Math.sin(dirRad);
        
        this.environment = {
            wind: new Vector3(windX, windY, 0),
            turbulence: envData.turbulence || 0,
            precipitation: envData.precipitation || 0
        };
    }
}

export default new EnvironmentService();
