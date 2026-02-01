
import React, { useState, useEffect } from 'react';
import './NarrativeScene.css';
import { generateNarrativeIndices } from '../utils/narrativeGenerator';
import { useLanguage } from '../contexts/LanguageContext';

const NarrativeScene = ({ onComplete, context }) => {
  const { t } = useLanguage();
  const [narrativeIndices, setNarrativeIndices] = useState(null);
  const [visibleLines, setVisibleLines] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setNarrativeIndices(generateNarrativeIndices(context));
  }, []);

  useEffect(() => {
    if (!narrativeIndices) return;
    
    // Sequence the text appearance
    const sequence = async () => {
      // Line 1: Role
      await new Promise(r => setTimeout(r, 1000));
      setVisibleLines(1);
      
      // Line 2: Experience
      await new Promise(r => setTimeout(r, 2500));
      setVisibleLines(2);
      
      // Line 3: Plan
      await new Promise(r => setTimeout(r, 3000));
      setVisibleLines(3);
      
      // Line 4: Difficulty
      await new Promise(r => setTimeout(r, 3000));
      setVisibleLines(4);
      
      // Ready button
      await new Promise(r => setTimeout(r, 2000));
      setIsReady(true);
    };
    
    sequence();
  }, [narrativeIndices]);

  if (!narrativeIndices) return <div className="narrative-container" />;

  // Resolve translations based on indices
  const roles = t('narrative.roles') || [];
  const roleText = roles[narrativeIndices.roleIndex] || 'Captain';
  
  const diffKey = narrativeIndices.diffKey;
  const experiencePool = (t('narrative.experience') || {})[diffKey] || [];
  const experienceText = experiencePool[narrativeIndices.experienceIndex] || 'Ready';

  const planPool = t('narrative.flight_plan') || [];
  const planFunc = planPool[narrativeIndices.planIndex];
  const planText = typeof planFunc === 'function' 
    ? planFunc(context.departure?.name || 'Departure', context.arrival?.name || 'Arrival', context.pax || 150)
    : 'Flight plan filed.';

  const difficultyPool = (t('narrative.difficulty_desc') || {})[diffKey] || [];
  const difficultyText = difficultyPool[narrativeIndices.difficultyIndex] || 'Good luck.';

  return (
    <div className="narrative-container">
      <div className="narrative-content">
        <div className={`narrative-line role ${visibleLines >= 1 ? 'visible' : ''}`}>
          <span className="label">{t('narrative.labels.designation')}</span> {roleText} {context.callsign || 'UNKNOWN'}
        </div>
        
        <div className={`narrative-line experience ${visibleLines >= 2 ? 'visible' : ''}`}>
          <span className="label">{t('narrative.labels.background')}</span> {t('common.you_are', { context: experienceText }) || `You are ${experienceText}`}
        </div>
        
        <div className={`narrative-line plan ${visibleLines >= 3 ? 'visible' : ''}`}>
          <span className="label">{t('narrative.labels.mission')}</span> {planText}
        </div>
        
        <div className={`narrative-line difficulty ${visibleLines >= 4 ? 'visible' : ''}`}>
          <span className="label">{t('narrative.labels.intelligence')}</span> {difficultyText}
        </div>

        <div className={`narrative-action ${isReady ? 'visible' : ''}`}>
          <button className="accept-btn" onClick={onComplete}>
            {t('narrative.labels.accept')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NarrativeScene;
