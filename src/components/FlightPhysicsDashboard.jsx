import React from 'react';
import { motion } from 'framer-motion';

/**
 * Flight Physics Dashboard Component
 * Real-time display of aircraft physics data and flight instruments
 */
const FlightPhysicsDashboard = ({ 
  flightData, 
  physicsState, 
  debugData, 
  isInitialized,
  aircraftConfig 
}) => {
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Initializing Physics Engine...</p>
        </div>
      </div>
    );
  }

  // ✅ Convert units and format display values
  const formatAltitude = (alt) => `${Math.round(alt).toLocaleString()} ft`;
  const formatAirspeed = (spd) => `${Math.round(spd)} KTS`;
  const formatVerticalSpeed = (vs) => `${Math.round(vs)} fpm`;
  const formatAngle = (angle) => `${angle >= 0 ? '+' : ''}${angle.toFixed(1)}°`;
  const formatForce = (force) => `${(force / 1000).toFixed(1)} kN`;
  const formatPercentage = (val) => `${Math.round(val)}%`;
  const formatThrottle = (throttle) => `${Math.round(throttle)}%`;

  // ✅ Color coding for different parameters
  const getVerticalSpeedColor = (vs) => {
    const abs = Math.abs(vs);
    if (abs < 500) return 'text-green-400';
    if (abs < 1500) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getAltitudeColor = (alt) => {
    if (alt > 1000) return 'text-green-400';
    return 'text-red-400';
  };

  const getAirspeedColor = (spd) => {
    if (spd > 200 && spd < 500) return 'text-green-400';
    return 'text-yellow-400';
  };

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg space-y-6">
      {/* Header */}
      <div className="border-b border-gray-700 pb-4">
        <h2 className="text-2xl font-bold text-blue-400 mb-2">🛩️ Flight Physics Dashboard</h2>
        <div className="flex items-center space-x-4 text-sm">
          <span className="bg-green-600 px-2 py-1 rounded text-xs font-medium">
            LIVE PHYSICS
          </span>
          <span className="text-gray-400">
            Aircraft: {aircraftConfig?.model || 'Unknown'}
          </span>
          <span className="text-gray-400">
            Mass: {aircraftConfig?.mass ? Math.round(aircraftConfig.mass).toLocaleString() + ' kg' : 'N/A'}
          </span>
        </div>
      </div>

      {/* Primary Flight Instruments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Altitude Display */}
        <motion.div 
          className="bg-gray-800 p-4 rounded-lg border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">ALTITUDE</div>
            <div className={`text-3xl font-bold ${getAltitudeColor(flightData.altitude)}`}>
              {formatAltitude(flightData.altitude)}
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>FL{Math.round(flightData.altitude / 100)}</span>
              <span>{(-flightData.cg.z * 3.28084).toFixed(0)} m</span>
            </div>
          </div>
        </motion.div>

        {/* Airspeed Display */}
        <motion.div 
          className="bg-gray-800 p-4 rounded-lg border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">AIRSPEED</div>
            <div className={`text-3xl font-bold ${getAirspeedColor(flightData.indicatedAirspeed)}`}>
              {formatAirspeed(flightData.indicatedAirspeed)}
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>{Math.round(flightData.indicatedAirspeed * 0.514444)} m/s</span>
              <span>IAS</span>
            </div>
          </div>
        </motion.div>

        {/* Vertical Speed Display */}
        <motion.div 
          className="bg-gray-800 p-4 rounded-lg border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">VERTICAL SPEED</div>
            <div className={`text-3xl font-bold ${getVerticalSpeedColor(flightData.verticalSpeed)}`}>
              {formatVerticalSpeed(flightData.verticalSpeed)}
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>{flightData.verticalSpeed > 0 ? 'CLIMB' : 'DESCEND'}</span>
              <span>{Math.round(flightData.verticalSpeed * 0.00508)} m/s</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Flight Dynamics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Pitch */}
        <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">PITCH</div>
          <div className="text-lg font-bold text-blue-300">
            {formatAngle(flightData.pitch)}
          </div>
        </div>

        {/* Roll */}
        <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">ROLL</div>
          <div className="text-lg font-bold text-yellow-300">
            {formatAngle(flightData.roll)}
          </div>
        </div>

        {/* Heading */}
        <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">HEADING</div>
          <div className="text-lg font-bold text-green-300">
            {Math.round(flightData.heading).toString().padStart(3, '0')}°
          </div>
        </div>

        {/* Throttle */}
        <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">THROTTLE</div>
          <div className="text-lg font-bold text-red-300">
            {formatThrottle(flightData.throttle)}
          </div>
        </div>
      </div>

      {/* Aircraft Forces */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h3 className="text-lg font-bold text-gray-300 mb-4">✈️ Aircraft Forces</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Lift */}
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">LIFT</div>
            <div className="text-lg font-bold text-green-400">
              {formatForce(flightData.lift)}
            </div>
          </div>

          {/* Drag */}
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">DRAG</div>
            <div className="text-lg font-bold text-red-400">
              {formatForce(flightData.drag)}
            </div>
          </div>

          {/* Thrust */}
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">THRUST</div>
            <div className="text-lg font-bold text-orange-400">
              {formatForce(flightData.thrust)}
            </div>
          </div>

          {/* Weight */}
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">WEIGHT</div>
            <div className="text-lg font-bold text-gray-400">
              {formatForce(flightData.weight)}
            </div>
          </div>
        </div>

        {/* Force Balance Indicator */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-2">FORCE BALANCE</div>
          <div className="flex items-center space-x-4">
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, (flightData.lift / flightData.weight) * 100)}%` 
                }}
              ></div>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">Lift/Weight:</span>
              <span className={`ml-1 font-bold ${
                Math.abs(flightData.lift - flightData.weight) < 50000 ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {(flightData.lift / flightData.weight).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Inputs */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h3 className="text-lg font-bold text-gray-300 mb-4">🎮 Control Inputs</h3>
        <div className="grid grid-cols-3 gap-4">
          {/* Elevator */}
          <div>
            <div className="text-xs text-gray-400 mb-1">ELEVATOR</div>
            <div className="text-sm font-bold text-blue-400">
              {formatAngle(flightData.elevator)}
            </div>
          </div>

          {/* Aileron */}
          <div>
            <div className="text-xs text-gray-400 mb-1">AILERON</div>
            <div className="text-sm font-bold text-yellow-400">
              {formatAngle(flightData.aileron)}
            </div>
          </div>

          {/* Rudder */}
          <div>
            <div className="text-xs text-gray-400 mb-1">RUDDER</div>
            <div className="text-sm font-bold text-green-400">
              {formatAngle(flightData.rudder)}
            </div>
          </div>
        </div>
      </div>

      {/* Physics Debug Data */}
      {debugData && Object.keys(debugData).length > 0 && (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-lg font-bold text-gray-300 mb-4">🔬 Physics Debug Data</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {debugData.density && (
              <div>
                <div className="text-gray-400">Density</div>
                <div className="font-mono text-blue-300">
                  {debugData.density.toFixed(3)} kg/m³
                </div>
              </div>
            )}
            
            {debugData.dynamicPressure && (
              <div>
                <div className="text-gray-400">Dynamic Pressure</div>
                <div className="font-mono text-green-300">
                  {Math.round(debugData.dynamicPressure).toLocaleString()} Pa
                </div>
              </div>
            )}
            
            {debugData.cl && (
              <div>
                <div className="text-gray-400">Coefficient of Lift</div>
                <div className="font-mono text-yellow-300">
                  {debugData.cl.toFixed(3)}
                </div>
              </div>
            )}
            
            {debugData.cd && (
              <div>
                <div className="text-gray-400">Coefficient of Drag</div>
                <div className="font-mono text-red-300">
                  {debugData.cd.toFixed(3)}
                </div>
              </div>
            )}
            
            {debugData.angleOfAttack && (
              <div>
                <div className="text-gray-400">Angle of Attack</div>
                <div className="font-mono text-purple-300">
                  {debugData.angleOfAttack.toFixed(1)}°
                </div>
              </div>
            )}
            
            {debugData.flightPathAngle && (
              <div>
                <div className="text-gray-400">Flight Path Angle</div>
                <div className="font-mono text-cyan-300">
                  {debugData.flightPathAngle.toFixed(1)}°
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightPhysicsDashboard;