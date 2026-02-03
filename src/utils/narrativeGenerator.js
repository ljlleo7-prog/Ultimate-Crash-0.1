
const getRandomIndex = (arr) => Math.floor(Math.random() * arr.length);

export const generateNarrative = (context, t) => {
  const { difficulty, departure, arrival, pax } = context;
  
  // Normalize difficulty
  const diffKey = difficulty ? difficulty.toLowerCase() : 'rookie';
  
  // Role
  const roles = t('narrative_generator.roles');
  const role = Array.isArray(roles) ? roles[getRandomIndex(roles)] : roles;
  
  // Experience
  const experiencePool = t(`narrative_generator.experience.${diffKey}`) || t('narrative_generator.experience.rookie');
  const experience = Array.isArray(experiencePool) ? experiencePool[getRandomIndex(experiencePool)] : experiencePool;
  
  // Flight Plan
  // We need to fetch the template string first, then interpolate it using t's mechanism or manual replacement.
  // Since t() handles interpolation if we pass params, but we are fetching an array...
  // The array returned by t() contains strings with ${param}.
  // We pick one string.
  // Then we can use t's logic or just simple replace.
  // Actually, we can just use t() with the specific index key to let t handle interpolation!
  // e.g. t('narrative_generator.flight_plan.0', { pax: ... })
  
  const flightPlans = t('narrative_generator.flight_plan');
  const planIndex = Array.isArray(flightPlans) ? getRandomIndex(flightPlans) : 0;
  
  const plan = t(`narrative_generator.flight_plan.${planIndex}`, {
    departure: departure?.name || departure?.iata || 'Departure',
    arrival: arrival?.name || arrival?.iata || 'Arrival',
    pax: pax || 150
  });
  
  // Difficulties
  // Similarly, fetch the array to get length, then call t with specific key.
  // Wait, difficulty templates in en.js don't seem to have variables.
  // Let's check en.js content again.
  // Lines 822-851 in en.js. No variables seen in the snippets.
  // So we can just fetch the string directly or via array.
  
  const difficultyPool = t(`narrative_generator.difficulty.${diffKey}`) || t('narrative_generator.difficulty.rookie');
  const difficultyIndex = Array.isArray(difficultyPool) ? getRandomIndex(difficultyPool) : 0;
  const potentialDifficulty = t(`narrative_generator.difficulty.${diffKey}.${difficultyIndex}`);
  
  return {
    role,
    experience,
    plan,
    potentialDifficulty
  };
};
