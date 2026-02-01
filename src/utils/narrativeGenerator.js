
const getRandomIndex = (length) => Math.floor(Math.random() * length);

export const generateNarrativeIndices = (context) => {
  const { difficulty } = context;
  const diffKey = difficulty ? difficulty.toLowerCase() : 'rookie';

  // Role: 5 options
  const roleIndex = getRandomIndex(5);

  // Experience: 4 options
  const experienceIndex = getRandomIndex(4);

  // Flight Plan: 4 options
  const planIndex = getRandomIndex(4);

  // Difficulty Description: 3 options
  const difficultyIndex = getRandomIndex(3);

  return {
    diffKey,
    roleIndex,
    experienceIndex,
    planIndex,
    difficultyIndex
  };
};

// Deprecated: Kept for backward compatibility if needed, but should be replaced
export const generateNarrative = (context) => {
    // This function is no longer used by the new NarrativeScene
    // It's just a placeholder to avoid breaking imports if any
    return null; 
};
