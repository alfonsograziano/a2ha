import type { Express } from "express";
import type { FakeSlackConfig } from "./types.js";
import { validateFakeSlackConfig } from "./schemas.js";
import { ContactTeamMember } from "../../contactTeamMember.js";

/**
 * Callback function signature for fake-slack listener
 * @param taskId - Extracted task ID from webhook payload
 * @param messageContent - Message content from webhook payload
 */
export type FakeSlackListenerCallback = (
  taskId: string,
  messageContent: string
) => void | Promise<void>;

/**
 * FakeSlackConnector class that encapsulates fake-slack configuration
 * and provides message sending and webhook listening capabilities
 */
export class FakeSlackConnector {
  private config: FakeSlackConfig;
  private isListening: boolean = false;
  private expressApp: Express | null = null;
  private logEnabled: boolean = false;

  /**
   * Creates a new FakeSlackConnector instance with validated configuration
   * @param config - FakeSlack configuration
   * @param logEnabled - Whether to enable logging (default: false)
   * @throws Error if configuration validation fails
   */
  constructor(config: unknown, logEnabled: boolean = false) {
    // Validate configuration using Zod schema
    this.config = validateFakeSlackConfig(config);
    this.logEnabled = logEnabled;
  }

  /**
   * Sends a message via fake-slack API
   * @param taskId - Task identifier to include in message
   * @param contactTeamMember - Contact team member information
   * @param options - Optional record of unknown type for additional options
   * @returns Promise that resolves when message is sent
   * @throws Error if message sending fails
   */
  async sendMessage(
    taskId: string,
    contactTeamMember: ContactTeamMember,
    options?: Record<string, unknown>
  ): Promise<void> {
    try {
      const response = await fetch(this.config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "@human-agent-proxy",
          to: contactTeamMember.contactInfo,
          message: contactTeamMember.message,
          taskId: taskId,
          ...(options || {}),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `FakeSlack API returned error: ${response.status} ${errorText}`
        );
      }

      const result = await response.json();

      // Log success
      this.log("info", `Message sent successfully for task ${taskId}`, {
        result,
      });
    } catch (error) {
      // Enhanced error handling for API failures
      if (error instanceof Error) {
        throw new Error(
          `Failed to send message for task ${taskId}: ${error.message}`
        );
      }
      throw new Error(
        `Failed to send message for task ${taskId}: Unknown error`
      );
    }
  }

  /**
   * Starts listening for incoming webhook messages and processes them
   * Injects a webhook route into the provided Express app
   * @param expressApp - Express application instance to inject the webhook route
   * @param callback - Callback function to invoke when a valid task ID is found in a webhook payload
   * @throws Error if listener cannot be started
   */
  async startFakeSlackListener(
    expressApp: Express,
    callback: FakeSlackListenerCallback
  ): Promise<void> {
    if (this.isListening) {
      throw new Error("FakeSlack listener is already running");
    }

    try {
      this.expressApp = expressApp;
      this.isListening = true;

      // Inject webhook route into Express app
      expressApp.post("/webhook/task-updates", async (req, res) => {
        try {
          const body = req.body;

          const { taskId: taskIdFromBody, answer: userResponseTextFromBody } =
            body;

          if (!taskIdFromBody || !userResponseTextFromBody) {
            return res.status(400).json({ error: "Invalid payload format" });
          }

          this.log("info", `Received webhook for task ${taskIdFromBody}`, {
            taskId: taskIdFromBody,
            messageLength: userResponseTextFromBody.length,
          });

          // Invoke callback with taskId and message content
          await Promise.resolve(
            callback(taskIdFromBody, userResponseTextFromBody)
          );

          this.log(
            "info",
            `Successfully processed webhook for task ${taskIdFromBody}`
          );

          return res
            .status(200)
            .json({ received: true, taskId: taskIdFromBody });
        } catch (error) {
          this.log("error", "Error processing webhook", {
            error: error instanceof Error ? error.message : "Unknown error",
          });
          return res.status(500).json({
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      });

      this.log("info", "FakeSlack webhook listener started");
    } catch (error) {
      this.isListening = false;
      if (error instanceof Error) {
        throw new Error(
          `Failed to start fake-slack listener: ${error.message}`
        );
      }
      throw new Error("Failed to start fake-slack listener: Unknown error");
    }
  }

  /**
   * Stops the fake-slack listener
   * Note: This doesn't remove the route from Express, but marks the listener as stopped
   */
  stopFakeSlackListener(): void {
    if (this.isListening) {
      this.isListening = false;
      this.expressApp = null;
      this.log("info", "FakeSlack listener stopped");
    }
  }

  /**
   * Logs messages with different levels
   * @param level - Log level (debug, info, warn, error)
   * @param message - Log message
   * @param metadata - Optional metadata to include in log
   */
  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.logEnabled) {
      return;
    }
    // Use console methods based on log level
    switch (level) {
      case "debug":
        console.debug(`[FakeSlackConnector] ${message}`, metadata || "");
        break;
      case "info":
        console.info(`[FakeSlackConnector] ${message}`, metadata || "");
        break;
      case "warn":
        console.warn(`[FakeSlackConnector] ${message}`, metadata || "");
        break;
      case "error":
        console.error(`[FakeSlackConnector] ${message}`, metadata || "");
        break;
    }
  }
}
