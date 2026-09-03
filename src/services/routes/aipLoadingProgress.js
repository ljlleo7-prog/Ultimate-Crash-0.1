class AipLoadingProgressEmitter {
  constructor() {
    this.listeners = [];
    this.state = { loading: false, files: {} };
  }

  addEventListener(type, callback) {
    if (type === 'progress') this.listeners.push(callback);
  }

  removeEventListener(type, callback) {
    if (type === 'progress') {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    }
  }

  emit() {
    this.listeners.forEach(cb => cb({ detail: this.state }));
  }

  startFile(fileName, total) {
    this.state.files[fileName] = { loaded: 0, total, percent: 0 };
    this.state.loading = true;
    this.emit();
  }

  updateFile(fileName, loaded) {
    const file = this.state.files[fileName];
    if (file) {
      file.loaded = loaded;
      file.percent = file.total > 0 ? Math.round((loaded / file.total) * 100) : 0;
      this.emit();
    }
  }

  complete() {
    this.state.loading = false;
    this.emit();
  }
}

export const aipLoadingProgress = new AipLoadingProgressEmitter();
