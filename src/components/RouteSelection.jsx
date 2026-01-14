import React, { useState, useEffect } from 'react';
import { generateRandomRouteData, generateWaypoint } from '../services/routeUtils';

const RouteSelection = ({
  difficulty,
  selectedDeparture,
  selectedArrival,
  onSkip,
  onComplete,
  
  selectedDepartureGate,
  setSelectedDepartureGate,
  selectedDepartureTaxiway,
  setSelectedDepartureTaxiway,
  selectedDepartureRunway,
  setSelectedDepartureRunway,
  selectedSID,
  setSelectedSID,
  selectedWaypoints,
  setSelectedWaypoints,
  selectedSTAR,
  setSelectedSTAR,
  selectedArrivalRunway,
  setSelectedArrivalRunway,
  selectedArrivalTaxiway,
  setSelectedArrivalTaxiway,
  selectedArrivalGate,
  setSelectedArrivalGate
}) => {

  const [isVisible, setIsVisible] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [errors, setErrors] = useState({});
  
  // Difficulty-based requirements
  const requirements = {
    showSkipButton: difficulty === 'rookie',
    requireGate: difficulty !== 'rookie',
    requireRunway: difficulty !== 'rookie',
    requireSIDSTAR: difficulty === 'expert' || difficulty === 'professional',
    requireWaypoints: difficulty === 'expert' || difficulty === 'professional'
  };
  
  useEffect(() => {
    // Generate random route data
    if (selectedDeparture && selectedArrival) {
      // Pass the actual airport objects to use real runway data from database
      const data = generateRandomRouteData(
        selectedDeparture.iata,
        selectedArrival.iata,
        difficulty,
        selectedDeparture,
        selectedArrival
      );
      setRouteData(data);
      
      // Set default values
      setSelectedDepartureGate(data.departureGates[0]);
      setSelectedDepartureTaxiway(data.departureTaxiways[0]);
      setSelectedDepartureRunway(data.departureRunways[0]);
      setSelectedSID(data.SIDs[0]);
      setSelectedWaypoints(data.waypoints);
      setSelectedSTAR(data.STARs[0]);
      setSelectedArrivalRunway(data.arrivalRunways[0]);
      setSelectedArrivalTaxiway(data.arrivalTaxiways[0]);
      setSelectedArrivalGate(data.arrivalGates[0]);
    }
    
    // Fade in transition
    setIsVisible(true);
  }, [selectedDeparture, selectedArrival, difficulty]);
  
  const validateForm = () => {
    const newErrors = {};
    
    if (requirements.requireGate && !selectedDepartureGate) {
      newErrors.departureGate = 'Departure gate is required';
    }
    
    if (requirements.requireGate && !selectedArrivalGate) {
      newErrors.arrivalGate = 'Arrival gate is required';
    }
    
    if (requirements.requireRunway && !selectedDepartureRunway) {
      newErrors.departureRunway = 'Departure runway is required';
    }
    
    if (requirements.requireRunway && !selectedArrivalRunway) {
      newErrors.arrivalRunway = 'Arrival runway is required';
    }
    
    if (requirements.requireSIDSTAR && !selectedSID) {
      newErrors.SID = 'SID is required';
    }
    
    if (requirements.requireSIDSTAR && !selectedSTAR) {
      newErrors.STAR = 'STAR is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleComplete = () => {
    if (validateForm()) {
      onComplete();
    }
  };
  
  const handleSkip = () => {
    onSkip();
  };
  
  if (!isVisible || !routeData) {
    return <div className="route-selection-container fade-out">Loading route data...</div>;
  }
  
  return (
    <div className="route-selection-container fade-in">
      <div className="route-selection-header">
        <h2>Route Selection</h2>
        <p className="difficulty-level">Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</p>
      </div>
      
      <div className="route-selection-content">
        {/* Departure Section */}
        <div className="route-section">
          <h3>Departure: {selectedDeparture?.name} ({selectedDeparture?.iata || selectedDeparture?.icao})</h3>
          
          <div className="route-fields">
            <div className="form-group">
              <label>Departure Gate</label>
              <select 
                value={selectedDepartureGate || ''} 
                onChange={(e) => setSelectedDepartureGate(e.target.value)}
                disabled={!requirements.requireGate && !requirements.showSkipButton}
              >
                {routeData.departureGates.map(gate => (
                  <option key={gate} value={gate}>{gate}</option>
                ))}
              </select>
              {errors.departureGate && <span className="error">{errors.departureGate}</span>}
            </div>
            
            <div className="form-group">
              <label>Departure Taxiway</label>
              <select 
                value={selectedDepartureTaxiway || ''} 
                onChange={(e) => setSelectedDepartureTaxiway(e.target.value)}
              >
                {routeData.departureTaxiways.map(taxiway => (
                  <option key={taxiway} value={taxiway}>{taxiway}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Departure Runway</label>
              <select 
                value={selectedDepartureRunway || ''} 
                onChange={(e) => setSelectedDepartureRunway(e.target.value)}
                required={requirements.requireRunway}
              >
                {routeData.departureRunways.map(runway => (
                  <option key={runway} value={runway}>{runway}</option>
                ))}
              </select>
              {errors.departureRunway && <span className="error">{errors.departureRunway}</span>}
            </div>
            
            <div className="form-group">
              <label>Standard Instrument Departure (SID)</label>
              <select 
                value={selectedSID || ''} 
                onChange={(e) => setSelectedSID(e.target.value)}
                disabled={!requirements.requireSIDSTAR}
              >
                {routeData.SIDs.map(sid => (
                  <option key={sid} value={sid}>{sid}</option>
                ))}
              </select>
              {errors.SID && <span className="error">{errors.SID}</span>}
              {!requirements.requireSIDSTAR && <span className="optional">Optional</span>}
            </div>
          </div>
        </div>
        
        {/* Enroute Section */}
        <div className="route-section">
          <h3>Enroute</h3>
          
          <div className="form-group waypoints-group">
            <label>Waypoints</label>
            <div className="waypoints-list">
              {selectedWaypoints.map((waypoint, index) => (
                <div key={index} className="waypoint-item">
                  <span>{waypoint}</span>
                </div>
              ))}
            </div>
            <button 
              onClick={() => {
                const newWaypoint = generateWaypoint();
                setSelectedWaypoints([...selectedWaypoints, newWaypoint]);
              }}
              disabled={!requirements.requireWaypoints}
            >
              Add Waypoint
            </button>
            {!requirements.requireWaypoints && <span className="optional">Optional</span>}
          </div>
        </div>
        
        {/* Arrival Section */}
        <div className="route-section">
          <h3>Arrival: {selectedArrival?.name} ({selectedArrival?.iata || selectedArrival?.icao})</h3>
          
          <div className="route-fields">
            <div className="form-group">
              <label>Standard Terminal Arrival Route (STAR)</label>
              <select 
                value={selectedSTAR || ''} 
                onChange={(e) => setSelectedSTAR(e.target.value)}
                disabled={!requirements.requireSIDSTAR}
              >
                {routeData.STARs.map(star => (
                  <option key={star} value={star}>{star}</option>
                ))}
              </select>
              {errors.STAR && <span className="error">{errors.STAR}</span>}
              {!requirements.requireSIDSTAR && <span className="optional">Optional</span>}
            </div>
            
            <div className="form-group">
              <label>Arrival Runway</label>
              <select 
                value={selectedArrivalRunway || ''} 
                onChange={(e) => setSelectedArrivalRunway(e.target.value)}
                required={requirements.requireRunway}
              >
                {routeData.arrivalRunways.map(runway => (
                  <option key={runway} value={runway}>{runway}</option>
                ))}
              </select>
              {errors.arrivalRunway && <span className="error">{errors.arrivalRunway}</span>}
            </div>
            
            <div className="form-group">
              <label>Arrival Taxiway</label>
              <select 
                value={selectedArrivalTaxiway || ''} 
                onChange={(e) => setSelectedArrivalTaxiway(e.target.value)}
              >
                {routeData.arrivalTaxiways.map(taxiway => (
                  <option key={taxiway} value={taxiway}>{taxiway}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Arrival Gate</label>
              <select 
                value={selectedArrivalGate || ''} 
                onChange={(e) => setSelectedArrivalGate(e.target.value)}
                disabled={!requirements.requireGate && !requirements.showSkipButton}
              >
                {routeData.arrivalGates.map(gate => (
                  <option key={gate} value={gate}>{gate}</option>
                ))}
              </select>
              {errors.arrivalGate && <span className="error">{errors.arrivalGate}</span>}
            </div>
          </div>
        </div>
      </div>
      
      <div className="route-selection-footer">
        {requirements.showSkipButton && (
          <button className="skip-button" onClick={handleSkip}>
            Skip Route Selection
          </button>
        )}
        
        <div className="requirements-info">
          <h4>Requirements for {difficulty} difficulty:</h4>
          <ul>
            <li>{requirements.requireGate ? '✓ Gates required' : '✗ Gates optional'}</li>
            <li>{requirements.requireRunway ? '✓ Runways required' : '✗ Runways optional'}</li>
            <li>{requirements.requireSIDSTAR ? '✓ SID/STAR required' : '✗ SID/STAR optional'}</li>
            <li>{requirements.requireWaypoints ? '✓ Waypoints required' : '✗ Waypoints optional'}</li>
          </ul>
        </div>
        
        <button className="complete-button" onClick={handleComplete}>
          Complete Route Selection
        </button>
      </div>
      
      <style jsx>{`
        .route-selection-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.95);
          color: white;
          padding: 2rem;
          overflow-y: auto;
          z-index: 1000;
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        
        .fade-in {
          opacity: 1;
          transform: translateY(0);
        }
        
        .fade-out {
          opacity: 0;
          transform: translateY(-20px);
        }
        
        .route-selection-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .route-selection-header h2 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          color: #4a9eff;
        }
        
        .difficulty-level {
          font-size: 1.2rem;
          color: #ffd700;
        }
        
        .route-selection-content {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .route-section {
          margin-bottom: 3rem;
          background: rgba(255, 255, 255, 0.05);
          padding: 2rem;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .route-section h3 {
          font-size: 1.8rem;
          margin-bottom: 1.5rem;
          color: #4a9eff;
        }
        
        .route-fields {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
        }
        
        .form-group label {
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
          color: #ccc;
        }
        
        .form-group select {
          padding: 0.8rem;
          font-size: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 5px;
          color: white;
          cursor: pointer;
        }
        
        .form-group select:disabled {
          background: rgba(255, 255, 255, 0.05);
          cursor: not-allowed;
        }
        
        .form-group button {
          padding: 0.8rem;
          font-size: 1rem;
          background: #4a9eff;
          border: none;
          border-radius: 5px;
          color: white;
          cursor: pointer;
          margin-top: 0.5rem;
          transition: background 0.3s ease;
        }
        
        .form-group button:hover:not(:disabled) {
          background: #3a8eff;
        }
        
        .form-group button:disabled {
          background: rgba(74, 158, 255, 0.5);
          cursor: not-allowed;
        }
        
        .error {
          color: #ff4444;
          margin-top: 0.5rem;
          font-size: 0.9rem;
        }
        
        .optional {
          color: #888;
          margin-top: 0.5rem;
          font-size: 0.9rem;
        }
        
        .waypoints-group {
          margin-top: 1rem;
        }
        
        .waypoints-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        
        .waypoint-item {
          background: rgba(74, 158, 255, 0.3);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-family: monospace;
        }
        
        .route-selection-footer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
          margin-top: 3rem;
        }
        
        .skip-button {
          padding: 1rem 2rem;
          font-size: 1.1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 5px;
          color: white;
          cursor: pointer;
          transition: background 0.3s ease;
        }
        
        .skip-button:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        
        .requirements-info {
          background: rgba(255, 255, 255, 0.05);
          padding: 1.5rem;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .requirements-info h4 {
          font-size: 1.2rem;
          margin-bottom: 1rem;
          color: #4a9eff;
        }
        
        .requirements-info ul {
          list-style: none;
          padding: 0;
        }
        
        .requirements-info li {
          margin-bottom: 0.5rem;
          color: #ccc;
        }
        
        .complete-button {
          padding: 1.2rem 3rem;
          font-size: 1.3rem;
          background: #4a9eff;
          border: none;
          border-radius: 5px;
          color: white;
          cursor: pointer;
          transition: background 0.3s ease;
          font-weight: bold;
        }
        
        .complete-button:hover {
          background: #3a8eff;
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
          .route-selection-container {
            padding: 1rem;
          }
          
          .route-section {
            padding: 1.5rem;
          }
          
          .route-fields {
            grid-template-columns: 1fr;
          }
          
          .route-selection-header h2 {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
};

export default RouteSelection;