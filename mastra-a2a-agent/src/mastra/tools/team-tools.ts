import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { buildOrGetA2aClient } from "../../a2a/client";
import { team } from "../../types";
import { Team } from "../../types";
import { printToolMessage } from "../../utils";

export const contactHumanAgentTool = createTool({
  id: "contact-human-agent",
  description: "Send a contact request to a human agent available in the team",
  inputSchema: z.object({
    contactInfo: z
      .string()
      .describe("The contact information of the team member"),
    message: z.string().describe("The message to send to the agent"),
    channel: z
      .string()
      .describe(
        "The channel to contact the agent on, based on the agent's capabilities"
      ),
  }),
  outputSchema: z.object({
    success: z.boolean().describe("Whether the contact request was successful"),
    error: z
      .string()
      .nullable()
      .describe("The error message if the contact request failed"),
    result: z.string().optional().describe("The result of the contact request"),
  }),
  execute: async ({ context }) => {
    printToolMessage(
      `Tool called: contact-human-agent. Contacting human agent on ${context.channel} at ${context.contactInfo}.`
    );
    const a2aClient = await buildOrGetA2aClient();

    return a2aClient.contactHumanAgent({
      contactInfo: context.contactInfo,
      message: context.message,
      channel: context.channel,
    });
  },
});

export const getTeamInformationTool = createTool({
  id: "get-team-information",
  description:
    "Get information about the team, how they can be contacted and their capabilities.",
  inputSchema: z.object({}),
  outputSchema: team,
  execute: async (): Promise<Team> => {
    printToolMessage(`Tool called: get-team-information.`);
    const a2aClient = await buildOrGetA2aClient();
    return a2aClient.getTeamInformation();
  },
});
