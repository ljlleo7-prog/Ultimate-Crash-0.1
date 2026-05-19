// Aircraft registry — maps ICAO code to per-aircraft modules
// Each folder: static.json (physics/perf), systems.js (initial state), overheadPanel.jsx (React panel)

const registry = {
  B738: { folder: 'b738', label: 'Boeing 737-800',    family: '737' },
  A320: { folder: 'a320', label: 'Airbus A320-200',   family: 'A320' },
  B77W: { folder: 'b77w', label: 'Boeing 777-300ER',  family: '777' },
  A359: { folder: 'a359', label: 'Airbus A350-900',   family: 'A350' },
  E190: { folder: 'e190', label: 'Embraer E190',      family: 'E-Jet' },
  C750: { folder: 'c750', label: 'Cessna Citation X', family: 'Citation' },
  B744: { folder: 'b744', label: 'Boeing 747-400',    family: '747' },
  A388: { folder: 'a388', label: 'Airbus A380-800',   family: 'A380' },
  A333: { folder: 'a333', label: 'Airbus A330-300',   family: 'A330' },
  A346: { folder: 'a346', label: 'Airbus A340-600',   family: 'A340' },
  B752: { folder: 'b752', label: 'Boeing 757-200',    family: '757' },
};

// Resolve ICAO from model string (e.g. "Boeing 737-800" → "B738")
export function resolveICAO(modelOrIcao) {
  if (!modelOrIcao) return null;
  const upper = modelOrIcao.toUpperCase();
  // Direct ICAO match
  if (registry[upper]) return upper;
  // Model string match
  const entry = Object.entries(registry).find(([, v]) => v.label.toUpperCase() === upper);
  if (entry) return entry[0];
  // Partial match on label
  const partial = Object.entries(registry).find(([, v]) =>
    upper.includes(v.family.toUpperCase()) || v.label.toUpperCase().includes(upper)
  );
  return partial ? partial[0] : null;
}

export function getAircraftMeta(icao) {
  return registry[icao?.toUpperCase()] ?? null;
}

export default registry;
