import React, { useMemo, useState } from 'react';
import { TUTORIAL_CATEGORIES } from '../data/tutorialCatalog';
import './TutorialHub.css';

const TutorialHub = ({ tutorials = [], onLaunchTutorial, onBack }) => {
  const [activeCategory, setActiveCategory] = useState(TUTORIAL_CATEGORIES[0]?.id || 'basics');

  const visibleTutorials = useMemo(
    () => tutorials.filter((tutorial) => tutorial.category === activeCategory),
    [tutorials, activeCategory]
  );

  const activeCategoryMeta = TUTORIAL_CATEGORIES.find((category) => category.id === activeCategory);

  return (
    <div className="tutorial-hub-page">
      <div className="tutorial-hub-shell">
        <div className="tutorial-hub-header">
          <button className="tutorial-back-btn" onClick={onBack}>← Back</button>
          <div>
            <p className="tutorial-hub-kicker">Training Center</p>
            <h1>Tutorial Hub</h1>
            <p className="tutorial-hub-subtitle">
              Launch guided lessons and practice scenarios for radio, autopilot, approaches, systems, and more.
            </p>
          </div>
        </div>

        <div className="tutorial-hub-content">
          <aside className="tutorial-category-nav">
            {TUTORIAL_CATEGORIES.map((category) => (
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
                <h2>{activeCategoryMeta?.label || 'Tutorials'}</h2>
                <p>{activeCategoryMeta?.description}</p>
              </div>
              <div className="tutorial-list-badge">{visibleTutorials.length} lesson{visibleTutorials.length === 1 ? '' : 's'}</div>
            </div>

            <div className="tutorial-card-grid">
              {visibleTutorials.map((tutorial) => (
                <article key={tutorial.id} className="tutorial-card">
                  <div className="tutorial-card-topline">
                    <span className="tutorial-chip">{tutorial.difficulty}</span>
                    <span className={`tutorial-chip mode ${tutorial.guidanceMode}`}>{tutorial.guidanceMode === 'guided' ? 'Guided' : 'Practice'}</span>
                  </div>

                  <h3>{tutorial.title}</h3>
                  <p className="tutorial-card-summary">{tutorial.summary}</p>

                  <div className="tutorial-card-meta">
                    <span>{tutorial.duration}</span>
                    <span>{tutorial.departureCode} → {tutorial.arrivalCode}</span>
                  </div>

                  <div className="tutorial-topic-list">
                    {tutorial.topics.map((topic) => (
                      <span key={topic} className="tutorial-topic-tag">{topic}</span>
                    ))}
                  </div>

                  <button className="tutorial-launch-btn" onClick={() => onLaunchTutorial(tutorial)}>
                    Start Tutorial
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

export default TutorialHub;
