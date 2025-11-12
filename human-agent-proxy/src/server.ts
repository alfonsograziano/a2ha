import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { appBuilder } from "./agentUtils.ts";
import { sendNotificationToTask } from "./sendNotification.ts";
import { SERVER_PORT } from "./agentUtils.ts";
import { setupEmailListener } from "./emailUtils.ts";

const expressApp = appBuilder.setupRoutes(express());

expressApp.use(bodyParser.json());
expressApp.use(cors());

// Example Express.js webhook endpoint
expressApp.post("/webhook/task-updates", async (req, res) => {
  try {
    const body = req.body;

    const { taskId: taskIdFromBody, answer: userResponseTextFromBody } = body;

    if (!taskIdFromBody || !userResponseTextFromBody) {
      return res.status(400).json({ error: "Invalid payload format" });
    }

    await sendNotificationToTask(taskIdFromBody, userResponseTextFromBody);

    return res.status(200).json({ received: true, taskId: taskIdFromBody });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return res.status(500).json({ error: error.message });
  }
});

expressApp.listen(SERVER_PORT, () => {
  console.log(`🚀 Server started on http://localhost:${SERVER_PORT}`);

  // Start email listener
  console.log("📧 Starting email listener...");
  setupEmailListener();
});
