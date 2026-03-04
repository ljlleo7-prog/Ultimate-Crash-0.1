import React, { createContext, useContext, useState, useEffect } from 'react';
import { tutorialSteps } from '../data/tutorialSteps';

const TutorialContext = createContext();

export const useTutorial = () => useContext(TutorialContext);

export const TutorialProvider = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [gameContext, setGameContext] = useState({}); // Stores current game state (difficulty, aircraft, systems, etc.)

  const currentStep = isActive && tutorialSteps[currentStepIndex] ? tutorialSteps[currentStepIndex] : null;

  const startTutorial = () => {
    setIsActive(true);
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    console.log('🎓 Tutorial Started');
  };

  const stopTutorial = () => {
    setIsActive(false);
    console.log('🎓 Tutorial Stopped');
  };

  const nextStep = () => {
    if (currentStepIndex < tutorialSteps.length - 1) {
      setCompletedSteps(prev => [...prev, tutorialSteps[currentStepIndex].id]);
      setCurrentStepIndex(prev => prev + 1);
    } else {
      stopTutorial(); // Finish
    }
  };
  
  const skipStep = () => {
      nextStep();
  };

  // Check for auto-advancement based on triggers
  useEffect(() => {
    if (!isActive || !currentStep || !currentStep.trigger) return;

    // Check trigger condition against gameContext
    try {
        if (currentStep.trigger(gameContext)) {
            console.log(`🎓 Tutorial Step Auto-Advanced: ${currentStep.id}`);
            nextStep();
        }
    } catch (e) {
        console.warn("Tutorial trigger error", e);
    }
  }, [isActive, currentStep, gameContext]);

  // Update game context from components
  const updateGameContext = (newContext) => {
    setGameContext(prev => ({ ...prev, ...newContext }));
  };

  return (
    <TutorialContext.Provider value={{
      isActive,
      startTutorial,
      stopTutorial,
      currentStep,
      nextStep,
      skipStep,
      updateGameContext,
      completedSteps
    }}>
      {children}
    </TutorialContext.Provider>
  );
};
