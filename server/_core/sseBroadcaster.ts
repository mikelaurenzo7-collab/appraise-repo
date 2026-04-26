/**
 * SSE Broadcaster — decoupled from server index to avoid circular dependencies
 *
 * Usage: analysisJob calls broadcastAnalysisUpdate() which stores messages
 * in a queue. The SSE endpoint in server/index.ts reads from this queue.
 */

type SSEMessage = { event: string; data: unknown; timestamp: number };

const messageQueues = new Map<number, SSEMessage[]>();
const maxQueueSize = 100;
export type { SSEMessage };

/**
 * Broadcast an analysis update. Stores in memory queue for SSE clients to pick up.
 */
export function broadcastAnalysisUpdate(submissionId: number, event: string, data: unknown): void {
  if (!messageQueues.has(submissionId)) {
    messageQueues.set(submissionId, []);
  }
  const queue = messageQueues.get(submissionId)!;
  queue.push({ event, data, timestamp: Date.now() });
  // Prune old messages
  if (queue.length > maxQueueSize) {
    queue.splice(0, queue.length - maxQueueSize);
  }
}

/**
 * Get all pending messages for a submission (and clear them).
 */
export function flushMessages(submissionId: number): SSEMessage[] {
  const queue = messageQueues.get(submissionId);
  if (!queue || queue.length === 0) return [];
  const messages = [...queue];
  queue.length = 0;
  return messages;
}

/**
 * Peek messages without clearing (for polling fallback).
 */
export function peekMessages(submissionId: number): SSEMessage[] {
  return messageQueues.get(submissionId) || [];
}

/**
 * Clean up old queues (call periodically).
 */
export function cleanupOldQueues(maxAgeMs: number = 30 * 60 * 1000): void {
  const now = Date.now();
  Array.from(messageQueues.entries()).forEach(([id, queue]) => {
    const lastMessage = queue[queue.length - 1];
    if (lastMessage && now - lastMessage.timestamp > maxAgeMs) {
      messageQueues.delete(id);
    }
  });
}
