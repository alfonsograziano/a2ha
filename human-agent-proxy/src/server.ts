// server.ts
import express from "express";
import { v4 as uuidv4 } from "uuid";
import type {
  AgentCard,
  Message,
  Task,
  TaskStatusUpdateEvent,
} from "@a2a-js/sdk";
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
import bodyParser from "body-parser";
import cors from "cors";

const PORT = 4000;

// 1. Define your agent's identity card.
const humanAgentProxyCard: AgentCard = {
  name: "Human Agent Proxy",
  description:
    "A proxy agent that allow an AI Agent to interact with a human asynchronously.",
  protocolVersion: "0.3.0",
  version: "0.1.0",
  url: `http://localhost:${PORT}/`, // The public URL of your agent server
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
const taskStore = new InMemoryTaskStore();
const agentExecutor = new HumanAgentProxyExecutor(taskStore);
const pushNotificationStore = new InMemoryPushNotificationStore();
const pushNotificationSender = new DefaultPushNotificationSender(
  pushNotificationStore
);
const eventBusManager = new DefaultExecutionEventBusManager();
const requestHandler = new DefaultRequestHandler(
  humanAgentProxyCard,
  taskStore,
  agentExecutor,
  eventBusManager, // eventBusManager for webhook handler
  pushNotificationStore, // custom store
  pushNotificationSender, // custom sender
  undefined // extendedAgentCard (optional)
);

const appBuilder = new A2AExpressApp(requestHandler);
const expressApp = appBuilder.setupRoutes(express());

expressApp.use(bodyParser.json());
expressApp.use(cors());

// Example Express.js webhook endpoint
expressApp.post("/webhook/task-updates", async (req, res) => {
  try {
    const body = req.body;

    let taskId: string;
    let userResponseText: string | undefined;

    // Handle two different formats:
    // 1. Full Task object from push notifications
    // 2. Simple object with taskId and answer from fake-slack
    if (body.kind === "task" && body.id) {
      // Full Task object
      taskId = body.id;
    } else if (body.taskId && body.answer) {
      // Simple format from fake-slack
      taskId = body.taskId;
      userResponseText = body.answer;
    } else {
      console.error("Invalid webhook payload format:", body);
      return res.status(400).json({ error: "Invalid payload format" });
    }

    // Load the task from the store to ensure we have the latest version
    const existingTask = await taskStore.load(taskId);
    if (!existingTask) {
      console.error(`Task ${taskId} not found in store`);
      return res.status(404).json({ error: "Task not found" });
    }

    const { id, contextId } = existingTask;

    // Get or create an event bus for this task
    const eventBus = eventBusManager.createOrGetByTaskId(id);

    // Create a user response message
    // Use the answer from fake-slack if provided, otherwise use a default message
    const responseText = userResponseText || "Task completed successfully!";
    const userResponseMessage: Message = {
      kind: "message",
      messageId: uuidv4(),
      role: "user",
      parts: [
        {
          kind: "data",
          data: {
            text: responseText,
          },
        },
      ],
      contextId: contextId,
      taskId: id,
    };

    // Publish the user response message
    eventBus.publish(userResponseMessage);

    // Update the task to completed
    existingTask.status = {
      state: "completed",
      timestamp: new Date().toISOString(),
    };

    // Add the user response message to history if not already there
    if (
      !existingTask.history?.find(
        (msg) => msg.messageId === userResponseMessage.messageId
      )
    ) {
      existingTask.history = [
        ...(existingTask.history || []),
        userResponseMessage,
      ];
    }

    // Save the updated task
    await taskStore.save(existingTask);

    // Publish a TaskStatusUpdateEvent to notify subscribers
    const statusUpdate: TaskStatusUpdateEvent = {
      kind: "status-update",
      taskId: id,
      contextId: contextId,
      status: {
        state: "completed",
        timestamp: new Date().toISOString(),
      },
      final: true,
    };
    eventBus.publish(statusUpdate);

    // Send push notification
    await pushNotificationSender.send(existingTask);
    // Mark the event bus as finished
    eventBus.finished();

    res.status(200).json({ received: true, taskId: id });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

expressApp.listen(PORT, () => {
  console.log(`🚀 Server started on http://localhost:${PORT}`);
});
