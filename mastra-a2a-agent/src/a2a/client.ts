import { A2AClient } from "@a2a-js/sdk/client";
import type {
  Message,
  SendMessageSuccessResponse,
  TaskQueryParams,
  Task,
} from "@a2a-js/sdk";
import { v4 as uuidv4 } from "uuid";
import { team } from "../types";

let a2aClient: Agent2HumanAgentClient | null = null;
let DEFAULT_AGENT_CARD_URL =
  "http://localhost:4000/.well-known/agent-card.json";

export const buildOrGetA2aClient = async (
  agentCardUrl: string = DEFAULT_AGENT_CARD_URL
) => {
  if (!a2aClient) {
    a2aClient = new Agent2HumanAgentClient(
      await A2AClient.fromCardUrl(agentCardUrl)
    );
  }
  return a2aClient;
};

class Agent2HumanAgentClient {
  private client: A2AClient;
  constructor(client: A2AClient) {
    this.client = client;
  }
  async getTeamInformation() {
    const teamInfo = await this.client.sendMessage({
      message: {
        messageId: uuidv4(),
        role: "user",
        parts: [
          {
            kind: "data",
            data: {
              skill: "get-team-information",
            },
          },
        ],
        kind: "message",
      },
    });

    const result = (teamInfo as SendMessageSuccessResponse).result as Message;

    const firstPart = result.parts[0];
    if (firstPart.kind === "data") {
      const data = firstPart.data;
      return team.parse(data);
    }
    throw new Error("Team info not found");
  }

  async getTask(params: TaskQueryParams) {
    return this.client.getTask(params);
  }
  async contactHumanAgent({
    contactInfo,
    message,
    channel,
  }: {
    contactInfo: string;
    message: string;
    channel: string;
  }) {
    try {
      const result = await this.client.sendMessage({
        message: {
          messageId: uuidv4(),
          role: "user",
          kind: "message",
          parts: [
            {
              kind: "data",
              data: {
                skill: "contact-team-member",
                params: { contactInfo, message, channel },
              },
            },
          ],
        },
        configuration: {
          blocking: true,
          acceptedOutputModes: ["text/plain"],
          pushNotificationConfig: {
            url: "http://localhost:4001/webhook/task-updates",
            token: "skibidiboppi", // Optional authentication token
          },
        },
      });

      // Use the SDK's type guard to check for errors
      if (this.client.isErrorResponse(result)) {
        return {
          success: false,
          error: result.error.message,
        };
      }

      // Also check for error property directly as a fallback
      if ("error" in result && result.error) {
        return {
          success: false,
          error: (result.error as any).message || String(result.error),
        };
      }

      // // Check if the result is a Task with failed status
      if ("result" in result) {
        const taskResult = result.result as unknown as Task;
        if (
          taskResult &&
          taskResult.kind === "task" &&
          taskResult.status?.state === "failed"
        ) {
          // Extract error message from various possible locations
          let errorMessage = "Task execution failed";

          // Check status.message (SDK might put it here)
          if ((taskResult.status as any)?.message?.parts?.[0]?.text) {
            errorMessage = (taskResult.status as any).message.parts[0].text;
          }

          return {
            success: false,
            error: errorMessage,
          };
        }
      }

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}
