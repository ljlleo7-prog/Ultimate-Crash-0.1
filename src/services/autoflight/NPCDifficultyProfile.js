export const NPC_DIFFICULTIES = ['rookie', 'amateur', 'intermediate', 'advanced', 'pro', 'devil'];

const profiles = {
  rookie: {
    key: 'rookie',
    persona: 'supportive',
    initiative: 'high',
    explanationLevel: 'full',
    autonomy: 'guided',
    radioHelp: 'proactive',
    diagnosticDepth: 'detailed',
    responseDelayMs: [200, 700],
    stressTone: 'calm',
    unreliability: 0.02,
    quickActions: true,
    suggestions: true
  },
  amateur: {
    key: 'amateur',
    persona: 'experienced',
    initiative: 'high',
    explanationLevel: 'full',
    autonomy: 'guided',
    radioHelp: 'proactive',
    diagnosticDepth: 'detailed',
    responseDelayMs: [250, 900],
    stressTone: 'steady',
    unreliability: 0.04,
    quickActions: true,
    suggestions: true
  },
  intermediate: {
    key: 'intermediate',
    persona: 'professional',
    initiative: 'medium',
    explanationLevel: 'balanced',
    autonomy: 'on_command',
    radioHelp: 'on_request',
    diagnosticDepth: 'balanced',
    responseDelayMs: [350, 1100],
    stressTone: 'focused',
    unreliability: 0.06,
    quickActions: true,
    suggestions: true
  },
  advanced: {
    key: 'advanced',
    persona: 'terse',
    initiative: 'medium',
    explanationLevel: 'brief',
    autonomy: 'on_command',
    radioHelp: 'on_request',
    diagnosticDepth: 'brief',
    responseDelayMs: [450, 1400],
    stressTone: 'terse',
    unreliability: 0.1,
    quickActions: true,
    suggestions: false
  },
  pro: {
    key: 'pro',
    persona: 'numb',
    initiative: 'low',
    explanationLevel: 'brief',
    autonomy: 'explicit_only',
    radioHelp: 'minimal',
    diagnosticDepth: 'brief',
    responseDelayMs: [900, 2200],
    stressTone: 'numb',
    unreliability: 0.16,
    quickActions: true,
    suggestions: false
  },
  devil: {
    key: 'devil',
    persona: 'stressed',
    initiative: 'low',
    explanationLevel: 'minimal',
    autonomy: 'explicit_only',
    radioHelp: 'minimal',
    diagnosticDepth: 'minimal',
    responseDelayMs: [1200, 3200],
    stressTone: 'stressed',
    unreliability: 0.24,
    quickActions: true,
    suggestions: false
  }
};

export function getNPCDifficultyProfile(difficulty = 'intermediate') {
  return profiles[difficulty] || profiles.intermediate;
}

export function getNPCResponseDelay(profile) {
  const [min, max] = profile?.responseDelayMs || profiles.intermediate.responseDelayMs;
  return Math.round(min + Math.random() * Math.max(0, max - min));
}

export function shouldNPCIntroduceNoise(profile, importance = 'normal') {
  if (!profile) return false;
  const multiplier = importance === 'critical' ? 0.35 : importance === 'high' ? 0.55 : 1;
  return Math.random() < (profile.unreliability || 0) * multiplier;
}
