import nodemailer, { type Transporter, type SendMailOptions } from "nodemailer";
import Imap from "imap";
import { simpleParser } from "mailparser";
import type { SMTPConfig, IMAPConfig } from "./types.js";
import { validateSMTPConfig, validateIMAPConfig } from "./schemas.js";
import { ContactTeamMember } from "../../contactTeamMember.js";

/**
 * Callback function signature for email listener
 * @param taskId - Extracted task ID from email subject
 * @param emailContent - Email content (text or HTML)
 */
export type EmailListenerCallback = (
  taskId: string,
  emailContent: string
) => void | Promise<void>;

/**
 * EmailConnector class that encapsulates SMTP and IMAP configuration
 * and provides email sending and listening capabilities
 */
export class EmailConnector {
  private smtpConfig: SMTPConfig;
  private imapConfig: IMAPConfig;
  private transporter: Transporter | null = null;
  private imapConnection: Imap | null = null;
  private isListening: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000; // 5 seconds
  private maxEmailContentLength: number = 1000000; // 1MB limit
  private pollingInterval: NodeJS.Timeout | null = null;
  private pollingIntervalMs: number = 10000; // 10 seconds - TODO: Make this configurable
  private logEnabled: boolean = false;

  /**
   * Creates a new EmailConnector instance with validated SMTP and IMAP configuration
   * @param smtpConfig - SMTP configuration for sending emails
   * @param imapConfig - IMAP configuration for listening to incoming emails
   * @throws Error if configuration validation fails
   */
  constructor(
    smtpConfig: unknown,
    imapConfig: unknown,
    logEnabled: boolean = false
  ) {
    // Validate configurations using Zod schemas
    this.smtpConfig = validateSMTPConfig(smtpConfig);
    this.imapConfig = validateIMAPConfig(imapConfig);
    this.logEnabled = logEnabled;
    // Initialize nodemailer transporter (lazy initialization)
    this.transporter = null;
  }

  /**
   * Gets or creates the nodemailer transporter instance
   * @returns Configured nodemailer transporter
   */
  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.smtpConfig.host,
        port: this.smtpConfig.port,
        secure: this.smtpConfig.secure,
        auth: {
          user: this.smtpConfig.user,
          pass: this.smtpConfig.pass,
        },
        // Pass through any additional SMTP options
        ...Object.fromEntries(
          Object.entries(this.smtpConfig).filter(
            ([key]) => !["host", "port", "secure", "user", "pass"].includes(key)
          )
        ),
      });
    }
    return this.transporter;
  }

  /**
   * Sends an email with a task identifier in the subject line
   * @param taskId - Task identifier to include in email subject
   * @param message - Email message content
   * @param options - Optional record of unknown type for SMTP-specific options
   * @returns Promise that resolves when email is sent
   * @throws Error if email sending fails
   */
  async sendEmail(
    taskId: string,
    contactTeamMember: ContactTeamMember,
    options?: Record<string, unknown>
  ): Promise<void> {
    try {
      const transporter = this.getTransporter();

      // Construct email subject as "Support request: [#taskId]"
      const subject = `Support request: [#${taskId}]`;

      // Build email options
      const mailOptions: SendMailOptions = {
        from: this.smtpConfig.user,
        subject,
        to: contactTeamMember.contactInfo,
        text: contactTeamMember.message,
        // Merge any additional options passed in
        ...(options || {}),
      };

      // Send email via SMTP
      const info = await transporter.sendMail(mailOptions);

      // Log success
      this.log("info", `Email sent successfully for task ${taskId}`, {
        messageId: info.messageId,
      });
    } catch (error) {
      // Enhanced error handling for SMTP connection failures and email sending errors
      if (error instanceof Error) {
        throw new Error(
          `Failed to send email for task ${taskId}: ${error.message}`
        );
      }
      throw new Error(`Failed to send email for task ${taskId}: Unknown error`);
    }
  }

  /**
   * Extracts task ID from email subject using regex pattern
   * Handles reply prefixes (Re:, Fwd:, etc.) and extracts task ID from "Support request: [#taskId]" pattern
   * Handles malformed subjects that partially match the pattern
   * If multiple task ID patterns are found, extracts the first valid one
   * @param subject - Email subject line (may contain special characters or encoding issues)
   * @returns Extracted task ID or null if not found
   */
  private extractTaskId(subject: string): string | null {
    if (!subject || typeof subject !== "string") {
      this.log("warn", "Invalid subject provided for task ID extraction");
      return null;
    }

    // Normalize subject: handle encoding issues and special characters
    // Decode common encoding issues
    let normalizedSubject = subject;
    try {
      // Handle quoted-printable and base64 encoding if present
      normalizedSubject = decodeURIComponent(subject);
    } catch {
      // If decoding fails, use original subject
      normalizedSubject = subject;
    }

    // Pattern to match "Support request: [#taskId]" with optional reply prefixes
    // Handles: "Re: Support request: [#task-123]", "Fwd: Support request: [#task-123]", etc.
    // Also handles malformed patterns like "Support request [#task-123]" (missing colon)
    const patterns = [
      // Standard pattern with reply prefix
      /(?:(?:Re|Fwd|RE|FWD|Fw):\s*)?Support\s+request:\s*\[#([^\]]+)\]/i,
      // Pattern without colon (malformed but still valid)
      /(?:(?:Re|Fwd|RE|FWD|Fw):\s*)?Support\s+request\s*\[#([^\]]+)\]/i,
      // Direct pattern without reply prefix
      /Support\s+request:\s*\[#([^\]]+)\]/i,
      // Direct pattern without colon
      /Support\s+request\s*\[#([^\]]+)\]/i,
      // Pattern with [#taskId]
      /\[#([^\]]+)\]/i,
    ];

    // Try each pattern and return the first valid match
    for (const pattern of patterns) {
      const match = normalizedSubject.match(pattern);
      if (match && match[1]) {
        const taskId = match[1].trim();
        // Validate that taskId is not empty and contains valid characters
        if (taskId.length > 0 && /^[a-zA-Z0-9_-]+$/.test(taskId)) {
          this.log(
            "debug",
            `Extracted task ID: ${taskId} from subject: ${subject.substring(
              0,
              50
            )}...`
          );
          return taskId;
        }
      }
    }

    // If no valid pattern found, log for debugging
    this.log(
      "debug",
      `No valid task ID found in subject: ${subject.substring(0, 100)}...`
    );
    return null;
  }

  /**
   * Starts listening for incoming emails and processes them
   * @param callback - Callback function to invoke when a valid task ID is found in an email
   * @throws Error if IMAP connection fails or listener cannot be started
   */
  async startEmailListener(callback: EmailListenerCallback): Promise<void> {
    if (this.isListening) {
      throw new Error("Email listener is already running");
    }

    try {
      // Create IMAP connection
      const imap = new Imap({
        user: this.imapConfig.user,
        password: this.imapConfig.password,
        host: this.imapConfig.host,
        port: this.imapConfig.port,
        tls: this.imapConfig.tls ?? true,
        tlsOptions: this.imapConfig.tlsOptions,
        // Pass through any additional IMAP options
        ...Object.fromEntries(
          Object.entries(this.imapConfig).filter(
            ([key]) =>
              ![
                "user",
                "password",
                "host",
                "port",
                "tls",
                "tlsOptions",
              ].includes(key)
          )
        ),
      });

      this.imapConnection = imap;
      this.isListening = true;

      // Set up IMAP connection event handlers
      imap.once("ready", () => {
        this.log("info", "IMAP connection ready");
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        // Open inbox
        imap.openBox("INBOX", false, (err, box) => {
          if (err) {
            this.log("error", "Failed to open inbox", { error: err.message });
            this.isListening = false;
            return;
          }
          this.log("info", "Inbox opened, listening for new emails", {
            messageCount: box.messages.total,
          });

          // Start periodic polling for reliable email detection
          this.startPolling(imap, callback);
        });
      });

      imap.once("error", (err: Error) => {
        this.log("error", "IMAP connection error", { error: err.message });
        this.isListening = false;
        // Attempt reconnection with retry logic
        this.attemptReconnect(callback).catch((reconnectErr) => {
          this.log("error", "Failed to reconnect IMAP", {
            error: reconnectErr.message,
          });
        });
      });

      imap.once("end", () => {
        this.log("info", "IMAP connection ended");
        this.isListening = false;
      });

      // Listen for new emails via mail event (works alongside polling)
      imap.on("mail", async () => {
        try {
          this.log("debug", "New email detected via mail event, processing...");
          await this.processNewEmails(imap, callback);
        } catch (error) {
          this.log("error", "Error processing new emails", {
            error: error instanceof Error ? error.message : "Unknown error",
          });
          // Continue listening even if processing fails
        }
      });

      // Connect to IMAP server
      imap.connect();
    } catch (error) {
      this.isListening = false;
      if (error instanceof Error) {
        throw new Error(`Failed to start email listener: ${error.message}`);
      }
      throw new Error("Failed to start email listener: Unknown error");
    }
  }

  /**
   * Processes new emails in the inbox
   * Handles multiple emails with same task ID, very long messages, and callback errors
   * @param imap - IMAP connection instance
   * @param callback - Callback function to invoke for valid emails
   */
  private async processNewEmails(
    imap: Imap,
    callback: EmailListenerCallback
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      imap.search(["UNSEEN"], (err, results) => {
        if (err) {
          this.log("error", "Failed to search for emails", {
            error: err.message,
          });
          reject(new Error(`Failed to search for emails: ${err.message}`));
          return;
        }

        if (!results || results.length === 0) {
          resolve();
          return;
        }

        this.log("debug", `Found ${results.length} unread email(s)`);
        const fetch = imap.fetch(results, { bodies: "" });
        const processingPromises: Promise<void>[] = [];

        fetch.on("message", (msg, seqno) => {
          const messagePromise = new Promise<void>((resolveMsg) => {
            msg.on("body", async (stream) => {
              try {
                // Parse email using mailparser
                const parsed = await simpleParser(stream);

                // Extract task ID from subject
                const taskId = parsed.subject
                  ? this.extractTaskId(parsed.subject)
                  : null;

                // Only invoke callback if valid taskId is found
                if (taskId) {
                  // Handle multiple emails with same task ID
                  // Track processed task IDs to avoid duplicate processing
                  const taskKey = `${taskId}-${Date.now()}`;

                  // Extract email content (prefer text, fallback to HTML)
                  let emailContent = parsed.text || parsed.html || "";

                  // Handle very long email messages (content truncation)
                  if (emailContent.length > this.maxEmailContentLength) {
                    this.log(
                      "warn",
                      `Email content exceeds maximum length (${this.maxEmailContentLength}), truncating`,
                      {
                        originalLength: emailContent.length,
                        taskId,
                      }
                    );
                    emailContent =
                      emailContent.substring(0, this.maxEmailContentLength) +
                      "\n\n[Content truncated due to size limit]";
                  }

                  // Handle special characters and encoding issues
                  try {
                    // Ensure content is properly decoded
                    if (typeof emailContent === "string") {
                      emailContent = emailContent.normalize("NFD");
                    }
                  } catch (encodingError) {
                    this.log(
                      "warn",
                      "Error normalizing email content encoding",
                      {
                        error:
                          encodingError instanceof Error
                            ? encodingError.message
                            : "Unknown",
                        taskId,
                      }
                    );
                  }

                  try {
                    this.log("info", `Processing email for task ${taskId}`, {
                      subject: parsed.subject?.substring(0, 50),
                      contentLength: emailContent.length,
                    });

                    // Invoke callback with taskId and email content
                    // Wrap in try-catch to handle callback errors gracefully
                    await Promise.resolve(callback(taskId, emailContent));

                    this.log(
                      "info",
                      `Successfully processed email for task ${taskId}`
                    );

                    // Mark email as read after successful processing
                    imap.addFlags(seqno, "\\Seen", (flagErr) => {
                      if (flagErr) {
                        this.log("error", "Failed to mark email as read", {
                          error: flagErr.message,
                          taskId,
                        });
                      } else {
                        this.log(
                          "debug",
                          `Marked email as read for task ${taskId}`
                        );
                      }
                    });
                  } catch (callbackError) {
                    // Handle callback function throwing errors during email processing
                    this.log(
                      "error",
                      "Callback function threw an error during email processing",
                      {
                        error:
                          callbackError instanceof Error
                            ? callbackError.message
                            : "Unknown error",
                        taskId,
                      }
                    );
                    // Continue processing other emails even if callback fails
                  }
                } else {
                  this.log(
                    "debug",
                    "Email does not contain valid task ID, skipping",
                    {
                      subject: parsed.subject?.substring(0, 50),
                    }
                  );
                }
              } catch (parseError) {
                // Handle email parsing errors
                this.log("error", "Error parsing email", {
                  error:
                    parseError instanceof Error
                      ? parseError.message
                      : "Unknown error",
                });
                // Continue processing other emails even if parsing fails
              }
              resolveMsg();
            });
          });
          processingPromises.push(messagePromise);
        });

        fetch.once("error", (fetchErr) => {
          this.log("error", "Failed to fetch emails", {
            error: fetchErr.message,
          });
          reject(new Error(`Failed to fetch emails: ${fetchErr.message}`));
        });

        fetch.once("end", async () => {
          // Wait for all messages to be processed
          await Promise.all(processingPromises);
          resolve();
        });
      });
    });
  }

  /**
   * Attempts to reconnect to IMAP server with retry logic
   * @param callback - Callback function to use when reconnected
   */
  private async attemptReconnect(
    callback: EmailListenerCallback
  ): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log("error", "Max reconnection attempts reached", {
        attempts: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
      });
      throw new Error("Max reconnection attempts reached");
    }

    this.reconnectAttempts++;
    this.log(
      "info",
      `Attempting IMAP reconnection (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    // Wait before reconnecting
    await new Promise((resolve) => setTimeout(resolve, this.reconnectDelay));

    try {
      // Reset connection state
      this.imapConnection = null;
      this.isListening = false;

      // Attempt to start listener again
      await this.startEmailListener(callback);
      this.log("info", "Successfully reconnected to IMAP server");
    } catch (error) {
      this.log("warn", "Reconnection attempt failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        attempt: this.reconnectAttempts,
      });
      // Retry again
      await this.attemptReconnect(callback);
    }
  }

  /**
   * Logs messages with different levels
   * @param level - Log level (debug, info, warn, error)
   * @param message - Log message
   * @param metadata - Optional metadata to include in log
   */
  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.logEnabled) {
      return;
    }
    // Use console methods based on log level
    switch (level) {
      case "debug":
        console.debug(`[EmailConnector] ${message}`, metadata || "");
        break;
      case "info":
        console.info(`[EmailConnector] ${message}`, metadata || "");
        break;
      case "warn":
        console.warn(`[EmailConnector] ${message}`, metadata || "");
        break;
      case "error":
        console.error(`[EmailConnector] ${message}`, metadata || "");
        break;
    }
  }

  /**
   * Starts periodic polling for new emails
   * This is the primary mechanism for detecting new emails reliably
   * @param imap - IMAP connection instance
   * @param callback - Callback function to invoke for valid emails
   */
  private startPolling(imap: Imap, callback: EmailListenerCallback): void {
    // Clear any existing polling interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.log(
      "debug",
      `Starting periodic polling every ${this.pollingIntervalMs}ms`
    );

    // Poll immediately, then set up interval
    this.pollForNewEmails(imap, callback);

    this.pollingInterval = setInterval(() => {
      if (this.isListening && imap && imap.state === "authenticated") {
        this.pollForNewEmails(imap, callback);
      }
    }, this.pollingIntervalMs);
  }

  /**
   * Polls for new emails
   * @param imap - IMAP connection instance
   * @param callback - Callback function to invoke for valid emails
   */
  private async pollForNewEmails(
    imap: Imap,
    callback: EmailListenerCallback
  ): Promise<void> {
    try {
      this.log("debug", "Polling for new emails...");
      await this.processNewEmails(imap, callback);
    } catch (error) {
      this.log("error", "Error during polling", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Stops the email listener and closes IMAP connection
   */
  stopEmailListener(): void {
    if (this.imapConnection && this.isListening) {
      // Stop polling
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }

      this.imapConnection.end();
      this.imapConnection = null;
      this.isListening = false;
      this.reconnectAttempts = 0;
      this.log("info", "Email listener stopped");
    }
  }
}
