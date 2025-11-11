import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import {
  contactHumanAgentTool,
  getTeamInformationTool,
} from "../tools/team-tools";
import type { MessageInput } from "@mastra/core/agent/message-list";

export const basicAgent = new Agent({
  id: "basic-agent",
  name: "Basic Agent",
  instructions: `
Before contacting any team member, always check who is available using the appropriate tool. Never assume or guess team availability — you must call the tool to retrieve the list of available members first.

When you decide to contact a human agent:
- Include clear context in your message. Explain what you are trying to accomplish and why you are reaching out.
- Combine all your requests into a single, well-structured message so the human can provide a complete answer in one reply.
- Write as if the human may take hours or days to respond, so make your message as comprehensive and unambiguous as possible.

Once the human agent responds:
- Use their answer to continue the conversation with the user.
- Do not keep the human agent in the loop after the initial exchange — treat them purely as an external source of information or confirmation.

Your goals are:
- Minimize the number of human interactions needed to complete the task.
- Ensure every contact request is clear, contextual, and complete.
- Maintain a smooth, user-centered conversation after receiving the human's input.

IMPORTANT: You cannot reach out to more than a team member at a time. If you need to reach out to multiple team members, you need to send a message to the first one, wait for the response, and then send a message to the second one, and so on, otherwise the system will break.
`,
  model: "openai/gpt-4o-mini",
  tools: {
    contactHumanAgentTool,
    getTeamInformationTool,
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db", // path is relative to the .mastra/output directory
    }),
  }),
});

// Shared history of the agent to be used by CLI and webhook
export const history: MessageInput[] = [];
