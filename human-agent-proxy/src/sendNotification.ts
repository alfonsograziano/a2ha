// server.ts
import { v4 as uuidv4 } from "uuid";
import type { Message, TaskStatusUpdateEvent } from "@a2a-js/sdk";
import { pushNotificationSender, taskStore } from "./agentUtils.ts";
import { eventBusManager } from "./agentUtils.ts";

export const sendNotificationToTask = async (
  taskId: string,
  message: string
) => {
  // Load the task from the store to ensure we have the latest version
  const existingTask = await taskStore.load(taskId);
  if (!existingTask) {
    console.error(`Task ${taskId} not found in store`);
    throw new Error(`Task ${taskId} not found in store`);
  }

  const { id, contextId } = existingTask;

  // Get or create an event bus for this task
  const eventBus = eventBusManager.createOrGetByTaskId(id);

  // Create a user response message
  // Use the answer from fake-slack if provided, otherwise use a default message
  const responseText = message;
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
};
