import { useEffect, useMemo, useRef, useState } from 'react';
import { cloudSaveService } from '../../services/cloudSaveService.js';
import { buildFlightSavePayload } from '../../services/buildFlightSavePayload.js';

export function useAutoCloudSave({
  enabled,
  intervalMinutes,
  isInitialized,
  flightData,
  physicsState,
  physicsService,
  flightPlan,
  weatherData,
  aircraftModel,
  onSaveStateChange
}) {
  const latestRef = useRef({
    flightData,
    physicsState,
    physicsService,
    flightPlan,
    weatherData,
    aircraftModel
  });
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    latestRef.current = {
      flightData,
      physicsState,
      physicsService,
      flightPlan,
      weatherData,
      aircraftModel
    };
  }, [flightData, physicsState, physicsService, flightPlan, weatherData, aircraftModel]);

  const activeIntervalMs = useMemo(() => {
    const minutes = Number(intervalMinutes);
    if (!enabled || !isInitialized || !Number.isFinite(minutes) || minutes < 1) {
      return null;
    }
    return minutes * 60 * 1000;
  }, [enabled, intervalMinutes, isInitialized]);

  useEffect(() => {
    if (!activeIntervalMs) {
      return undefined;
    }

    let cancelled = false;

    const saveNow = async () => {
      const snapshot = latestRef.current;
      if (!snapshot?.flightData || !snapshot?.physicsService) {
        return;
      }

      setIsSaving(true);
      onSaveStateChange?.({ isSaving: true, lastSavedAt, saveError });

      const payload = buildFlightSavePayload(snapshot);
      const { error } = await cloudSaveService.saveFlight(payload, { saveType: 'autosave' });

      if (cancelled) {
        return;
      }

      if (error) {
        const message = error.message || 'Auto-save failed.';
        setSaveError(message);
        setIsSaving(false);
        onSaveStateChange?.({ isSaving: false, lastSavedAt, saveError: message });
        return;
      }

      const savedAt = new Date().toISOString();
      setLastSavedAt(savedAt);
      setSaveError(null);
      setIsSaving(false);
      onSaveStateChange?.({ isSaving: false, lastSavedAt: savedAt, saveError: null });
    };

    const timer = window.setInterval(saveNow, activeIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeIntervalMs, isInitialized, lastSavedAt, onSaveStateChange, saveError]);

  return {
    lastSavedAt,
    saveError,
    isSaving
  };
}

export default useAutoCloudSave;
