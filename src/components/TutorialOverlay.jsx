import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './TutorialOverlay.css'; // We'll create this CSS file

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome Pilot',
    instruction: 'Welcome to the flight deck. This tutorial will guide you through the on-screen controls you can click and drag.',
    action: 'Press "Next" to continue.',
    condition: () => true,
    highlight: null
  },
  {
    id: 'controls_pitch',
    title: 'Flight School: Pitch Control',
    instruction: 'Use the flight controls in the main panel and drag the aircraft nose up until the pitch ladder shows a climb attitude.',
    action: 'Goal: Pitch up to 10 degrees.',
    condition: (state) => state.pitch > 10,
    highlight: '.attitude-indicator'
  },
  {
    id: 'controls_roll',
    title: 'Flight School: Roll Control',
    instruction: 'Use the same flight controls panel to bank the aircraft right until the attitude display shows a noticeable right roll.',
    action: 'Goal: Bank right to 10 degrees.',
    condition: (state) => state.roll > 10,
    highlight: '.attitude-indicator'
  },
  {
    id: 'throttle',
    title: 'Flight School: Throttle Control',
    instruction: 'Use the throttle levers in the engine control area and drag them upward to add thrust.',
    action: 'Goal: Increase throttle to at least 50%.',
    condition: (state) => state.throttle > 50,
    highlight: '.throttle-lever'
  },
  {
    id: 'autopilot',
    title: 'Flight School: Autopilot',
    instruction: 'Open the autopilot controls on the panel and click the autopilot master control to engage it.',
    action: 'Goal: Engage autopilot from the on-screen panel.',
    condition: (state) => state.autopilotEngaged === true,
    highlight: '.autopilot-panel'
  },
  {
    id: 'complete',
    title: 'Tutorial Complete',
    instruction: 'You have mastered the basics! Continue flying or return to the main menu.',
    action: 'Press "Finish" to close tutorial.',
    condition: () => true,
    highlight: null
  }
];

const TutorialOverlay = ({ physicsState, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const pendingAdvanceTimeoutRef = useRef(null);

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isAutoAdvanceStep = currentStep && currentStep.id !== 'welcome' && currentStep.id !== 'complete';

  const tutorialState = useMemo(() => ({
    pitch: physicsState?.pitch ?? 0,
    roll: physicsState?.roll ?? 0,
    throttle: physicsState?.throttle ?? 0,
    autopilotEngaged: physicsState?.autopilotEngaged === true
  }), [
    physicsState?.pitch,
    physicsState?.roll,
    physicsState?.throttle,
    physicsState?.autopilotEngaged
  ]);

  const isConditionMet = useMemo(() => {
    if (!currentStep?.condition) return false;
    return currentStep.condition(tutorialState);
  }, [currentStep, tutorialState]);

  const clearPendingAdvance = useCallback(() => {
    if (pendingAdvanceTimeoutRef.current) {
      clearTimeout(pendingAdvanceTimeoutRef.current);
      pendingAdvanceTimeoutRef.current = null;
    }
  }, []);

  const handleNext = useCallback(() => {
    clearPendingAdvance();
    setCurrentStepIndex(prev => {
      if (prev < TUTORIAL_STEPS.length - 1) {
        return prev + 1;
      }

      onClose();
      return prev;
    });
  }, [clearPendingAdvance, onClose]);

  useEffect(() => {
    if (!isAutoAdvanceStep || !isConditionMet || pendingAdvanceTimeoutRef.current) {
      return undefined;
    }

    pendingAdvanceTimeoutRef.current = setTimeout(() => {
      pendingAdvanceTimeoutRef.current = null;
      handleNext();
    }, 1000);

    return () => {
      clearPendingAdvance();
    };
  }, [clearPendingAdvance, handleNext, isAutoAdvanceStep, isConditionMet, currentStepIndex]);

  useEffect(() => {
    return () => {
      clearPendingAdvance();
    };
  }, [clearPendingAdvance]);

  const handleSkip = () => {
    handleNext();
  };

  if (!currentStep) return null;

  return (
    <div className={`tutorial-overlay ${isMinimized ? 'minimized' : ''}`}>
      <div className="tutorial-header">
        <h3>{currentStep.title}</h3>
        <div className="tutorial-controls">
          <button onClick={() => setIsMinimized(!isMinimized)} title={isMinimized ? 'Expand' : 'Minimize'}>
            {isMinimized ? '▲' : '▼'}
          </button>
          <button onClick={handleSkip} title="Skip Step">✕</button>
        </div>
      </div>

      {!isMinimized && (
        <div className="tutorial-content">
          <p className="tutorial-instruction">{currentStep.instruction}</p>
          <p className="tutorial-action"><strong>{currentStep.action}</strong></p>

          <div className="tutorial-footer">
            <button
              className="tutorial-next-btn"
              onClick={handleNext}
              disabled={currentStep.id !== 'welcome' && currentStep.id !== 'complete'}
            >
              {currentStepIndex === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next'}
            </button>
             {currentStep.id !== 'welcome' && currentStep.id !== 'complete' && (
                <span className="waiting-text">Waiting for action...</span>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorialOverlay;
