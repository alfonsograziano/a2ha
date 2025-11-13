/**
 * Zod schemas for email connector configuration validation
 */

import { z } from "zod";
import type { SMTPConfig, IMAPConfig } from "./types.js";

/**
 * Valid SMTP ports (common ports: 25, 465, 587, 2525)
 */
const SMTP_PORT_MIN = 1;
const SMTP_PORT_MAX = 65535;

/**
 * Valid IMAP ports (common ports: 143, 993)
 */
const IMAP_PORT_MIN = 1;
const IMAP_PORT_MAX = 65535;

/**
 * Zod schema for SMTP configuration
 */
export const smtpConfigSchema = z
  .object({
    host: z
      .string("SMTP host must be a string")
      .min(1, "SMTP host cannot be empty")
      .trim(),
    port: z
      .number("SMTP port must be a number")
      .int("SMTP port must be an integer")
      .min(
        SMTP_PORT_MIN,
        `SMTP port must be between ${SMTP_PORT_MIN} and ${SMTP_PORT_MAX}`
      )
      .max(
        SMTP_PORT_MAX,
        `SMTP port must be between ${SMTP_PORT_MIN} and ${SMTP_PORT_MAX}`
      ),
    secure: z.boolean("SMTP secure must be a boolean"),
    user: z
      .string("SMTP user must be a string")
      .min(1, "SMTP user cannot be empty")
      .trim(),
    pass: z
      .string("SMTP password must be a string")
      .min(1, "SMTP password cannot be empty"),
  })
  .passthrough(); // Allow additional properties for SMTP-specific options

/**
 * Zod schema for IMAP configuration
 */
export const imapConfigSchema = z
  .object({
    host: z
      .string("IMAP host must be a string")
      .min(1, "IMAP host cannot be empty")
      .trim(),
    port: z
      .number("IMAP port must be a number")
      .int("IMAP port must be an integer")
      .min(
        IMAP_PORT_MIN,
        `IMAP port must be between ${IMAP_PORT_MIN} and ${IMAP_PORT_MAX}`
      )
      .max(
        IMAP_PORT_MAX,
        `IMAP port must be between ${IMAP_PORT_MIN} and ${IMAP_PORT_MAX}`
      ),
    user: z
      .string("IMAP user must be a string")
      .min(1, "IMAP user cannot be empty")
      .trim(),
    password: z
      .string("IMAP password must be a string")
      .min(1, "IMAP password cannot be empty"),
    tls: z.boolean("IMAP tls must be a boolean").optional(),
    tlsOptions: z
      .object({
        rejectUnauthorized: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough(); // Allow additional properties for IMAP-specific options

/**
 * Validates SMTP configuration and returns validated config or throws error
 * @param config - SMTP configuration to validate
 * @returns Validated SMTP configuration
 * @throws ZodError if validation fails
 */
export function validateSMTPConfig(config: unknown): SMTPConfig {
  return smtpConfigSchema.parse(config);
}

/**
 * Validates IMAP configuration and returns validated config or throws error
 * @param config - IMAP configuration to validate
 * @returns Validated IMAP configuration
 * @throws ZodError if validation fails
 */
export function validateIMAPConfig(config: unknown): IMAPConfig {
  return imapConfigSchema.parse(config);
}

/**
 * Validates both SMTP and IMAP configurations
 * @param smtpConfig - SMTP configuration to validate
 * @param imapConfig - IMAP configuration to validate
 * @returns Object with validated configurations
 * @throws ZodError if either validation fails
 */
export function validateEmailConnectorConfig(
  smtpConfig: unknown,
  imapConfig: unknown
): { smtp: SMTPConfig; imap: IMAPConfig } {
  return {
    smtp: validateSMTPConfig(smtpConfig),
    imap: validateIMAPConfig(imapConfig),
  };
}
