import { EmailConnector } from "./email/EmailConnector";
import { FakeSlackConnector } from "./fake-slack/FakeSlackConnector";

const emailConnector = new EmailConnector(
  {
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT!),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
  {
    host: process.env.IMAP_HOST!,
    port: parseInt(process.env.IMAP_PORT!),
    user: process.env.IMAP_USER!,
    password: process.env.IMAP_PASS!,
    tls: process.env.IMAP_TLS !== "false",
    tlsOptions: {
      rejectUnauthorized: false, // Allow self-signed certificates (for testing)
    },
  }
);

const fakeSlackConnector = new FakeSlackConnector({
  apiUrl:
    process.env.FAKE_SLACK_API_URL ||
    "http://localhost:5000/api/contact-team-member",
});

export const availableConnectors = {
  email: emailConnector,
  "fake-slack": fakeSlackConnector,
};
