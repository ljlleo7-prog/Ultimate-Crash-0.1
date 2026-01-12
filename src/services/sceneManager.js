import eventBus from './eventBus.js';

const defaultScenario = {
  id: 'demo-scenario-1',
  name: 'Demo Scenario',
  scenes: [
    {
      id: 'scene-briefing',
      name: 'Initial Briefing',
      durationSeconds: 5,
      physics: {
        mode: 'off'
      }
    },
    {
      id: 'scene-climb-event',
      name: 'Climb Event Window',
      durationSeconds: 20,
      physics: {
        mode: 'window',
        activeUntilSeconds: 15
      }
    },
    {
      id: 'scene-emergency',
      name: 'Emergency Handling',
      durationSeconds: 40,
      physics: {
        mode: 'continuous'
      }
    }
  ]
};

class SceneManager {
  constructor(scenario = defaultScenario) {
    this.scenario = scenario;
    this.currentIndex = 0;
    this.elapsedInScene = 0;
    this.totalElapsed = 0;
    this.status = 'idle';
    this.lastCommand = null;
    this.unsubscribeCommand = eventBus.subscribe('command.input', payload => {
      this.lastCommand = payload;
      eventBus.publish('scene.command.received', {
        scenarioId: this.scenario.id,
        sceneId: this.currentScene().id,
        payload
      });
    });
  }

  currentScene() {
    return this.scenario.scenes[this.currentIndex] || null;
  }

  start() {
    if (!this.currentScene()) {
      return;
    }
    this.status = 'running';
    this.elapsedInScene = 0;
    this.totalElapsed = 0;
    eventBus.publish('scene.started', {
      scenarioId: this.scenario.id,
      scene: this.currentScene()
    });
  }

  nextScene() {
    this.currentIndex += 1;
    this.elapsedInScene = 0;
    if (!this.currentScene()) {
      this.status = 'completed';
      eventBus.publish('scenario.completed', {
        scenarioId: this.scenario.id,
        totalElapsed: this.totalElapsed
      });
      return;
    }
    eventBus.publish('scene.changed', {
      scenarioId: this.scenario.id,
      scene: this.currentScene()
    });
  }

  update(dt) {
    if (this.status !== 'running') {
      return;
    }
    const scene = this.currentScene();
    if (!scene) {
      this.status = 'completed';
      return;
    }
    this.elapsedInScene += dt;
    this.totalElapsed += dt;
    eventBus.publish('scene.tick', {
      scenarioId: this.scenario.id,
      sceneId: scene.id,
      elapsedInScene: this.elapsedInScene,
      totalElapsed: this.totalElapsed
    });
    if (this.elapsedInScene >= scene.durationSeconds) {
      eventBus.publish('scene.ended', {
        scenarioId: this.scenario.id,
        sceneId: scene.id,
        elapsedInScene: this.elapsedInScene
      });
      this.nextScene();
    }
  }

  physicsActive() {
    const scene = this.currentScene();
    if (!scene || !scene.physics) {
      return false;
    }
    if (scene.physics.mode === 'off') {
      return false;
    }
    if (scene.physics.mode === 'continuous') {
      return true;
    }
    if (scene.physics.mode === 'window') {
      const limit = typeof scene.physics.activeUntilSeconds === 'number'
        ? scene.physics.activeUntilSeconds
        : scene.durationSeconds;
      return this.elapsedInScene <= limit;
    }
    return false;
  }

  getState() {
    const scene = this.currentScene();
    return {
      scenarioId: this.scenario.id,
      status: this.status,
      sceneId: scene ? scene.id : null,
      sceneName: scene ? scene.name : null,
      elapsedInScene: this.elapsedInScene,
      totalElapsed: this.totalElapsed,
      physicsActive: this.physicsActive(),
      lastCommand: this.lastCommand
    };
  }
}

const sceneManager = new SceneManager(defaultScenario);

export default sceneManager;

