import { useEffect } from 'react';

export default function useEventBusSubscriptions(eventBus, handlers) {
    useEffect(() => {
        if (!eventBus || !handlers) return;

        const cleanups = [];

        Object.entries(handlers).forEach(([event, handler]) => {
            if (!handler) return;

            if (typeof eventBus.subscribe === 'function') {
                const unsubscribe = eventBus.subscribe(event, handler);
                if (typeof unsubscribe === 'function') {
                    cleanups.push(unsubscribe);
                }
                return;
            }

            if (typeof eventBus.on === 'function' && typeof eventBus.off === 'function') {
                eventBus.on(event, handler);
                cleanups.push(() => eventBus.off(event, handler));
            }
        });

        return () => {
            cleanups.forEach(cleanup => cleanup());
        };
    }, [eventBus, handlers]);
}
