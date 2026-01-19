import React, { useState, useEffect } from 'react';
import { airportService } from '../services/airportService';
import './FlightComputerPanel.css';

const FlightComputerPanel = ({ onClose, flightPlan, onUpdateFlightPlan, flightState }) => {
  const [activeTab, setActiveTab] = useState('waypoints'); // 'waypoints', 'add', 'nearest'
  const [waypoints, setWaypoints] = useState([]);
  
  // Manual Input State
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [manualLabel, setManualLabel] = useState('');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchType, setSearchType] = useState('all'); // 'all', 'normal', 'emergency'
  
  // Nearest State
  const [nearestAirports, setNearestAirports] = useState([]);
  const [loadingNearest, setLoadingNearest] = useState(false);

  // Initialize local state from props
  useEffect(() => {
    if (flightPlan) {
      // Handle both array and object formats
      if (Array.isArray(flightPlan)) {
        setWaypoints(flightPlan);
      } else if (flightPlan.waypoints && Array.isArray(flightPlan.waypoints)) {
        setWaypoints(flightPlan.waypoints);
      }
    }
  }, [flightPlan]);

  // Sync changes to parent
  const updateParent = (newWaypoints) => {
    setWaypoints(newWaypoints);
    if (onUpdateFlightPlan) {
      // Send as object to be explicit, or array?
      // Physics service now handles both. Let's send array to match initial state structure in FlightInProgress.
      // Wait, FlightInProgress expects whatever setWaypoints accepts.
      // If we send array, it's fine.
      onUpdateFlightPlan(newWaypoints);
    }
  };

  const handleDeleteWaypoint = (index) => {
    const newWaypoints = [...waypoints];
    newWaypoints.splice(index, 1);
    updateParent(newWaypoints);
  };

  const handleAddManual = () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    
    if (isNaN(lat) || isNaN(lon)) {
      alert('Please enter valid coordinates');
      return;
    }
    
    const newWaypoint = {
      latitude: lat,
      longitude: lon,
      label: manualLabel || `WPT${waypoints.length + 1}`,
      type: 'user'
    };
    
    const newWaypoints = [...waypoints, newWaypoint];
    updateParent(newWaypoints);
    
    // Reset inputs
    setManualLat('');
    setManualLon('');
    setManualLabel('');
    setActiveTab('waypoints');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.length < 2) return;
    
    const results = airportService.searchAirports(searchQuery, { 
      type: searchType === 'all' ? 'all' : searchType,
      includeEmergency: searchType === 'emergency' || searchType === 'all'
    });
    setSearchResults(results);
  };

  const handleAddAirport = (airport) => {
    const newWaypoint = {
      latitude: airport.latitude,
      longitude: airport.longitude,
      label: airport.iata || airport.icao,
      type: 'airport',
      details: airport
    };
    
    const newWaypoints = [...waypoints, newWaypoint];
    updateParent(newWaypoints);
    setActiveTab('waypoints');
  };

  const findNearestAirports = () => {
    if (!flightState || !flightState.latitude || !flightState.longitude) return;
    
    setLoadingNearest(true);
    // Find within 100nm first, if none, expand
    let results = airportService.getAirportsWithinRadius(flightState.latitude, flightState.longitude, 100);
    
    // Sort by distance
    results.sort((a, b) => {
      const distA = airportService.calculateDistance({ latitude: flightState.latitude, longitude: flightState.longitude }, a);
      const distB = airportService.calculateDistance({ latitude: flightState.latitude, longitude: flightState.longitude }, b);
      return distA - distB;
    });
    
    setNearestAirports(results.slice(0, 10)); // Top 10
    setLoadingNearest(false);
  };

  useEffect(() => {
    if (activeTab === 'nearest') {
      findNearestAirports();
    }
  }, [activeTab]);

  return (
    <div className="flight-computer-panel">
      <div className="fc-header">
        <h3>Flight Computer</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="fc-tabs">
        <button className={activeTab === 'waypoints' ? 'active' : ''} onClick={() => setActiveTab('waypoints')}>Plan</button>
        <button className={activeTab === 'add' ? 'active' : ''} onClick={() => setActiveTab('add')}>Add</button>
        <button className={activeTab === 'nearest' ? 'active' : ''} onClick={() => setActiveTab('nearest')}>Nearest</button>
      </div>
      
      <div className="fc-content">
        {activeTab === 'waypoints' && (
          <div className="waypoints-list">
            {waypoints.length === 0 ? (
              <div className="empty-state">No waypoints in flight plan.</div>
            ) : (
              <ul>
                {waypoints.map((wp, index) => (
                  <li key={index} className="waypoint-item">
                    <span className="wp-index">{index + 1}</span>
                    <div className="wp-info">
                      <span className="wp-label">{wp.label}</span>
                      <span className="wp-coords">{wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}</span>
                    </div>
                    <button className="delete-btn" onClick={() => handleDeleteWaypoint(index)}>🗑️</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        
        {activeTab === 'add' && (
          <div className="add-waypoint-section">
            <div className="manual-input">
              <h4>Manual Entry</h4>
              <div className="input-group">
                <input 
                  type="text" 
                  placeholder="Lat (e.g. 37.61)" 
                  value={manualLat} 
                  onChange={(e) => setManualLat(e.target.value)} 
                />
                <input 
                  type="text" 
                  placeholder="Lon (e.g. -122.37)" 
                  value={manualLon} 
                  onChange={(e) => setManualLon(e.target.value)} 
                />
              </div>
              <input 
                type="text" 
                placeholder="Label (Optional)" 
                value={manualLabel} 
                onChange={(e) => setManualLabel(e.target.value)} 
                className="label-input"
              />
              <button className="action-btn" onClick={handleAddManual}>Add Coordinates</button>
            </div>
            
            <div className="divider">OR</div>
            
            <div className="search-input">
              <h4>Airport Search</h4>
              <form onSubmit={handleSearch}>
                <input 
                  type="text" 
                  placeholder="Search ICAO/IATA/Name..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
                <div className="search-options">
                   <label>
                     <input 
                       type="radio" 
                       checked={searchType === 'all'} 
                       onChange={() => setSearchType('all')} 
                     /> All
                   </label>
                   <label>
                     <input 
                       type="radio" 
                       checked={searchType === 'normal'} 
                       onChange={() => setSearchType('normal')} 
                     /> Normal
                   </label>
                   <label>
                     <input 
                       type="radio" 
                       checked={searchType === 'emergency'} 
                       onChange={() => setSearchType('emergency')} 
                     /> Emergency
                   </label>
                </div>
                <button type="submit" className="action-btn secondary">Search</button>
              </form>
              
              <div className="search-results">
                {searchResults.map(airport => (
                  <div key={airport.icao} className="search-result-item">
                    <div className="airport-info">
                      <span className="airport-code">{airport.iata}/{airport.icao}</span>
                      <span className="airport-name">{airport.name}</span>
                    </div>
                    <button className="add-btn" onClick={() => handleAddAirport(airport)}>+</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'nearest' && (
          <div className="nearest-section">
            {loadingNearest ? (
              <div>Finding airports...</div>
            ) : nearestAirports.length === 0 ? (
              <div>No airports found within 100nm.</div>
            ) : (
              <ul className="nearest-list">
                {nearestAirports.map(airport => {
                   const dist = airportService.calculateDistance(
                     { latitude: flightState.latitude, longitude: flightState.longitude },
                     { latitude: airport.latitude, longitude: airport.longitude }
                   );
                   return (
                    <li key={airport.icao} className="nearest-item">
                      <div className="airport-details">
                        <span className="code">{airport.iata || airport.icao}</span>
                        <span className="name">{airport.name}</span>
                        <span className="dist">{dist} nm</span>
                        {airport.type === 'emergency' && <span className="tag emergency">EMERGENCY</span>}
                      </div>
                      <button className="direct-btn" onClick={() => handleAddAirport(airport)}>Add</button>
                    </li>
                   );
                })}
              </ul>
            )}
            <button className="refresh-btn" onClick={findNearestAirports}>Refresh</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlightComputerPanel;
