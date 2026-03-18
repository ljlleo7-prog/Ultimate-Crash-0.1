import React, { useState, useEffect } from 'react';
import './TutorialOverlay.css'; // We'll create this CSS file

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome Pilot',
    instruction: 'Welcome to the flight deck. This tutorial will guide you through basic flight operations.',
    action: 'Press "Next" to continue.',
    condition: () => true,
    highlight: null
  },
  {
    id: 'controls_pitch',
    title: 'Flight School: Pitch Control',
    instruction: 'Use the joystick (mouse drag) or W/S keys to control aircraft pitch (nose up/down).',
    action: 'Goal: Pitch up to 10 degrees.',
    condition: (state) => state.pitch > 10,
    highlight: '.attitude-indicator'
  },
  {
    id: 'controls_roll',
    title: 'Flight School: Roll Control',
    instruction: 'Use the joystick (mouse drag) or A/D keys to control aircraft roll (bank left/right).',
    action: 'Goal: Bank right to 10 degrees.',
    condition: (state) => state.roll > 10,
    highlight: '.attitude-indicator'
  },
  {
    id: 'throttle',
    title: 'Flight School: Throttle Control',
    instruction: 'Use "R" to increase throttle and "F" to decrease throttle.',
    action: 'Goal: Increase throttle to at least 50%.',
    condition: (state) => state.throttle > 50,
    highlight: '.throttle-lever'
  },
  {
    id: 'autopilot',
    title: 'Flight School: Autopilot',
    instruction: 'Engage autopilot to maintain current heading and altitude.',
    action: 'Goal: Press "Z" to toggle Autopilot Master.',
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

  const currentStep = TUTORIAL_STEPS[currentStepIndex];

  useEffect(() => {
    // Check condition periodically
    if (!physicsState) return;

    const checkCondition = () => {
      if (currentStep.condition && currentStep.condition(physicsState)) {
        // Automatically advance if condition is met? 
        // Or maybe just show a "Next" button enabled?
        // Let's auto-advance for dynamic steps, manual for static ones.
        if (currentStep.id !== 'welcome' && currentStep.id !== 'complete') {
             // Add a small delay so user sees success
             setTimeout(() => {
                 handleNext();
             }, 1000);
        }
      }
    };

    const interval = setInterval(checkCondition, 500);
    return () => clearInterval(interval);
  }, [physicsState, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

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
