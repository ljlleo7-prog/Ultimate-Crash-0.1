export const installDeterministicRandom = (seed = 1) => {
  const originalRandom = Math.random;
  let state = seed >>> 0;

  Math.random = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  return () => {
    Math.random = originalRandom;
  };
};
