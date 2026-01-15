
import React from 'react';
import './CinematicComponents.css';

const FadeOverlay = ({ phase, children }) => {
  return React.createElement('div', { className: `fade-overlay ${phase}` }, children);
};

const CinematicReview = ({ callsign, selectedDeparture, selectedArrival, aircraftModel, weatherData, crewCount, failureType, difficulty, pax, payload, routeDetails }) => {
  // Safe access to weather data with fallbacks
  const safeWeatherData = weatherData || {
    windSpeed: 0,
    visibility: 0,
    cloudCover: 0,
    turbulence: 'none'
  };
  
  // Ensure turbulence has a valid string value
  const safeTurbulence = safeWeatherData.turbulence || 'none';
  
  // Safe access to other variables
  const safeCallsign = callsign || 'UNNAMED';
  const safeDepartureIata = selectedDeparture?.iata || 'DEP';
  const safeArrivalIata = selectedArrival?.iata || 'ARR';
  const safeAircraftModel = aircraftModel || 'UNKNOWN';
  const safeCrewCount = crewCount || 2;
  const safeFailureType = failureType || 'none';
  const safeDifficulty = difficulty || 'rookie';
  const safePax = pax || 0;
  const safePayload = payload || 0;

  const currentDate = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toISOString().split('T')[1].substring(0, 5) + 'Z';

  return (
    <div className="cinematic-review">
      <div className="fax-paper">
        <div className="stamp-box">CONFIDENTIAL</div>
        
        <div className="fax-header">
          <div className="fax-title-group">
            <h1 className="fax-title">FLIGHT MANIFEST</h1>
            <div style={{ fontSize: '0.8rem', letterSpacing: '2px' }}>OFFICIAL DISPATCH DOCUMENT // {safeCallsign}</div>
          </div>
          <div className="fax-meta">
            <div>DATE: {currentDate}</div>
            <div>TIME: {currentTime}</div>
            <div>PAGE: 1 OF 1</div>
          </div>
        </div>

        <div className="fax-content">
          
          {/* Section 1: Flight Data */}
          <div className="fax-section">
            <div className="fax-section-title">01. FLIGHT DATA</div>
            <div className="fax-grid">
              <div className="fax-row"><span className="fax-label">OPERATOR</span> <span className="fax-value">ULTIMATE AIR</span></div>
              <div className="fax-row"><span className="fax-label">AIRCRAFT</span> <span className="fax-value">{safeAircraftModel}</span></div>
              <div className="fax-row"><span className="fax-label">ORIGIN</span> <span className="fax-value">{safeDepartureIata}</span></div>
              <div className="fax-row"><span className="fax-label">DESTINATION</span> <span className="fax-value">{safeArrivalIata}</span></div>
              <div className="fax-row"><span className="fax-label">PAX/CREW</span> <span className="fax-value">{safePax}/{safeCrewCount}</span></div>
              <div className="fax-row"><span className="fax-label">PAYLOAD</span> <span className="fax-value">{safePayload} KG</span></div>
            </div>
          </div>

          {/* Section 2: Detailed Route */}
          <div className="fax-section">
            <div className="fax-section-title">02. ROUTE LOGISTICS</div>
            <div className="fax-grid">
              <div className="fax-row"><span className="fax-label">DEPARTURE GATE</span> <span className="fax-value">{routeDetails?.departureGate || 'AUTO'}</span></div>
              <div className="fax-row"><span className="fax-label">ARRIVAL GATE</span> <span className="fax-value">{routeDetails?.arrivalGate || 'AUTO'}</span></div>
              <div className="fax-row"><span className="fax-label">TAXIWAY OUT</span> <span className="fax-value">{routeDetails?.departureTaxiway || 'AUTO'}</span></div>
              <div className="fax-row"><span className="fax-label">TAXIWAY IN</span> <span className="fax-value">{routeDetails?.landingTaxiway || 'AUTO'}</span></div>
              <div className="fax-row"><span className="fax-label">DEPARTURE RWY</span> <span className="fax-value">{routeDetails?.departureRunway || 'DEFAULT'}</span></div>
              <div className="fax-row"><span className="fax-label">LANDING RWY</span> <span className="fax-value">{routeDetails?.landingRunway || 'DEFAULT'}</span></div>
              <div className="fax-row"><span className="fax-label">SID</span> <span className="fax-value">{routeDetails?.sid || 'N/A'}</span></div>
              <div className="fax-row"><span className="fax-label">STAR</span> <span className="fax-value">{routeDetails?.star || 'N/A'}</span></div>
            </div>
            {routeDetails?.waypoints && routeDetails.waypoints.length > 0 && (
              <div className="fax-row" style={{ marginTop: '1rem', borderBottom: 'none' }}>
                <span className="fax-label">WAYPOINTS:</span>
                <span className="fax-value" style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                  {routeDetails.waypoints.join(' > ')}
                </span>
              </div>
            )}
          </div>

          {/* Section 3: METAR */}
          <div className="fax-section">
            <div className="fax-section-title">03. METAR & ENV</div>
            <div className="fax-grid">
              <div className="fax-row"><span className="fax-label">WIND</span> <span className="fax-value">{safeWeatherData.windSpeed} KTS</span></div>
              <div className="fax-row"><span className="fax-label">VISIBILITY</span> <span className="fax-value">{safeWeatherData.visibility} MI</span></div>
              <div className="fax-row"><span className="fax-label">TURBULENCE</span> <span className="fax-value">{safeTurbulence.toUpperCase()}</span></div>
              <div className="fax-row"><span className="fax-label">CLOUD COVER</span> <span className="fax-value">{safeWeatherData.cloudCover}%</span></div>
            </div>
          </div>

          {/* Section 4: Risk Assessment */}
          <div className="fax-section">
            <div className="fax-section-title">04. RISK ASSESSMENT</div>
            <div className="situation-text">
              <p>
                <strong>MISSION PROFILE:</strong> {safeDifficulty.toUpperCase()} LEVEL SIMULATION. 
                FLIGHT {safeCallsign} CLEARED FOR DEPARTURE. 
                EXPECT {safeFailureType === 'random' ? 'VARIABLE SYSTEM BEHAVIOR' : `${safeFailureType.toUpperCase()} SCENARIO`}.
              </p>
              <p>
                <strong>NOTAM:</strong> PILOT DISCRETION ADVISED. MAINTAIN SITUATIONAL AWARENESS AT ALL TIMES.
              </p>
            </div>
          </div>

        </div>

        <div className="countdown-footer">
          // HANDOFF TO COCKPIT IN PROGRESS... //
        </div>
      </div>
    </div>
  );
};

export { FadeOverlay, CinematicReview };
