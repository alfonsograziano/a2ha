/**
 * Type definitions for email connector configuration
 */

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  [key: string]: unknown;
}

export interface IMAPConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls?: boolean;
  tlsOptions?: {
    rejectUnauthorized?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface EmailConnectorConfig {
  smtp: SMTPConfig;
  imap: IMAPConfig;
}
