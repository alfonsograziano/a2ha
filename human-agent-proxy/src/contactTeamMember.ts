import { z } from "zod";
import { getTeamInformation } from "./utils.ts";
import { availableConnectors } from "./connectors/index.ts";

export const contactTeamMemberSchema = z.object({
  channel: z.string().describe("The channel to contact the team member on"),
  contactInfo: z
    .string()
    .describe("The contact information of the team member"),
  message: z.string().describe("The message to send to the team member"),
});

export type ContactTeamMember = z.infer<typeof contactTeamMemberSchema>;

export const contactTeamMember = async (
  taskId: string,
  contactTeamMember: ContactTeamMember
) => {
  // Validate if this team member is available to be contacted via the channel
  const teamInfo = await getTeamInformation();
  const team = teamInfo.team || [];

  const teamMemberExists = team.some((member: any) => {
    const channelExists = member.channels?.some(
      (channel: any) =>
        channel.type === contactTeamMember.channel &&
        channel.contactInfo === contactTeamMember.contactInfo
    );
    return channelExists;
  });

  if (!teamMemberExists) {
    throw new Error(
      `No team member found with channel "${contactTeamMember.channel}" and contact info "${contactTeamMember.contactInfo}"`
    );
  }

  if (contactTeamMember.channel === "fake-slack") {
    return availableConnectors["fake-slack"]?.sendMessage(
      taskId,
      contactTeamMember
    );
  }

  if (contactTeamMember.channel === "email") {
    return availableConnectors.email.sendEmail(taskId, contactTeamMember);
  }

  throw new Error(
    "Handler for channel not implemented: " +
      contactTeamMember.channel +
      " please use a different contact channel if available"
  );
};
