import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const AirportSearchInput = ({
  placeholder,
  onSelect,
  selectedAirport,
  searchResults,
  handleSearch,
  status = 'idle',
  statusMessage = '',
  disabled = false,
  className = '',
  badgeClassName = '',
  inputClassName = ''
}) => {
  const { t } = useLanguage();
  const [inputValue, setInputValue] = useState('');
  const [isResultsVisible, setIsResultsVisible] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (selectedAirport) {
      setInputValue('');
      setIsResultsVisible(false);
    }
  }, [selectedAirport]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    handleSearch(value);
    setIsResultsVisible(true);
  };

  const handleClear = () => {
    setInputValue('');
    onSelect(null);
    handleSearch('');
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

  const showResults = isResultsVisible && searchResults && searchResults.length > 0 && !selectedAirport;
  const showStatus = !selectedAirport && status !== 'idle' && (inputValue.trim().length > 0 || status === 'loading');
  const wrapperClassName = ['search-input', className].filter(Boolean).join(' ');
  const resolvedInputClassName = ['airport-input', 'dispatch-input', inputClassName].filter(Boolean).join(' ');
  const resolvedBadgeClassName = ['selected-airport-badge', badgeClassName].filter(Boolean).join(' ');
  const selectedCode = selectedAirport?.icao || selectedAirport?.iata;
  const selectedSecondaryCode = selectedAirport?.iata && selectedAirport?.iata !== selectedCode ? selectedAirport.iata : null;
  const selectedLocation = [selectedAirport?.city, selectedAirport?.country].filter(Boolean).join(', ');

  const statusLabel = useMemo(() => {
    if (statusMessage) return statusMessage;
    if (status === 'loading') return 'Searching airports…';
    if (status === 'no-results') return 'No matching airport found.';
    if (status === 'invalid') return 'Select an airport from the list.';
    return '';
  }, [status, statusMessage]);

  return (
    <div className={wrapperClassName} ref={wrapperRef}>
      <input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => {
          if (searchResults && searchResults.length > 0 && !selectedAirport) {
            setIsResultsVisible(true);
          }
        }}
        className={resolvedInputClassName}
        autoComplete="off"
        disabled={disabled}
      />

      {selectedAirport && (
        <div className={resolvedBadgeClassName}>
          <div className="selected-airport-copy">
            <div className="selected-airport-primary">
              <span className="airport-code">{selectedCode}</span>
              {selectedSecondaryCode && <span className="airport-subcode">/{selectedSecondaryCode}</span>}
              <span className="airport-name">{selectedAirport.name}</span>
            </div>
            {selectedLocation && <div className="selected-airport-secondary">{selectedLocation}</div>}
          </div>
          <button onClick={handleClear} className="clear-btn" title={t('initialization.route.clear_selection')}>×</button>
        </div>
      )}

      {showResults && (
        <div className="search-results">
          <div className="results-count">
            {t('initialization.route.results_count', { count: searchResults.length })}
          </div>
          {searchResults.map((airport, index) => (
            <div
              key={`${airport.icao || airport.iata}-${index}`}
              className="result-item"
              onClick={() => handleSelect(airport)}
            >
              <div className="result-main">
                <span className="airport-code">{airport.icao || airport.iata}</span>
                {airport.iata && airport.icao && airport.iata !== airport.icao && (
                  <span className="airport-subcode">/{airport.iata}</span>
                )}
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

      {showStatus && statusLabel && (
        <div className={`airport-search-status ${status}`} role="status">
          {statusLabel}
        </div>
      )}
    </div>
  );
};

export default AirportSearchInput;
