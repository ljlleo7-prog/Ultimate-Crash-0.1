import { useState, useEffect } from 'react';

export default function useWeatherSystem(selectedRoute, realWeatherService) {
    const [weatherData, setWeatherData] = useState(null);
    const [terrainElevation, setTerrainElevation] = useState(null);

    useEffect(() => {
        if (!selectedRoute?.departure) return;

        const fetchWeather = async () => {
            try {
                const weather = await realWeatherService?.fetchWeather?.(selectedRoute.departure);
                setWeatherData(weather);
            } catch (err) {
                console.warn('Weather fetch failed:', err);
            }
        };

        fetchWeather();
    }, [selectedRoute, realWeatherService]);

    return { weatherData, terrainElevation, setTerrainElevation };
}
