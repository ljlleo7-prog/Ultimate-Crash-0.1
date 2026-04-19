export const UNIT_DEFINITIONS = {
  length: {
    ft: { label: 'Feet', toBase: (value) => value * 0.3048, fromBase: (value) => value / 0.3048 },
    m: { label: 'Meters', toBase: (value) => value, fromBase: (value) => value }
  },
  speed: {
    kt: { label: 'Knots', toBase: (value) => value, fromBase: (value) => value },
    kmh: { label: 'KM/H', toBase: (value) => value / 1.852, fromBase: (value) => value * 1.852 },
    mph: { label: 'MPH', toBase: (value) => value / 1.15078, fromBase: (value) => value * 1.15078 }
  },
  distance: {
    nm: { label: 'Nautical Miles', toBase: (value) => value, fromBase: (value) => value },
    km: { label: 'Kilometers', toBase: (value) => value / 1.852, fromBase: (value) => value * 1.852 },
    sm: { label: 'Statute Miles', toBase: (value) => value / 1.15078, fromBase: (value) => value * 1.15078 }
  },
  pressure: {
    inHg: { label: 'inHg', toBase: (value) => value * 33.8639, fromBase: (value) => value / 33.8639 },
    hPa: { label: 'hPa', toBase: (value) => value, fromBase: (value) => value }
  },
  mass: {
    kg: { label: 'Kilograms', toBase: (value) => value, fromBase: (value) => value },
    lb: { label: 'Pounds', toBase: (value) => value / 2.20462, fromBase: (value) => value * 2.20462 }
  },
  temperature: {
    c: { label: 'Celsius', toBase: (value) => value, fromBase: (value) => value },
    f: { label: 'Fahrenheit', toBase: (value) => (value - 32) * 5 / 9, fromBase: (value) => (value * 9 / 5) + 32 }
  }
};

export const convertUnit = (value, fromUnit, toUnit, category) => {
  const parsed = Number(value);
  const units = UNIT_DEFINITIONS[category];
  if (!Number.isFinite(parsed) || !units?.[fromUnit] || !units?.[toUnit]) return null;
  const baseValue = units[fromUnit].toBase(parsed);
  return units[toUnit].fromBase(baseValue);
};

export const formatDuration = (hours) => {
  if (!Number.isFinite(hours) || hours < 0) return '—';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
};

export const formatMinutes = (minutes) => {
  if (!Number.isFinite(minutes) || minutes < 0) return '—';
  const totalSeconds = Math.round(minutes * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const formatNumber = (value, digits = 0, suffix = '') => {
  if (!Number.isFinite(value)) return '—';
  return `${value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })}${suffix}`;
};
