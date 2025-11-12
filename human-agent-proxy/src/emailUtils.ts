import nodemailer from "nodemailer";
import Imap from "imap";
import { simpleParser } from "mailparser";
import { taskStore } from "./agentUtils.ts";
import { sendNotificationToTask } from "./sendNotification.ts";

// SMTP configuration - should be set via environment variables
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "", // App password for Gmail
  },
};

// IMAP configuration - should be set via environment variables
const IMAP_CONFIG = {
  user: process.env.IMAP_USER || process.env.SMTP_USER || "",
  password: process.env.IMAP_PASS || process.env.SMTP_PASS || "",
  host: process.env.IMAP_HOST || "imap.gmail.com",
  port: parseInt(process.env.IMAP_PORT || "993"),
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
};

/**
 * Sends an email to a team member using SMTP
 */
export const contactTeamMemberByEmail = async (
  taskId: string,
  toEmail: string,
  message: string
) => {
  // Create transporter
  const transporter = nodemailer.createTransport(SMTP_CONFIG);

  // Email subject with task ID
  const subject = `Support request: [#${taskId}]`;

  // Email body with message and footer
  const emailBody = `${message}

---
This email is written by an AI automation called A2HA`;

  // Email options
  const mailOptions = {
    from: SMTP_CONFIG.auth.user,
    to: toEmail,
    subject: subject,
    text: emailBody,
  };

  try {
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${toEmail} for task ${taskId}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Error sending email to ${toEmail} for task ${taskId}:`, error);
    throw error;
  }
};

/**
 * Parses task ID from email subject
 * Expected format: "Support request: [#taskId]" or "Re: Support request: [#taskId]"
 */
export const parseTaskIdFromSubject = (subject: string): string | null => {
  // Match pattern like "Support request: [#taskId]" or "Re: Support request: [#taskId]"
  const match = subject.match(/Support request:\s*\[#([^\]]+)\]/i);
  if (match && match[1]) {
    return match[1];
  }
  return null;
};

/**
 * Checks if a task exists and is active
 */
const isTaskActive = async (taskId: string): Promise<boolean> => {
  try {
    const task = await taskStore.load(taskId);
    if (!task) {
      return false;
    }
    // Check if task is in a state that can receive responses
    // Tasks can be "submitted", "in-progress", etc. but not "completed" or "cancelled"
    const activeStates = ["submitted", "in-progress"];
    return activeStates.includes(task.status?.state || "");
  } catch (error) {
    console.error(`Error checking task ${taskId}:`, error);
    return false;
  }
};

/**
 * Processes an incoming email and forwards it to the task if applicable
 */
const processIncomingEmail = async (email: any) => {
  try {
    const subject = email.subject || "";
    const taskId = parseTaskIdFromSubject(subject);

    if (!taskId) {
      console.log(`No task ID found in email subject: ${subject}`);
      return;
    }

    // Check if task exists and is active
    const isActive = await isTaskActive(taskId);
    if (!isActive) {
      console.log(`Task ${taskId} is not active or doesn't exist`);
      return;
    }

    // Extract email text content
    const emailText = email.text || email.html || "";
    
    // Forward the email text to the task
    await sendNotificationToTask(taskId, emailText);
    console.log(`Forwarded email response to task ${taskId}`);
  } catch (error) {
    console.error("Error processing incoming email:", error);
  }
};

/**
 * Sets up IMAP listener to monitor incoming emails
 */
export const setupEmailListener = () => {
  if (!IMAP_CONFIG.user || !IMAP_CONFIG.password) {
    console.warn("IMAP credentials not configured. Email listener will not start.");
    return;
  }

  const imap = new Imap(IMAP_CONFIG);

  imap.once("ready", () => {
    console.log("IMAP connection ready");
    openInbox();
  });

  imap.once("error", (err: Error) => {
    console.error("IMAP error:", err);
  });

  imap.once("end", () => {
    console.log("IMAP connection ended");
    // Reconnect after a delay
    setTimeout(() => {
      console.log("Attempting to reconnect IMAP...");
      imap.connect();
    }, 5000);
  });

  const openInbox = () => {
    imap.openBox("INBOX", false, (err, box) => {
      if (err) {
        console.error("Error opening INBOX:", err);
        return;
      }

      console.log(`Opened INBOX. Total messages: ${box.messages.total}`);

      // Listen for new emails
      imap.on("mail", (numNewMsgs) => {
        console.log(`New email detected: ${numNewMsgs} new message(s)`);
        fetchNewEmails();
      });

      // Fetch initial unread emails
      fetchNewEmails();
    });
  };

  const fetchNewEmails = () => {
    imap.search(["UNSEEN"], (err, results) => {
      if (err) {
        console.error("Error searching for emails:", err);
        return;
      }

      if (!results || results.length === 0) {
        console.log("No new emails found");
        return;
      }

      console.log(`Found ${results.length} unread email(s)`);

      const fetch = imap.fetch(results, {
        bodies: "",
        struct: true,
      });

      fetch.on("message", (msg, seqno) => {
        msg.on("body", (stream, info) => {
          simpleParser(stream, async (err, parsed) => {
            if (err) {
              console.error(`Error parsing email ${seqno}:`, err);
              return;
            }

            // Mark as read using sequence number
            imap.addFlags(seqno, "\\Seen", (err) => {
              if (err) {
                console.error(`Error marking email ${seqno} as read:`, err);
              }
            });

            // Process the email
            await processIncomingEmail({
              subject: parsed.subject,
              text: parsed.text,
              html: parsed.html,
              from: parsed.from,
              date: parsed.date,
            });
          });
        });
      });

      fetch.once("error", (err) => {
        console.error("Error fetching emails:", err);
      });
    });
  };

  // Connect to IMAP server
  imap.connect();

  return imap;
};

