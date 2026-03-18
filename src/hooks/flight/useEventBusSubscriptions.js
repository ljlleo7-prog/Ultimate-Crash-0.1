import { useEffect } from 'react';

export default function useEventBusSubscriptions(eventBus, handlers) {
    useEffect(() => {
        if (!eventBus || !handlers) return;

        const subscriptions = [];

        Object.entries(handlers).forEach(([event, handler]) => {
            if (handler) {
                eventBus.on(event, handler);
                subscriptions.push({ event, handler });
            }
        });

        return () => {
            subscriptions.forEach(({ event, handler }) => {
                eventBus.off(event, handler);
            });
        };
    }, [eventBus, handlers]);
}
