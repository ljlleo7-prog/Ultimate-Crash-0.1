import { useState, useCallback } from 'react';
import airportData from '../data/airportDatabase.json';

const useAirportSearch = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDeparture, setSelectedDeparture] = useState(null);
  const [selectedArrival, setSelectedArrival] = useState(null);

  const searchAirports = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const filteredAirports = airportData.airports.filter(airport => {
        const searchTerm = query.toLowerCase();
        return (
          airport.iata.toLowerCase().includes(searchTerm) ||
          airport.icao.toLowerCase().includes(searchTerm) ||
          (airport.name && airport.name.toLowerCase().includes(searchTerm)) ||
          (airport.city && airport.city.toLowerCase().includes(searchTerm))
        );
      });

      setSearchResults(filteredAirports.slice(0, 10));
    } catch (err) {
      setError('Failed to search airports');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectDeparture = useCallback((airport) => {
    setSelectedDeparture(airport);
    setSearchResults([]);
  }, []);

  const selectArrival = useCallback((airport) => {
    setSelectedArrival(airport);
    setSearchResults([]);
  }, []);

  const clearSelection = useCallback((type = null) => {
    if (type === 'departure') {
      setSelectedDeparture(null);
    } else if (type === 'arrival') {
      setSelectedArrival(null);
    } else {
      setSelectedDeparture(null);
      setSelectedArrival(null);
    }
  }, []);

  const getAirportByCode = useCallback((code) => {
    return airportData.airports.find(airport => 
      airport.iata === code || airport.icao === code
    );
  }, []);

  return {
    searchResults,
    isLoading,
    error,
    selectedDeparture,
    selectedArrival,
    searchAirports,
    selectDeparture,
    selectArrival,
    clearSelection,
    getAirportByCode
  };
};

export default useAirportSearch;