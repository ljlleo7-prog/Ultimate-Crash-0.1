/**
 * FMC Service - Flight Management Computer State Manager
 * Manages flight plan, performance data, and predictions
 */

class FMCService {
  constructor() {
    this.data = {
      // Flight Info
      flightNumber: '',
      costIndex: 50,

      // Route
      origin: null,
      destination: null,
      alternate: null,
      cruiseAlt: 35000,
      cruiseSpeed: 450, // KTAS

      // Performance
      takeoff: {
        vr: 0,
        v2: 0,
        flaps: 5,
        thrust: 'TO'
      },
      landing: {
        vref: 0,
        flaps: 30,
        autobrake: 'MED'
      },

      // Weight & Balance
      zfw: 0, // Zero Fuel Weight
      payload: 0,
      fuel: 0,
      cgPercent: 25,

      // Progress
      tod: null, // Top of Descent
      toc: null  // Top of Climb
    };
  }

  setFlightInfo(flightNumber, costIndex) {
    this.data.flightNumber = flightNumber;
    this.data.costIndex = costIndex;
  }

  setRoute(origin, destination, alternate = null) {
    this.data.origin = origin;
    this.data.destination = destination;
    this.data.alternate = alternate;
  }

  setCruise(altitude, speed) {
    this.data.cruiseAlt = altitude;
    this.data.cruiseSpeed = speed;
  }

  setWeights(zfw, payload, fuel) {
    this.data.zfw = zfw;
    this.data.payload = payload;
    this.data.fuel = fuel;
  }

  calculateTOD(currentAlt, targetAlt, groundSpeed) {
    const altDiff = currentAlt - targetAlt;
    if (altDiff <= 0) return null;

    const descentRate = 2500; // ft/min typical
    const descentAngle = 3; // degrees
    const distanceNm = (altDiff / (Math.tan(descentAngle * Math.PI / 180) * 6076.12));

    return {
      distance: distanceNm,
      time: (distanceNm / groundSpeed) * 60 // minutes
    };
  }

  getData() {
    return this.data;
  }
}

export default FMCService;
