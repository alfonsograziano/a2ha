# Email Connector

The Email Connector provides a robust solution for sending and receiving emails in the human-agent-proxy system. It supports SMTP for sending emails and IMAP for listening to incoming emails, with automatic task ID extraction and routing.

## Features

- **Send Emails**: Send emails with task identifiers in the subject line via SMTP
- **Receive Emails**: Automatically detect and process incoming emails via IMAP
- **Task ID Extraction**: Extract task IDs from email subjects using regex patterns
- **Configuration Validation**: Robust Zod schema validation for SMTP and IMAP configurations
- **Error Handling**: Comprehensive error handling with retry logic for IMAP connections
- **Edge Case Handling**: Handles malformed subjects, encoding issues, long messages, and duplicate emails

## Installation

The Email Connector is part of the `human-agent-proxy` package. Ensure you have the required dependencies:

```bash
npm install nodemailer imap mailparser zod
```

## Configuration

### Environment Variables

Copy `.env.sample` to `.env` and configure your SMTP and IMAP settings:

```bash
cp .env.sample .env
```

Edit `.env` with your email provider settings. See `.env.sample` for detailed configuration options.

### Configuration Object

Alternatively, you can pass configuration objects directly:

```typescript
import { EmailConnector } from './connectors/email/index.js';

const smtpConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  user: 'your-email@gmail.com',
  pass: 'your-app-password',
};

const imapConfig = {
  host: 'imap.gmail.com',
  port: 993,
  user: 'your-email@gmail.com',
  password: 'your-app-password',
  tls: true,
};

const connector = new EmailConnector(smtpConfig, imapConfig);
```

## Usage

### Sending Emails

```typescript
import { EmailConnector } from './connectors/email/index.js';

// Create connector instance
const connector = new EmailConnector(smtpConfig, imapConfig);

// Send an email with a task ID
await connector.sendEmail(
  'task-123',
  'Hello, I need help with deployment.',
  {
    to: 'human-agent@example.com',
    // Additional SMTP options can be passed here
  }
);
```

The email will be sent with subject: `Support request: [#task-123]`

### Receiving Emails

```typescript
import { EmailConnector, type EmailListenerCallback } from './connectors/email/index.js';

// Create connector instance
const connector = new EmailConnector(smtpConfig, imapConfig);

// Define callback function
const emailCallback: EmailListenerCallback = async (taskId, emailContent) => {
  console.log(`Received email for task ${taskId}:`);
  console.log(emailContent);
  
  // Process the email content (e.g., route to task handler)
  // await routeToTask(taskId, emailContent);
};

// Start listening for emails
await connector.startEmailListener(emailCallback);

// Later, stop the listener
connector.stopEmailListener();
```

### Using the Convenience Function

```typescript
import { createEmailListener, EmailConnector } from './connectors/email/index.js';

const connector = new EmailConnector(smtpConfig, imapConfig);

await createEmailListener(connector, async (taskId, content) => {
  // Handle email
});
```

## Email Subject Format

The connector expects emails with subjects in the following format:

- `Support request: [#task-123]`
- `Re: Support request: [#task-123]` (replies)
- `Fwd: Support request: [#task-123]` (forwards)

The connector automatically extracts the task ID from these patterns, even with reply prefixes.

## Configuration Validation

The connector validates all configuration using Zod schemas. Invalid configurations will throw descriptive errors:

```typescript
try {
  const connector = new EmailConnector(invalidSmtpConfig, invalidImapConfig);
} catch (error) {
  console.error('Configuration validation failed:', error.message);
  // Error messages are clear and actionable
}
```

### Validation Rules

- **SMTP Host**: Required string, cannot be empty
- **SMTP Port**: Required number, must be between 1 and 65535
- **SMTP Secure**: Required boolean
- **SMTP User**: Required string, cannot be empty
- **SMTP Pass**: Required string, cannot be empty
- **IMAP Host**: Required string, cannot be empty
- **IMAP Port**: Required number, must be between 1 and 65535
- **IMAP User**: Required string, cannot be empty
- **IMAP Password**: Required string, cannot be empty
- **IMAP TLS**: Optional boolean (defaults to true)

## Error Handling

### SMTP Errors

SMTP connection failures and email sending errors are caught and re-thrown with descriptive messages:

```typescript
try {
  await connector.sendEmail('task-123', 'Message');
} catch (error) {
  console.error('Failed to send email:', error.message);
}
```

### IMAP Errors

IMAP connection failures trigger automatic reconnection with retry logic:

- Maximum 5 reconnection attempts
- 5-second delay between attempts
- Logs all reconnection attempts

Callback errors during email processing are logged but don't stop the listener:

```typescript
const callback: EmailListenerCallback = async (taskId, content) => {
  // If this throws an error, it's logged but the listener continues
  throw new Error('Processing failed');
};
```

## Edge Cases Handled

1. **Malformed Email Subjects**: Handles subjects that partially match the task ID pattern
2. **Multiple Task ID Patterns**: Extracts the first valid task ID if multiple patterns are found
3. **Duplicate Emails**: Processes all emails, even if they have the same task ID
4. **Very Long Messages**: Truncates email content exceeding 1MB with a warning
5. **Encoding Issues**: Handles special characters and encoding problems in subjects and content
6. **Connection Failures**: Automatic reconnection with retry logic for IMAP connections
7. **Callback Errors**: Callback errors are logged but don't stop email processing

## Logging

The connector provides comprehensive logging at different levels:

- **debug**: Detailed information for debugging (task ID extraction, email processing)
- **info**: General information (connection status, email sent/received)
- **warn**: Warnings (content truncation, encoding issues)
- **error**: Errors (connection failures, parsing errors, callback errors)

All logs are prefixed with `[EmailConnector]` for easy filtering.

## Examples

### Complete Example

```typescript
import { EmailConnector, type EmailListenerCallback } from './connectors/email/index.js';

// Configuration
const smtpConfig = {
  host: process.env.SMTP_HOST!,
  port: parseInt(process.env.SMTP_PORT!),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER!,
  pass: process.env.SMTP_PASS!,
};

const imapConfig = {
  host: process.env.IMAP_HOST!,
  port: parseInt(process.env.IMAP_PORT!),
  user: process.env.IMAP_USER!,
  password: process.env.IMAP_PASS!,
  tls: process.env.IMAP_TLS !== 'false',
};

// Create connector
const connector = new EmailConnector(smtpConfig, imapConfig);

// Send an email
await connector.sendEmail('task-456', 'Need assistance with API integration', {
  to: 'support@example.com',
});

// Start listening
const callback: EmailListenerCallback = async (taskId, content) => {
  console.log(`Task ${taskId} received response:`, content);
  // Route to your task handler
};

await connector.startEmailListener(callback);

// Keep the process running
process.on('SIGINT', () => {
  connector.stopEmailListener();
  process.exit(0);
});
```

## Gmail Setup

For Gmail, you need to:

1. Enable 2-factor authentication
2. Generate an App Password at: https://myaccount.google.com/apppasswords
3. Use the App Password (16 characters) as `SMTP_PASS` and `IMAP_PASS`

**Gmail Configuration:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password

IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=your-email@gmail.com
IMAP_PASS=your-16-char-app-password
IMAP_TLS=true
```

## API Reference

### `EmailConnector`

Main class for email operations.

#### Constructor

```typescript
constructor(smtpConfig: unknown, imapConfig: unknown)
```

Creates a new EmailConnector instance with validated SMTP and IMAP configuration.

#### Methods

##### `sendEmail(taskId: string, message: string, options?: Record<string, unknown>): Promise<void>`

Sends an email with the specified task ID in the subject.

- `taskId`: Task identifier to include in email subject
- `message`: Email message content
- `options`: Optional SMTP-specific options (e.g., `to`, `cc`, `bcc`)

##### `startEmailListener(callback: EmailListenerCallback): Promise<void>`

Starts listening for incoming emails and processes them.

- `callback`: Function to invoke when a valid task ID is found

##### `stopEmailListener(): void`

Stops the email listener and closes IMAP connection.

### `EmailListenerCallback`

```typescript
type EmailListenerCallback = (taskId: string, emailContent: string) => void | Promise<void>;
```

Callback function signature for email processing.

### `createEmailListener(connector: EmailConnector, callback: EmailListenerCallback): Promise<void>`

Convenience function to create an email listener.

## Troubleshooting

### Connection Issues

- Verify your SMTP/IMAP credentials are correct
- Check firewall settings for email ports
- For Gmail, ensure you're using an App Password, not your regular password

### Email Not Received

- Check that the email subject matches the expected format: `Support request: [#taskId]`
- Verify IMAP listener is running: `connector.startEmailListener(callback)`
- Check logs for error messages

### Validation Errors

- Ensure all required fields are provided
- Check that port numbers are valid integers
- Verify boolean values are actual booleans, not strings

## License

Part of the human-agent-proxy project.

