import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { basicAgent } from "./agents/basic-agent";
import { app } from "../webhook";
import {
  printAgentMessage,
  printLogo,
  printSystemMessage,
  promptUser,
} from "../utils";
import { history } from "./agents/basic-agent";
import { loopState } from "../loop-state";
import fs from "fs";

export const mastra = new Mastra({
  agents: { basicAgent },
  storage: new LibSQLStore({
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  telemetry: {
    enabled: false,
  },
  observability: {
    default: { enabled: false },
  },
});

app.listen(4001, async () => {
  console.log("Webhook service started on port 4001");

  const agent = mastra.getAgentById("basic-agent");
  if (!agent) {
    throw new Error("Basic agent not found");
  }

  printLogo();
  printSystemMessage("Welcome to the Agent to Human Agent Proxy CLI!");

  while (true) {
    let input: string;

    // Check if we're waiting for a webhook response
    if (loopState.isWaitingForResponse()) {
      printSystemMessage("Waiting for human agent to contact you...");
      // Wait for the webhook response
      const humanAsyncInput = await loopState.waitForResponse();
      loopState.setWaitingForResponse(false);
      printSystemMessage(
        `Received response from human agent: ${humanAsyncInput}`
      );
      input = "Response from team member: " + humanAsyncInput;
    } else {
      const userInput = await promptUser(
        "What would you like to ask to the agent?"
      );
      if (userInput.input === "exit") {
        break;
      }
      input = userInput.input;
    }

    history.push({
      role: "user",
      content: input,
    });

    // Generate agent response based on the input (which could be user input or human agent response)
    const result = await agent.generate(history);
    history.push({
      role: "assistant",
      content: result.text,
    });
    printAgentMessage(result.text);

    // fs.writeFileSync(
    //   new Date().toISOString() + "-result.json",
    //   JSON.stringify(result, null, 2)
    // );

    // Check if the "contactHumanAgentTool" has been called in the result
    const contactAgentToolCalledAndSucceeded =
      result.toolResults?.some(
        (tc) =>
          // I called the tool
          tc.payload?.toolName === "contactHumanAgentTool" &&
          typeof tc.payload?.result === "object" &&
          tc.payload?.result !== null &&
          "success" in tc.payload.result &&
          // The tool success is true
          (tc.payload.result as { success?: boolean }).success === true
      ) ?? false;

    if (contactAgentToolCalledAndSucceeded) {
      // Set the state to waiting for response instead of breaking
      loopState.setWaitingForResponse(true);
      // Continue the loop to wait for webhook response
      continue;
    }
  }
});
