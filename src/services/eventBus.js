const listeners = new Map();

function subscribe(type, handler) {
  if (!listeners.has(type)) {
    listeners.set(type, new Set());
  }
  const set = listeners.get(type);
  set.add(handler);
  return () => {
    set.delete(handler);
    if (set.size === 0) {
      listeners.delete(type);
    }
  };
}

function publish(type, payload) {
  const set = listeners.get(type);
  if (!set || set.size === 0) {
    return;
  }
  for (const handler of set) {
    try {
      handler(payload);
    } catch (error) {
      console.error('eventBus handler error', { type, error });
    }
  }
}

function clear() {
  listeners.clear();
}

const eventBus = {
  subscribe,
  publish,
  clear
};

export default eventBus;

