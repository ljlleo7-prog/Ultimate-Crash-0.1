import { useMemo } from 'react';

export default function useFlightInitialization(selectedAircraft, selectedRoute, payload, fuel, difficulty) {
    return useMemo(() => {
        if (!selectedAircraft || !selectedRoute) return null;

        return {
            ...selectedAircraft,
            payloadWeight: payload,
            fuelWeight: fuel,
            difficulty
        };
    }, [selectedAircraft, selectedRoute, payload, fuel, difficulty]);
}
