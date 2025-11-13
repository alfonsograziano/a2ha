import { EmailConnector, type EmailListenerCallback } from "./email/index.js";
import { v4 as uuidv4 } from "uuid";

const TEST_EMAIL = "test@example.com";

// Create email connector from environment variables
const emailConnector = new EmailConnector(
  {
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
  {
    host: process.env.IMAP_HOST!,
    port: parseInt(process.env.IMAP_PORT || "993"),
    user: process.env.IMAP_USER!,
    password: process.env.IMAP_PASS!,
    tls: process.env.IMAP_TLS !== "false",
    tlsOptions: {
      rejectUnauthorized: false, // Allow self-signed certificates (for testing)
    },
  }
);

// Callback function for email listener
const emailCallback: EmailListenerCallback = async (taskId, emailContent) => {
  console.log("=== Email Received ===");
  console.log("Task ID:", taskId);
  console.log("Message:", emailContent);
  console.log("=====================");
};

async function main() {
  try {
    console.log("Starting email connector tester...");
    console.log(`Test email recipient: ${TEST_EMAIL}`);

    // // Send test email with task ID "1"
    console.log("\nSending test email...");
    await emailConnector.sendEmail(
      uuidv4().toString(),
      "This is a test email from the email connector tester.",
      {
        to: TEST_EMAIL,
      }
    );
    console.log("Test email sent successfully!");

    // Start listening for incoming emails
    console.log("\nStarting email listener...");
    await emailConnector.startEmailListener(emailCallback);
    console.log("Email listener started. Waiting for incoming emails...");
    console.log("Press Ctrl+C to stop.");

    // Keep the process running
    process.on("SIGINT", () => {
      console.log("\nStopping email listener...");
      emailConnector.stopEmailListener();
      console.log("Email listener stopped. Exiting...");
      process.exit(0);
    });
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    process.exit(1);
  }
}

// Run the tester
main();
