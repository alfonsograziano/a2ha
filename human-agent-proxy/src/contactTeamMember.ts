import { z } from "zod";
import { getTeamInformation } from "./utils.ts";

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
    return contactTeamMemberByFakeSlack(taskId, contactTeamMember);
  }
};

const contactTeamMemberByFakeSlack = async (
  taskId: string,
  contactTeamMember: ContactTeamMember
) => {
  const FAKE_SLACK_API_URL = "http://localhost:5000/api/contact-team-member";
  const response = await fetch(FAKE_SLACK_API_URL, {
    method: "POST",
    body: JSON.stringify({
      from: "@human-agent-proxy",
      to: contactTeamMember.contactInfo,
      message: contactTeamMember.message,
      taskId: taskId,
    }),
  });
  return response.json();
};
