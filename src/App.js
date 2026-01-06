import React, { useState, useEffect } from 'react'
import { useAirportSearch } from './hooks/useAirportSearch'
import { calculateTotalFuel } from './utils/distanceCalculator'

function App() {
  const [flightPlan, setFlightPlan] = useState({
    airline: '',
    callsign: '',
    aircraftModel: '',
    pax: 0,
    payload: 0,
    fuelReserve: 45, // Default 45 minutes reserve
    departure: '',
    arrival: '',
    startTime: 'random',
    startTimeSpecific: '',
    season: 'random',
    seasonSpecific: '',
    cruiseHeight: 35000,
    difficulty: 'rookie'
  })

  const [showDistanceInfo, setShowDistanceInfo] = useState(false)
  
  // Airport search functionality
  const {
    searchResults,
    isSearching,
    selectedAirports,
    distanceInfo,
    searchAirports,
    selectAirport,
    clearSelection,
    getSuggestions
  } = useAirportSearch()

  // Update flight plan when airports are selected
  useEffect(() => {
    if (selectedAirports.departure) {
      setFlightPlan(prev => ({
        ...prev,
        departure: selectedAirports.departure.iata || selectedAirports.departure.icao
      }))
    }
    if (selectedAirports.arrival) {
      setFlightPlan(prev => ({
        ...prev,
        arrival: selectedAirports.arrival.iata || selectedAirports.arrival.icao
      }))
    }
  }, [selectedAirports])

  const handleInputChange = (field, value) => {
    setFlightPlan(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAirportSearch = (query, type) => {
    if (query.length >= 2) {
      searchAirports(query)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Flight Plan Submitted:', {
      ...flightPlan,
      distanceInfo,
      selectedAirports
    })
    // Here you would handle the flight plan submission
  }

  const difficulties = [
    { value: 'rookie', label: 'Rookie', description: 'Easy flight with perfect conditions' },
    { value: 'amateur', label: 'Amateur', description: 'Standard flight with minor challenges' },
    { value: 'intermediate', label: 'Intermediate', description: 'Moderate challenges with system failures' },
    { value: 'advanced', label: 'Advanced', description: 'Complex scenarios with multiple failures' },
    { value: 'pro', label: 'Pro', description: 'Extreme conditions and critical failures' },
    { value: 'devil', label: 'Devil', description: 'Maximum difficulty - survival unlikely' }
  ]

  // Calculate fuel requirements
  const fuelInfo = distanceInfo ? calculateTotalFuel(
    distanceInfo.distance,
    flightPlan.fuelReserve,
    'medium_jet'
  ) : null

  // Airport search input component
  const AirportSearchInput = ({ type, label, value, onSearch, onSelect, selectedAirport, onClear }) => {
    const [inputValue, setInputValue] = useState('')
    const [showSuggestions, setShowSuggestions] = useState(false)

    const handleInputChange = (e) => {
      const value = e.target.value
      setInputValue(value)
      onSearch(value, type)
      setShowSuggestions(true)
    }

    const handleSelect = (airport) => {
      onSelect(airport, type)
      setInputValue(airport.iata || airport.icao)
      setShowSuggestions(false)
    }

    const handleClear = () => {
      onClear(type)
      setInputValue('')
      setShowSuggestions(false)
    }

    return React.createElement('div', { className: 'space-y-2 relative' },
      React.createElement('label', { 
        className: 'text-gray-300 font-medium'
      }, label),
      
      React.createElement('div', { className: 'relative' },
        React.createElement('input', {
          type: 'text',
          value: selectedAirport ? (selectedAirport.iata || selectedAirport.icao) : inputValue,
          onChange: handleInputChange,
          onFocus: () => setShowSuggestions(true),
          className: 'w-full p-3 bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg text-white pr-10',
          placeholder: 'e.g., JFK, KJFK, or airport name'
        }),
        
        selectedAirport && React.createElement('button', {
          type: 'button',
          onClick: handleClear,
          className: 'absolute right-3 top-3 text-gray-400 hover:text-white'
        }, '✕')
      ),
      
      showSuggestions && (searchResults.length > 0 || isSearching) && React.createElement('div', {
        className: 'absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto'
      },
        isSearching && React.createElement('div', { 
          className: 'p-3 text-gray-400 text-center'
        }, 'Searching airports...'),
        
        !isSearching && searchResults.map(airport => 
          React.createElement('button', {
            key: airport.iata || airport.icao,
            type: 'button',
            onClick: () => handleSelect(airport),
            className: 'w-full p-3 text-left hover:bg-gray-800 border-b border-gray-700 last:border-b-0'
          },
            React.createElement('div', { className: 'font-medium text-white' },
              airport.iata && React.createElement('span', { className: 'text-yellow-400 mr-2' }, airport.iata),
              airport.icao && React.createElement('span', { className: 'text-blue-400 mr-2' }, airport.icao)
            ),
            React.createElement('div', { className: 'text-sm text-gray-300' }, airport.name),
            React.createElement('div', { className: 'text-xs text-gray-400' }, `${airport.city}, ${airport.country}`)
          )
        )
      )
    )
  }

  return React.createElement('div', { 
    className: 'min-h-screen sky-background flex flex-col items-center justify-center p-8'
  },
    // Main Title Section
    React.createElement('div', { 
      className: 'text-center mb-8'
    },
      React.createElement('div', { 
        className: 'aviation-title mb-4'
      }, 'ULTIMATE CRASH'),
      React.createElement('div', { 
        className: 'text-xl text-gray-200 font-light tracking-wider'
      }, 'Professional Flight Planning System')
    ),

    // Initialization Selector Panel
    React.createElement('form', {
      onSubmit: handleSubmit,
      className: 'panel-border p-8 max-w-6xl w-full space-y-6'
    },
      // Distance Information Panel
      distanceInfo && React.createElement('div', { 
        className: 'bg-gradient-to-r from-green-900 to-blue-900 p-4 rounded-lg border border-green-500'
      },
        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4 text-center' },
          React.createElement('div', {},
            React.createElement('div', { className: 'text-green-300 font-bold text-lg' }, 'Distance'),
            React.createElement('div', { className: 'text-white text-xl' }, distanceInfo.formattedDistance)
          ),
          React.createElement('div', {},
            React.createElement('div', { className: 'text-blue-300 font-bold text-lg' }, 'Flight Time'),
            React.createElement('div', { className: 'text-white text-xl' }, distanceInfo.formattedFlightTime)
          ),
          fuelInfo && React.createElement('div', {},
            React.createElement('div', { className: 'text-yellow-300 font-bold text-lg' }, 'Fuel Required'),
            React.createElement('div', { className: 'text-white text-xl' }, `${fuelInfo.totalFuel.toLocaleString()} lbs`)
          )
        ),
        React.createElement('div', { className: 'text-center text-gray-300 text-sm mt-2' },
          `${selectedAirports.departure?.name} → ${selectedAirports.arrival?.name}`
        )
      ),

      // Difficulty Selector
      React.createElement('div', { className: 'space-y-4' },
        React.createElement('h3', { 
          className: 'text-2xl font-bold text-yellow-300 text-center mb-4'
        }, 'SELECT DIFFICULTY'),
        React.createElement('div', { 
          className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4'
        },
          difficulties.map(diff => 
            React.createElement('button', {
              key: diff.value,
              type: 'button',
              className: `p-4 rounded-lg border-2 text-center transition-all ${
                flightPlan.difficulty === diff.value 
                  ? 'border-yellow-400 bg-yellow-400 bg-opacity-20 text-yellow-300' 
                  : 'border-gray-600 bg-gray-800 bg-opacity-50 text-gray-300 hover:border-gray-400'
              }`,
              onClick: () => handleInputChange('difficulty', diff.value)
            },
              React.createElement('div', { className: 'font-bold text-lg' }, diff.label),
              React.createElement('div', { className: 'text-sm mt-1 opacity-80' }, diff.description)
            )
          )
        )
      ),

      // Flight Planning Form
      React.createElement('div', { className: 'space-y-6' },
        React.createElement('h3', { 
          className: 'text-2xl font-bold text-blue-300 text-center mb-4'
        }, 'FLIGHT PLAN CONFIGURATION'),
        
        // Route Information with Airport Search
        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' },
          React.createElement(AirportSearchInput, {
            type: 'departure',
            label: 'Departure Airport',
            onSearch: handleAirportSearch,
            onSelect: selectAirport,
            onClear: clearSelection,
            selectedAirport: selectedAirports.departure
          }),
          React.createElement(AirportSearchInput, {
            type: 'arrival',
            label: 'Arrival Airport',
            onSearch: handleAirportSearch,
            onSelect: selectAirport,
            onClear: clearSelection,
            selectedAirport: selectedAirports.arrival
          })
        ),

        // Basic Information
        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-6' },
          // Airline & Callsign
          React.createElement('div', { className: 'space-y-4' },
            React.createElement('div', { className: 'space-y-2' },
              React.createElement('label', { 
                className: 'text-gray-300 font-medium'
              }, 'Airline'),
              React.createElement('input', {
                type: 'text',
                value: flightPlan.airline,
                onChange: (e) => handleInputChange('airline', e.target.value),
                className: 'w-full p-3 bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg text-white',
                placeholder: 'e.g., Delta, United, Emirates'
              })
            ),
            React.createElement('div', { className: 'space-y-2' },
              React.createElement('label', { 
                className: 'text-gray-300 font-medium'
              }, 'Callsign'),
              React.createElement('input', {
                type: 'text',
                value: flightPlan.callsign,
                onChange: (e) => handleInputChange('callsign', e.target.value),
                className: 'w-full p-3 bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg text-white',
                placeholder: 'e.g., DAL123, UAL456'
              })
            )
          ),

          // Aircraft & Capacity
          React.createElement('div', { className: 'space-y-4' },
            React.createElement('div', { className: 'space-y-2' },
              React.createElement('label', { 
                className: 'text-gray-300 font-medium'
              }, 'Aircraft Model'),
              React.createElement('input', {
                type: 'text',
                value: flightPlan.aircraftModel,
                onChange: (e) => handleInputChange('aircraftModel', e.target.value),
                className: 'w-full p-3 bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg text-white',
                placeholder: 'e.g., Boeing 737, Airbus A320'
              })
            ),
            React.createElement('div', { className: 'grid grid-cols-2 gap-4' },
              React.createElement('div', { className: 'space-y-2' },
                React.createElement('label', { 
                  className: 'text-gray-300 font-medium'
                }, 'PAX'),
                React.createElement('input', {
                  type: 'number',
                  value: flightPlan.pax,
                  onChange: (e) => handleInputChange('pax', parseInt(e.target.value) || 0),
                  className: 'w-full p-3 bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg text-white'
                })
              ),
              React.createElement('div', { className: 'space-y-2' },
                React.createElement('label', { 
                  className: 'text-gray-300 font-medium'
                }, 'Payload (kg)'),
                React.createElement('input', {
                  type: 'number',
                  value: flightPlan.payload,
                  onChange: (e) => handleInputChange('payload', parseInt(e.target.value) || 0),
                  className: 'w-full p-3 bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg text-white'
                })
              )
            )
          ),

          // Flight Parameters
          React.createElement('div', { className: 'space-y-4' },
            React.createElement('div', { className: 'space-y-2' },
              React.createElement('label', { 
                className: 'text-gray-300 font-medium'
              }, 'Cruise Height (ft)'),
              React.createElement('input', {
                type: 'number',
                value: flightPlan.cruiseHeight,
                onChange: (e) => handleInputChange('cruiseHeight', parseInt(e.target.value) || 0),
                className: 'w-full p-3 bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg text-white'
              })
            ),
            React.createElement('div', { className: 'space-y-2' },
              React.createElement('label', { 
                className: 'text-gray-300 font-medium'
              }, 'Fuel Reserve (minutes)'),
              React.createElement('input', {
                type: 'number',
                value: flightPlan.fuelReserve,
                onChange: (e) => handleInputChange('fuelReserve', parseInt(e.target.value) || 0),
                className: 'w-full p-3 bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg text-white',
                placeholder: 'e.g., 45 (minutes of extra fuel)'
              })
            )
          )
        ),

        // Time & Season Settings
        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' },
          React.createElement('div', { className: 'space-y-4' },
            React.createElement('div', { className: 'space-y-2' },
              React.createElement('label', { 
                className: 'text-gray-300 font-medium'
              }, 'Start Time (Zulu)'),
              React.createElement('div', { className: 'flex gap-4' },
                React.createElement('label', { className: 'flex items-center' },
                  React.createElement('input', {
                    type: 'radio',
                    checked: flightPlan.startTime === 'random',
                    onChange: () => handleInputChange('startTime', 'random'),
                    className: 'mr-2'
                  }),
                  'Random'
                ),
                React.createElement('label', { className: 'flex items-center' },
                  React.createElement('input', {
                    type: 'radio',
                    checked: flightPlan.startTime === 'specific',
                    onChange: () => handleInputChange('startTime', 'specific'),
                    className: 'mr-2'
                  }),
                  'Specific'
                )
              ),
              flightPlan.startTime === 'specific' && React.createElement('input', {
                type: 'datetime-local',
                value: flightPlan.startTimeSpecific,
                onChange: (e) => handleInputChange('startTimeSpecific', e.target.value),
                className: 'w-full p-3 bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg text-white mt-2'
              })
            )
          ),
          React.createElement('div', { className: 'space-y-4' },
            React.createElement('div', { className: 'space-y-2' },
              React.createElement('label', { 
                className: 'text-gray-300 font-medium'
              }, 'Season'),
              React.createElement('div', { className: 'flex gap-4' },
                React.createElement('label', { className: 'flex items-center' },
                  React.createElement('input', {
                    type: 'radio',
                    checked: flightPlan.season === 'random',
                    onChange: () => handleInputChange('season', 'random'),
                    className: 'mr-2'
                  }),
                  'Random'
                ),
                React.createElement('label', { className: 'flex items-center' },
                  React.createElement('input', {
                    type: 'radio',
                    checked: flightPlan.season === 'specific',
                    onChange: () => handleInputChange('season', 'specific'),
                    className: 'mr-2'
                  }),
                  'Specific'
                )
              ),
              flightPlan.season === 'specific' && React.createElement('select', {
                value: flightPlan.seasonSpecific,
                onChange: (e) => handleInputChange('seasonSpecific', e.target.value),
                className: 'w-full p-3 bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg text-white mt-2'
              },
                React.createElement('option', { value: '' }, 'Select Season'),
                React.createElement('option', { value: 'winter' }, 'Winter'),
                React.createElement('option', { value: 'spring' }, 'Spring'),
                React.createElement('option', { value: 'summer' }, 'Summer'),
                React.createElement('option', { value: 'autumn' }, 'Autumn')
              )
            )
          )
        ),

        // Submit Button
        React.createElement('div', { className: 'text-center pt-4' },
          React.createElement('button', {
            type: 'submit',
            className: 'aviation-button px-8 py-4 text-lg'
          }, 'INITIALIZE FLIGHT')
        )
      )
    ),

    // Footer
    React.createElement('div', { 
      className: 'mt-8 text-center text-gray-300 text-sm'
    },
      React.createElement('p', null, 'Ultimate Crash Simulation System v0.1'),
      React.createElement('p', { className: 'mt-1' }, 'Professional Airport Database & Distance Calculation')
    )
  )
}

export default App