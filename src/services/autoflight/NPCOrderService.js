let nextOrderId = 1;

export const NPCOrderStatus = {
  QUEUED: 'queued',
  ACKNOWLEDGED: 'acknowledged',
  EXECUTING: 'executing',
  BLOCKED: 'blocked',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

export function createNPCOrder(intent) {
  return {
    id: `npc-order-${nextOrderId++}`,
    createdAt: Date.now(),
    status: NPCOrderStatus.QUEUED,
    intent
  };
}

export function transitionNPCOrder(order, status, patch = {}) {
  return {
    ...order,
    ...patch,
    status,
    updatedAt: Date.now()
  };
}

export function summarizeNPCOrder(order) {
  const intent = order?.intent || {};
  if (intent.type === 'ORDER_ACTION') {
    return `${intent.action}:${intent.value ?? intent.target ?? ''}`;
  }
  if (intent.type === 'RUN_CHECKLIST') {
    return `checklist:${intent.checklistId}`;
  }
  if (intent.type === 'REQUEST_RADIO_CALL') {
    return `radio:${intent.templateId}`;
  }
  return intent.type || 'unknown';
}
