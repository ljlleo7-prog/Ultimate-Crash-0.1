import { useState, useEffect, useCallback } from 'react';
import { airportService } from '../services/airportService';
import { calculateGreatCircleDistance, calculateFlightTime, formatDistance, formatFlightTime } from '../utils/distanceCalculator';

// Custom hook for airport search and distance calculations
export function useAirportSearch() {
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAirports, setSelectedAirports] = useState({ departure: null, arrival: null });
  const [distanceInfo, setDistanceInfo] = useState(null);
  const [popularAirports, setPopularAirports] = useState([]);

  // Load popular airports on component mount
  useEffect(() => {
    const loadPopularAirports = async () => {
      try {
        const airports = airportService.getPopularAirports();
        setPopularAirports(airports);
      } catch (error) {
        console.warn('Failed to load popular airports:', error);
      }
    };

    loadPopularAirports();
  }, []);

  // Search airports with debouncing
  const searchAirports = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await airportService.searchAirports(query);
      setSearchResults(results.slice(0, 10)); // Limit to top 10 results
    } catch (error) {
      console.error('Airport search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Select an airport for departure or arrival
  const selectAirport = useCallback((airport, type) => {
    setSelectedAirports(prev => ({
      ...prev,
      [type]: airport
    }));

    // Clear search results after selection
    setSearchResults([]);

    // Calculate distance if both airports are selected
    if (type === 'arrival' && selectedAirports.departure) {
      calculateDistance(selectedAirports.departure, airport);
    } else if (type === 'departure' && selectedAirports.arrival) {
      calculateDistance(airport, selectedAirports.arrival);
    }
  }, [selectedAirports.departure, selectedAirports.arrival]);

  // Calculate distance between two airports
  const calculateDistance = useCallback(async (departure, arrival) => {
    if (!departure || !arrival) return;

    try {
      const distance = calculateGreatCircleDistance(
        departure.latitude,
        departure.longitude,
        arrival.latitude,
        arrival.longitude,
        'nm'
      );

      const flightTime = calculateFlightTime(distance);

      setDistanceInfo({
        distance: distance,
        formattedDistance: formatDistance(distance),
        flightTime: flightTime,
        formattedFlightTime: formatFlightTime(flightTime),
        departure: departure,
        arrival: arrival
      });
    } catch (error) {
      console.error('Distance calculation failed:', error);
      setDistanceInfo(null);
    }
  }, []);

  // Clear selection
  const clearSelection = useCallback((type = null) => {
    if (type) {
      setSelectedAirports(prev => ({
        ...prev,
        [type]: null
      }));
    } else {
      setSelectedAirports({ departure: null, arrival: null });
    }
    setDistanceInfo(null);
  }, []);

  // Get airport suggestions based on current input
  const getSuggestions = useCallback((query) => {
    if (!query) return popularAirports.slice(0, 5);
    
    return popularAirports.filter(airport =>
      airport.iata.toLowerCase().includes(query.toLowerCase()) ||
      airport.icao.toLowerCase().includes(query.toLowerCase()) ||
      airport.name.toLowerCase().includes(query.toLowerCase()) ||
      airport.city.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
  }, [popularAirports]);

  return {
    searchResults,
    isSearching,
    selectedAirports,
    distanceInfo,
    popularAirports,
    searchAirports,
    selectAirport,
    calculateDistance,
    clearSelection,
    getSuggestions
  };
}