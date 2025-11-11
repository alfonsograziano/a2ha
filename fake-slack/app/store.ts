// Global store for contact requests
export interface ContactRequest {
  from: string;
  to: string;
  message: string;
  taskId: string;
  timestamp: Date;
  sentMessage?: string;
  sentMessageTimestamp?: Date;
}

// Use a global object instead of module-level Map to ensure persistence
// In Next.js, module-level variables can be reset in development mode
const globalStore = (global as any).__fakeSlackStore || new Map<string, ContactRequest>();
if (!(global as any).__fakeSlackStore) {
  (global as any).__fakeSlackStore = globalStore;
}

export function addContactRequest(request: ContactRequest): void {
  globalStore.set(request.taskId, request);
  console.log(`[Store] Added contact request for taskId: ${request.taskId}, total: ${globalStore.size}`);
}

export function getAllContactRequests(): ContactRequest[] {
  const requests = Array.from(globalStore.values());
  console.log(`[Store] Getting all contact requests: ${requests.length}`);
  return requests;
}

export function getContactRequest(taskId: string): ContactRequest | undefined {
  const request = globalStore.get(taskId);
  console.log(`[Store] Getting contact request for taskId: ${taskId}, found: ${!!request}`);
  return request;
}

export function setSentMessage(taskId: string, message: string): void {
  const request = globalStore.get(taskId);
  if (request) {
    request.sentMessage = message;
    request.sentMessageTimestamp = new Date();
    globalStore.set(taskId, request);
    console.log(`[Store] Set sent message for taskId: ${taskId}`);
  } else {
    console.warn(`[Store] Cannot set sent message: contact request not found for taskId: ${taskId}`);
  }
}

