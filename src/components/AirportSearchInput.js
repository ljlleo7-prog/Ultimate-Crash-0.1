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

  return React.createElement('div', { className: 'search-input', ref: wrapperRef },
    React.createElement('input', {
      type: 'text',
      placeholder: placeholder,
      value: inputValue,
      onChange: handleInputChange,
      onFocus: () => searchResults && searchResults.length > 0 && setIsResultsVisible(true),
      className: 'airport-input',
      autoComplete: 'off'
    }),
    selectedAirport && React.createElement('div', { className: 'selected-airport' },
      React.createElement('span', { className: 'airport-code' }, selectedAirport.iata || selectedAirport.icao),
      React.createElement('span', { className: 'airport-name' }, ' - ', selectedAirport.name),
      React.createElement('button', {
        onClick: handleClear,
        className: 'clear-btn',
        title: 'Clear selection'
      }, '×')
    ),
    isResultsVisible && searchResults && searchResults.length > 0 && !selectedAirport && React.createElement('div', { className: 'search-results' },
      React.createElement('div', { className: 'results-count' },
        `${searchResults.length} airport${searchResults.length !== 1 ? 's' : ''} found`
      ),
      searchResults.map((airport, index) =>
        React.createElement('div', {
          key: `${airport.iata}-${index}`,
          className: 'result-item',
          onClick: () => handleSelect(airport)
        },
          React.createElement('div', { className: 'result-main' },
            React.createElement('span', { className: 'airport-code' }, airport.iata || airport.icao),
            React.createElement('span', { className: 'airport-name' }, airport.name)
          ),
          React.createElement('div', { className: 'result-secondary' },
            (airport.city || airport.country) && React.createElement('span', null,
              [airport.city, airport.country].filter(Boolean).join(', ')
            ),
            React.createElement('span', { className: `airport-type type-${airport.type}` }, airport.type)
          )
        )
      )
    )
  );
};

export default AirportSearchInput;
