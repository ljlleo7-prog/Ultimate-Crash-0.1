
import React, { useState, useEffect } from 'react';
import './NarrativeScene.css';
import { generateNarrative } from '../utils/narrativeGenerator';
import { useLanguage } from '../contexts/LanguageContext';

const NarrativeScene = ({ onComplete, context }) => {
  const { t } = useLanguage();
  const [narrative, setNarrative] = useState(null);
  const [visibleLines, setVisibleLines] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setNarrative(generateNarrative(context, t));
  }, []);

  useEffect(() => {
    if (!narrative) return;
    
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
  }, [narrative]);

  if (!narrative) return <div className="narrative-container" />;

  return (
    <div className="narrative-container">
      <div className="narrative-content">
        <div className={`narrative-line role ${visibleLines >= 1 ? 'visible' : ''}`}>
          <span className="label">{t('narrative_scene.designation')}</span> {narrative.role} {context.callsign || 'UNKNOWN'}
        </div>
        
        <div className={`narrative-line experience ${visibleLines >= 2 ? 'visible' : ''}`}>
          <span className="label">{t('narrative_scene.background')}</span> {t('narrative_scene.you_are')} {narrative.experience}
        </div>
        
        <div className={`narrative-line plan ${visibleLines >= 3 ? 'visible' : ''}`}>
          <span className="label">{t('narrative_scene.mission')}</span> {narrative.plan}
        </div>
        
        <div className={`narrative-line difficulty ${visibleLines >= 4 ? 'visible' : ''}`}>
          <span className="label">{t('narrative_scene.intelligence')}</span> {narrative.potentialDifficulty}
        </div>

        <div className={`narrative-action ${isReady ? 'visible' : ''}`}>
          <button className="accept-btn" onClick={onComplete}>
            {t('narrative_scene.accept')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NarrativeScene;
