import React, { useEffect, useState, useRef } from 'react';
import { useTutorial } from '../contexts/TutorialContext';

const TutorialOverlay = ({ t }) => {
  const { isActive, currentStep, nextStep, skipStep, stopTutorial } = useTutorial();
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});

  useEffect(() => {
    if (!isActive || !currentStep) return;

    const updatePosition = () => {
      const element = document.getElementById(currentStep.targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        
        // Calculate tooltip position
        let style = {};
        const margin = 12;
        
        switch (currentStep.placement) {
            case 'top':
                style = { bottom: window.innerHeight - rect.top + margin, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' };
                break;
            case 'bottom':
                style = { top: rect.bottom + margin, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' };
                break;
            case 'left':
                style = { top: rect.top + rect.height / 2, right: window.innerWidth - rect.left + margin, transform: 'translateY(-50%)' };
                break;
            case 'right':
                style = { top: rect.top + rect.height / 2, left: rect.right + margin, transform: 'translateY(-50%)' };
                break;
            case 'center':
            default:
                style = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
                break;
        }
        setTooltipStyle(style);
      } else {
        // If element not found, fallback to center or keep retrying
        setTargetRect(null);
        setTooltipStyle({ top: '20%', left: '50%', transform: 'translate(-50%, -50%)' });
      }
    };

    updatePosition();
    // Poll for element appearance (useful if components are mounting)
    const interval = setInterval(updatePosition, 500);
    window.addEventListener('resize', updatePosition);
    
    return () => {
        clearInterval(interval);
        window.removeEventListener('resize', updatePosition);
    };
  }, [isActive, currentStep]);

  if (!isActive || !currentStep) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {/* Dimmed background with cutout (optional, using simple overlay for now) */}
      {/* Highlight Box around target */}
      {targetRect && (
        <div 
          className="absolute border-4 border-yellow-400 rounded-lg shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-pulse transition-all duration-300"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* Tooltip Card */}
      <div 
        className="absolute bg-gray-900/95 text-white p-6 rounded-xl border border-blue-500/50 shadow-2xl max-w-sm pointer-events-auto backdrop-blur-md"
        style={tooltipStyle}
      >
        <div className="flex justify-between items-start mb-2">
            <h3 className="text-blue-400 font-bold text-sm tracking-wider uppercase">
                {t('tutorial.title')} • {currentStep.phase}
            </h3>
            <button onClick={stopTutorial} className="text-gray-500 hover:text-white text-xs">✕</button>
        </div>
        
        <p className="text-lg font-medium mb-4 leading-relaxed">
            {t(currentStep.translationKey)}
        </p>

        <div className="flex justify-between items-center mt-2">
            <button 
                onClick={skipStep}
                className="text-xs text-gray-400 hover:text-white underline"
            >
                {t('tutorial.skip')}
            </button>
            
            {(currentStep.actionRequired === 'next_button' || !currentStep.trigger) && (
                <button 
                    onClick={nextStep}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-bold text-sm transition-colors"
                >
                    {currentStep.actionRequired === 'finish' ? t('tutorial.finish') : t('tutorial.next')}
                </button>
            )}
        </div>
        
        {/* Arrow (optional visual flair) */}
        {targetRect && (
            <div className="absolute w-4 h-4 bg-gray-900 border-l border-t border-blue-500/50 transform rotate-45"
                 style={{
                     bottom: currentStep.placement === 'top' ? -8 : 'auto',
                     top: currentStep.placement === 'bottom' ? -8 : 'auto',
                     left: currentStep.placement === 'right' ? -8 : '50%',
                     right: currentStep.placement === 'left' ? -8 : 'auto',
                     marginLeft: currentStep.placement === 'top' || currentStep.placement === 'bottom' ? -8 : 0,
                 }}
            />
        )}
      </div>
    </div>
  );
};

export default TutorialOverlay;
