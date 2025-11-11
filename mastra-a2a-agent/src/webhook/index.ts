import express from "express";
import { buildOrGetA2aClient } from "../a2a/client";
import bodyParser from "body-parser";
import { Part, Task } from "@a2a-js/sdk";
import { loopState } from "../loop-state";

export const app = express();

app.use(bodyParser.json());

app.post("/webhook/task-updates", async (req, res) => {
  const task = req.body;

  // Verify the token if provided
  const token = req.headers["x-a2a-notification-token"];
  if (token !== "skibidiboppi") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const client = await buildOrGetA2aClient();
    const result = await client.getTask({ id: task.id, historyLength: 10 });

    // Check if the response is an error or success
    if ("error" in result) {
      console.error("Error response from getTask:", result.error);
    } else if ("result" in result) {
      const taskFromAPI = result.result as unknown as Task;

      // Extract the response from the task history
      // The human agent response is added as a user message in the task history
      let responseText: string | null = null;

      if (taskFromAPI.history && taskFromAPI.history.length > 0) {
        // Find the latest user message (human agent response)
        const userMessages = taskFromAPI.history.filter(
          (msg) => msg.role === "user"
        );

        if (userMessages.length > 0) {
          // Get the most recent user message
          const latestUserMessage = userMessages[userMessages.length - 1];

          // Extract text from the message parts
          const responsePart = latestUserMessage.parts.find(
            (part: Part) => part.kind === "data"
          );

          if (responsePart?.data) {
            const responseData = responsePart.data;
            responseText =
              typeof responseData === "object" &&
              responseData !== null &&
              "text" in responseData
                ? String(responseData.text)
                : responseData
                  ? String(responseData)
                  : null;
          }
        }
      }

      // Pass this response to the agent to continue the conversation
      // Then resume the agent main loop in the CLI
      // Only process if we're waiting for a response
      if (responseText && loopState.isWaitingForResponse()) {
        loopState.setResponse(responseText);
      } else if (responseText) {
        // console.log(
        //   `Received response from human agent, but not waiting: ${responseText}`
        // );
      } else {
        console.warn("No response text found in task history");
      }
    }
  } catch (error) {
    console.error("Error fetching task:", error);
  }

  res.status(200).json({ received: true });
});
