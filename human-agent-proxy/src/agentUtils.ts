import { v4 as uuidv4 } from "uuid";
import type { AgentCard, Message, Task } from "@a2a-js/sdk";
import type { AgentExecutor, ExecutionEventBus } from "@a2a-js/sdk/server";
import {
  RequestContext,
  DefaultRequestHandler,
  InMemoryTaskStore,
  InMemoryPushNotificationStore,
  DefaultPushNotificationSender,
  DefaultExecutionEventBusManager,
  type TaskStore,
} from "@a2a-js/sdk/server";
import { A2AExpressApp } from "@a2a-js/sdk/server/express";
import { getTeamInformation } from "./utils.ts";
import { contactTeamMember } from "./contactTeamMember.ts";
import type { ContactTeamMember } from "./contactTeamMember.ts";

export const SERVER_PORT = 4000;

// 1. Define your agent's identity card.
const humanAgentProxyCard: AgentCard = {
  name: "Human Agent Proxy",
  description:
    "A proxy agent that allow an AI Agent to interact with a human asynchronously.",
  protocolVersion: "0.3.0",
  version: "0.1.0",
  url: `http://localhost:${SERVER_PORT}/`, // The public URL of your agent server
  skills: [
    {
      id: "get-team-information",
      name: "Get Team Information",
      description:
        "Get information about all the team members, their roles and responsibilities, and their contact information.",
      tags: ["team"],
    },
    {
      id: "contact-team-member",
      name: "Contact Team Member",
      description:
        "Contact a team member via a specific channel. The channel is determined by the team member's capabilities.",
      tags: ["team"],
      inputModes: ["application/json"],
      outputModes: ["application/json"],
    },
  ],
  capabilities: {
    extensions: [],
    pushNotifications: true,
    stateTransitionHistory: false,
    streaming: false,
  },
  defaultInputModes: ["application/json"],
  defaultOutputModes: ["application/json"],
};

// 2. Implement the agent's logic.
class HumanAgentProxyExecutor implements AgentExecutor {
  private taskStore: TaskStore;

  constructor(taskStore: TaskStore) {
    this.taskStore = taskStore;
  }

  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    const { taskId, contextId, userMessage, task } = requestContext;

    const fisrstPart = userMessage.parts[0];
    if (fisrstPart.kind !== "data") {
      eventBus.finished();
      return;
    }

    const requestData = fisrstPart.data;
    if (requestData.skill === "get-team-information") {
      const teamInfo = await getTeamInformation();
      const responseMessage: Message = {
        kind: "message",
        messageId: uuidv4(),
        role: "agent",
        parts: [{ kind: "data", data: teamInfo }],
        contextId: requestContext.contextId,
      };
      eventBus.publish(responseMessage);
      eventBus.finished();
      return;
    }

    if (requestData.skill === "contact-team-member") {
      await contactTeamMember(taskId, requestData.params as ContactTeamMember);

      const initialTask: Task = {
        kind: "task",
        id: taskId,
        contextId: contextId,
        status: {
          state: "submitted",
          timestamp: new Date().toISOString(),
        },
        history: [userMessage],
      };

      eventBus.publish(initialTask);
      eventBus.finished();
      return;
    }
  }

  // cancelTask is not needed for this simple, non-stateful agent.
  cancelTask = async (): Promise<void> => {};
}

// 3. Set up and run the server.
export const taskStore = new InMemoryTaskStore();
export const agentExecutor = new HumanAgentProxyExecutor(taskStore);
export const pushNotificationStore = new InMemoryPushNotificationStore();
export const pushNotificationSender = new DefaultPushNotificationSender(
  pushNotificationStore
);
export const eventBusManager = new DefaultExecutionEventBusManager();
export const requestHandler = new DefaultRequestHandler(
  humanAgentProxyCard,
  taskStore,
  agentExecutor,
  eventBusManager, // eventBusManager for webhook handler
  pushNotificationStore, // custom store
  pushNotificationSender, // custom sender
  undefined // extendedAgentCard (optional)
);

export const appBuilder = new A2AExpressApp(requestHandler);
