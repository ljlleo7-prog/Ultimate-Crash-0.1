import React, { useMemo, useState } from 'react';
import { CHALLENGE_CATEGORIES } from '../data/challengeCatalog';
import './TutorialHub.css';

const ChallengesHub = ({ challenges = [], onLaunchChallenge, onBack }) => {
  const [activeCategory, setActiveCategory] = useState(CHALLENGE_CATEGORIES[0]?.id || 'landing');

  const visibleChallenges = useMemo(
    () => challenges.filter((challenge) => challenge.category === activeCategory),
    [challenges, activeCategory]
  );

  const activeCategoryMeta = CHALLENGE_CATEGORIES.find((category) => category.id === activeCategory);

  return (
    <div className="tutorial-hub-page">
      <div className="tutorial-hub-shell">
        <div className="tutorial-hub-header">
          <button className="tutorial-back-btn" onClick={onBack}>← Back</button>
          <div>
            <p className="tutorial-hub-kicker">Challenge Board</p>
            <h1>Challenges</h1>
            <p className="tutorial-hub-subtitle">
              Pure fun, no hand-holding. These scenarios lock difficulty high, remove guides, and test systems knowledge or raw gut feel.
            </p>
          </div>
        </div>

        <div className="tutorial-hub-content">
          <aside className="tutorial-category-nav">
            {CHALLENGE_CATEGORIES.map((category) => (
              <button
                key={category.id}
                className={`tutorial-category-btn ${category.id === activeCategory ? 'active' : ''}`}
                onClick={() => setActiveCategory(category.id)}
              >
                <span className="tutorial-category-label">{category.label}</span>
                <span className="tutorial-category-desc">{category.description}</span>
              </button>
            ))}
          </aside>

          <section className="tutorial-list-panel">
            <div className="tutorial-list-header">
              <div>
                <h2>{activeCategoryMeta?.label || 'Challenges'}</h2>
                <p>{activeCategoryMeta?.description}</p>
              </div>
              <div className="tutorial-list-badge">{visibleChallenges.length} challenge{visibleChallenges.length === 1 ? '' : 's'}</div>
            </div>

            <div className="tutorial-card-grid">
              {visibleChallenges.map((challenge) => (
                <article key={challenge.id} className="tutorial-card">
                  <div className="tutorial-card-topline">
                    <span className="tutorial-chip">{challenge.difficulty}</span>
                    <span className="tutorial-chip mode info">{challenge.challengeMode === 'systems' ? 'Systems' : challenge.challengeMode === 'failures' ? 'Failure' : 'Gut Check'}</span>
                  </div>

                  <h3>{challenge.title}</h3>
                  <p className="tutorial-card-summary">{challenge.summary}</p>

                  <div className="tutorial-card-meta">
                    <span>{challenge.duration}</span>
                    <span>{challenge.departureCode} → {challenge.arrivalCode}</span>
                  </div>

                  <div className="tutorial-topic-list">
                    <span className="tutorial-topic-tag">No Guides</span>
                    <span className="tutorial-topic-tag">{challenge.launchConfig?.difficulty?.toUpperCase()}</span>
                    {challenge.launchConfig?.restrictions?.autopilotForbidden && (
                      <span className="tutorial-topic-tag">No AP</span>
                    )}
                    {challenge.launchConfig?.restrictions?.instrumentsOnly && (
                      <span className="tutorial-topic-tag">Instruments Only</span>
                    )}
                  </div>

                  <button className="tutorial-launch-btn" onClick={() => onLaunchChallenge(challenge)}>
                    Start Challenge
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ChallengesHub;
