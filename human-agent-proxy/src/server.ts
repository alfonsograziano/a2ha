import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { appBuilder } from "./agentUtils.ts";
import { sendNotificationToTask } from "./sendNotification.ts";
import { SERVER_PORT } from "./agentUtils.ts";
import { availableConnectors } from "./connectors/index.ts";

const expressApp = appBuilder.setupRoutes(express());

expressApp.use(bodyParser.json());
expressApp.use(cors());

expressApp.listen(SERVER_PORT, async () => {
  console.log(`🚀 Server started on http://localhost:${SERVER_PORT}`);

  // Start email listener
  console.log("📧 Starting email listener...");
  availableConnectors.email.startEmailListener(sendNotificationToTask);
  console.log("Email listener started. Waiting for incoming emails...");

  // Start fake-slack listener
  if (availableConnectors["fake-slack"]) {
    console.log("💬 Starting fake-slack listener...");
    await availableConnectors["fake-slack"].startFakeSlackListener(
      expressApp,
      sendNotificationToTask
    );
    console.log("Fake-slack listener started. Waiting for webhook messages...");
  }

  console.log("Press Ctrl+C to stop.");
});
