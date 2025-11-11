import { EventEmitter } from "events";

// Shared state for managing the main loop and webhook communication
export class LoopState extends EventEmitter {
  private waitingForResponse: boolean = false;
  private pendingResponse: string | null = null;

  // Signal that we're waiting for a webhook response
  setWaitingForResponse(waiting: boolean) {
    this.waitingForResponse = waiting;
  }

  isWaitingForResponse(): boolean {
    return this.waitingForResponse;
  }

  // Set a response from the webhook
  setResponse(response: string) {
    this.pendingResponse = response;
    this.emit("response", response);
  }

  // Get and clear the pending response
  getAndClearResponse(): string | null {
    const response = this.pendingResponse;
    this.pendingResponse = null;
    return response;
  }

  // Wait for a response (returns a promise that resolves when response arrives)
  waitForResponse(): Promise<string> {
    return new Promise((resolve) => {
      if (this.pendingResponse) {
        const response = this.getAndClearResponse();
        resolve(response!);
        return;
      }

      this.once("response", (response: string) => {
        resolve(response);
      });
    });
  }
}

export const loopState = new LoopState();
