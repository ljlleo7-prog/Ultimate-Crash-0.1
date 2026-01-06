import React, { useState } from 'react';

const AirportSearchInput = ({ placeholder, onSelect, selectedAirport, searchResults, handleSearch }) => {
  const [inputValue, setInputValue] = useState('');
  
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    handleSearch(value);
  };
  
  const handleClear = () => {
    setInputValue('');
    onSelect(null);
  };
  
  return React.createElement('div', { className: 'search-input' },
    React.createElement('input', {
      type: 'text',
      placeholder: placeholder,
      value: inputValue,
      onChange: handleInputChange,
      className: 'airport-input'
    }),
    selectedAirport && React.createElement('div', { className: 'selected-airport' },
      React.createElement('strong', null, selectedAirport.iata || selectedAirport.icao),
      ' - ', selectedAirport.name,
      React.createElement('button', { onClick: handleClear, className: 'clear-btn' }, '×')
    ),
    searchResults && searchResults.length > 0 && !selectedAirport && React.createElement('div', { className: 'search-results' },
      searchResults.slice(0, 5).map((airport, index) =>
        React.createElement('div', {
          key: index,
          className: 'result-item',
          onClick: () => {
            onSelect(airport);
            setInputValue('');
          }
        },
          React.createElement('strong', null, airport.iata || airport.icao),
          ' - ', airport.name,
          React.createElement('br'),
          React.createElement('small', null, airport.city, ', ', airport.country)
        )
      )
    )
  );
};

export default AirportSearchInput;