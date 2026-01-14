
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const roles = [
  'Captain', 
  'Commander', 
  'Pilot in Command', 
  'Skipper', 
  'Chief Pilot'
];

const experienceLevels = {
  rookie: [
    'fresh from the flight academy. The ink on your license is barely dry.',
    'on your first week with the airline. Nerves are high, but so is your ambition.',
    'still proving yourself to the chief pilot. Every maneuver counts today.',
    'sitting in the left seat for the first time. Don\'t forget your training.'
  ],
  amateur: [
    'building your flight hours. You know the aircraft, but she still surprises you sometimes.',
    'gaining confidence with every leg. You\'ve handled calm skies, but today might be different.',
    'no longer a cadet, but not yet a veteran. The crew looks to you for steady hands.',
    'starting to feel at home in the cockpit, though the complex systems still demand full attention.'
  ],
  intermediate: [
    'a seasoned First Officer ready for upgrade. You know the procedures by heart.',
    'an experienced pilot with thousands of hours. Standard operations are second nature.',
    'reliable and steady. The airline trusts you with their most valuable routes.',
    'competent and focused. You\'ve seen your share of rough weather and technical glitches.'
  ],
  advanced: [
    'a senior Captain. Your name is whispered with respect in the crew lounge.',
    'a veteran of the skies. You\'ve flown through hurricanes and landed with engines out.',
    'an instructor examiner. You wrote the manual that others are struggling to learn.',
    'the master of this fleet. The aircraft feels like an extension of your own body.'
  ],
  pro: [
    'a legendary aviator. They say you can land on a postage stamp in a crosswind.',
    'an ace pilot. Systems failures are just an opportunity to show off your skills.',
    'the best of the best. When others panic, you just check your watch.',
    'an elite commander. Nothing surprises you anymore, not even total hydraulic loss.'
  ],
  devil: [
    'a test pilot pushing the envelope. Safety margins are just suggestions.',
    'flying a cursed aircraft. The mechanics crossed themselves when you walked out to the tarmac.',
    'facing the impossible. The odds are stacked against you, just the way you like it.',
    'about to experience a simulation designed to break you. Good luck.'
  ]
};

const flightPlanTemplates = [
  (dep, arr, pax) => `Today's manifest lists ${pax} souls on board for the leg from ${dep} to ${arr}.`,
  (dep, arr, pax) => `You are cleared for the route from ${dep} to ${arr}, carrying ${pax} passengers depending on you.`,
  (dep, arr, pax) => `The flight plan is filed: ${dep} departure, destination ${arr}. ${pax} passengers are settling into their seats.`,
  (dep, arr, pax) => `From the gate at ${dep} to the tarmac at ${arr}, you are responsible for ${pax} lives today.`
];

const difficultyTemplates = {
  rookie: [
    'System reports are normal. Focus on your decision-making and standard procedures.',
    'Expect a routine flight with minor procedural tasks. Your crew is fully supportive.',
    'A straightforward mission ahead. Minor issues may arise, but nothing you can\'t handle with basic logic.'
  ],
  amateur: [
    'A single, significant operational challenge is anticipated. Keep it simple and follow the checklist.',
    'You might encounter an impactful situation today, but your crew is ready to assist with the workload.',
    'Stay alert for one major event. Direct control requirements remain low, letting you focus on management.'
  ],
  intermediate: [
    'Prepare for dynamic conditions and potential interference. This leg requires hands-on flying.',
    'Standard flight protocols apply, but be ready for shifting priorities and active control needs.',
    'Your crew will follow your commands precisely, but the environment is becoming increasingly unpredictable.'
  ],
  advanced: [
    'Multiple critical issues may develop simultaneously. Sharp maneuvers and quick decisions are vital.',
    'Expect deadly scenarios where hands-on control is non-negotiable. Watch your crew—they may falter under pressure.',
    'The simulation will test your reflexes today. Dynamic failures require constant attention and manual intervention.'
  ],
  pro: [
    'Systematic failures are imminent. Automation is unreliable; you are the primary control loop.',
    'Complex CRM and skilled maneuvering are required. Your crew is stressed and prone to significant errors.',
    'Deadly, interconnected issues will challenge every skill you have. Expect a high workload and nervous support.'
  ],
  devil: [
    'Total chaos is the forecast. No autopilot, no safety nets, and no reliable assistance.',
    'The aircraft is pushed beyond its limits. Your crew might actively complicate the situation.',
    'Forget your training—this is about survival. Every system is a potential threat, and your "help" has their own agenda.'
  ]
};

export const generateNarrative = (context) => {
  const { difficulty, departure, arrival, pax } = context;
  
  // Normalize difficulty
  const diffKey = difficulty ? difficulty.toLowerCase() : 'rookie';
  const role = getRandom(roles);
  
  // Experience
  const experiencePool = experienceLevels[diffKey] || experienceLevels.rookie;
  const experience = getRandom(experiencePool);
  
  // Flight Plan
  const planTemplate = getRandom(flightPlanTemplates);
  const plan = planTemplate(departure?.name || 'Departure', arrival?.name || 'Arrival', pax || 150);
  
  // Difficulties
  const difficultyPool = difficultyTemplates[diffKey] || difficultyTemplates.rookie;
  const potentialDifficulty = getRandom(difficultyPool);
  
  return {
    role,
    experience,
    plan,
    potentialDifficulty
  };
};
