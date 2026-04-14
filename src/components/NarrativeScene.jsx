
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useLanguage } from '../contexts/LanguageContext';
import './NarrativeScene.css';
import { generateNarrative } from '../utils/narrativeGenerator';

const NarrativeScene = ({ onComplete, context }) => {
  const { t } = useLanguage();
  const [narrative, setNarrative] = useState(null);
  const [visibleLines, setVisibleLines] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const timeoutsRef = useRef([]);

  useEffect(() => {
    setNarrative(generateNarrative(context));
  }, []);

  useEffect(() => {
    if (!narrative) return;

    timeoutsRef.current.push(setTimeout(() => setVisibleLines(1), 1000));
    timeoutsRef.current.push(setTimeout(() => setVisibleLines(2), 3500));
    timeoutsRef.current.push(setTimeout(() => setVisibleLines(3), 6500));
    timeoutsRef.current.push(setTimeout(() => setVisibleLines(4), 9500));
    timeoutsRef.current.push(setTimeout(() => setIsReady(true), 11500));

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [narrative]);

  if (!narrative) return <div className="narrative-container" />;

  return (
    <div className="narrative-container">
      <div className="narrative-content">
        <div className={`narrative-line role ${visibleLines >= 1 ? 'visible' : ''}`}>
          <span className="label">{t('ui.narrative_ui.designation')}</span> {narrative.role} {context.callsign || 'UNKNOWN'}
        </div>
        
        <div className={`narrative-line experience ${visibleLines >= 2 ? 'visible' : ''}`}>
          <span className="label">{t('ui.narrative_ui.background')}</span> You are {narrative.experience}
        </div>
        
        <div className={`narrative-line plan ${visibleLines >= 3 ? 'visible' : ''}`}>
          <span className="label">{t('ui.narrative_ui.mission')}</span> {narrative.plan}
        </div>
        
        <div className={`narrative-line difficulty ${visibleLines >= 4 ? 'visible' : ''}`}>
          <span className="label">{t('ui.narrative_ui.intelligence')}</span> {narrative.potentialDifficulty}
        </div>

        <div className={`narrative-action ${isReady ? 'visible' : ''}`}>
          <button className="accept-btn" onClick={onComplete}>
            {t('ui.narrative_ui.accept_assignment')}
          </button>
        </div>
      </div>
    </div>
  );
};

NarrativeScene.propTypes = {
  onComplete: PropTypes.func,
  context: PropTypes.shape({
    callsign: PropTypes.string
  })
};

export default NarrativeScene;
