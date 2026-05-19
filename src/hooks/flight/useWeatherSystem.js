import { useState, useEffect } from 'react';

export default function useWeatherSystem(selectedRoute, realWeatherService) {
    const [weatherData, setWeatherData] = useState(null);
    const [terrainElevation, setTerrainElevation] = useState(null);

    useEffect(() => {
        if (!selectedRoute?.departure) return;

        const fetchWeather = async () => {
            try {
                const dep = selectedRoute.departure;
                const weather = await realWeatherService?.getWeather?.(dep?.latitude, dep?.longitude);
                setWeatherData(weather);
            } catch (err) {
                console.warn('Weather fetch failed:', err);
            }
        };

        fetchWeather();
    }, [selectedRoute, realWeatherService]);

    return { weatherData, terrainElevation, setTerrainElevation };
}
