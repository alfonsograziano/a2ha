import {
  EmailConnector,
  type EmailListenerCallback,
} from "./EmailConnector.js";

export { EmailConnector } from "./EmailConnector.js";
export type { EmailListenerCallback } from "./EmailConnector.js";
export type { SMTPConfig, IMAPConfig, EmailConnectorConfig } from "./types.js";
export {
  validateSMTPConfig,
  validateIMAPConfig,
  validateEmailConnectorConfig,
} from "./schemas.js";

/**
 * Creates an email listener using an EmailConnector instance
 * This is a convenience function that wraps the EmailConnector's startEmailListener method
 * @param connector - EmailConnector instance
 * @param callback - Callback function to invoke when a valid task ID is found
 */
export async function createEmailListener(
  connector: EmailConnector,
  callback: EmailListenerCallback
): Promise<void> {
  return connector.startEmailListener(callback);
}
