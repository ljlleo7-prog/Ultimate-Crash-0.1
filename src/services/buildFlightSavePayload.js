export function buildFlightSavePayload({
  flightData,
  physicsState,
  physicsService,
  flightPlan,
  weatherData,
  aircraftModel
}) {
  const serializablePhysicsState = typeof physicsService?.getSerializableState === 'function'
    ? physicsService.getSerializableState()
    : physicsState;

  return {
    version: '1.0',
    timestamp: Date.now(),
    flightData,
    physicsState: serializablePhysicsState,
    runwayGeometry: flightData?.runwayGeometry || physicsService?.runwayGeometry || null,
    flightPlan,
    weatherData,
    aircraftModel
  };
}

export default buildFlightSavePayload;
