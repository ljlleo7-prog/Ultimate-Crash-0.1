import React, { useState, useRef, useEffect } from 'react';

const AirportSearchInput = ({ placeholder, onSelect, selectedAirport, searchResults, handleSearch }) => {
  const [inputValue, setInputValue] = useState('');
  const [isResultsVisible, setIsResultsVisible] = useState(false);
  const wrapperRef = useRef(null);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    handleSearch(value);
    setIsResultsVisible(true);
  };

  const handleClear = () => {
    setInputValue('');
    onSelect(null);
    setIsResultsVisible(false);
  };

  const handleSelect = (airport) => {
    onSelect(airport);
    setInputValue('');
    setIsResultsVisible(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsResultsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="search-input" ref={wrapperRef}>
      <input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => searchResults && searchResults.length > 0 && setIsResultsVisible(true)}
        className="airport-input dispatch-input"
        autoComplete="off"
      />
      
      {selectedAirport && (
        <div className="selected-airport-badge">
          <span className="airport-code">{selectedAirport.iata || selectedAirport.icao}</span>
          <span className="airport-name"> - {selectedAirport.name}</span>
          <button onClick={handleClear} className="clear-btn" title="Clear selection">×</button>
        </div>
      )}

      {isResultsVisible && searchResults && searchResults.length > 0 && !selectedAirport && (
        <div className="search-results">
          <div className="results-count">
            {searchResults.length} airport{searchResults.length !== 1 ? 's' : ''} found
          </div>
          {searchResults.map((airport, index) => (
            <div
              key={`${airport.iata}-${index}`}
              className="result-item"
              onClick={() => handleSelect(airport)}
            >
              <div className="result-main">
                <span className="airport-code">{airport.iata || airport.icao}</span>
                <span className="airport-name">{airport.name}</span>
              </div>
              <div className="result-secondary">
                {(airport.city || airport.country) && (
                  <span>{[airport.city, airport.country].filter(Boolean).join(', ')}</span>
                )}
                <span className={`airport-type type-${airport.type}`}>{airport.type}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AirportSearchInput;
