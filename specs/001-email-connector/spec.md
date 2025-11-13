# Feature Specification: Email Listener and Connector

**Feature Branch**: `001-email-connector`  
**Created**: 2024-11-13  
**Status**: Draft  
**Input**: User description: "I need to add an email listener and connector. The idea is that the human-agent-proxy can contact a human via email. The class, once created, takes in input a SMTP and a IMAP configuration. The config will need to be validated via zod schema. Create a .env.sample with the example SMTP/IMAP configuration. This part of the system will need to support a sendEmail method which takes in input a taskId as string, a message as string, options as an optional record of unknown. The email is sent via SMTP. Some of the options are the SMTP options. The subject is built as Support request: [#taskId]. Then, we need to have an exported listener. This listener will need to be able to listen and be triggered whenever a new email comes in the inbox. When this happens, the listener reads the subject, extracts a taskId with a regex and if the taskId id found, the content of the email is sent to a callback which gets passed to the listener. This feature has to be created in a new /connectors folder in the human-agent-proxy"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Send Support Request via Email (Priority: P1)

An AI agent needs to contact a human agent via email when assistance is required. The system sends an email with a task identifier in the subject line, allowing the human to respond and have their response automatically routed back to the originating task.

**Why this priority**: This is the core functionality that enables the human-agent-proxy to initiate contact with humans via email. Without this, the email connector cannot fulfill its primary purpose.

**Independent Test**: Can be fully tested by creating an email connector instance with valid SMTP configuration, calling sendEmail with a taskId and message, and verifying that an email is delivered to the recipient's inbox with the correct subject format and message content.

**Acceptance Scenarios**:

1. **Given** an email connector is configured with valid SMTP settings, **When** sendEmail is called with a taskId "task-123", message "Need help with deployment", and recipient email, **Then** an email is sent with subject "Support request: [#task-123]" containing the message
2. **Given** an email connector is configured with valid SMTP settings, **When** sendEmail is called with additional SMTP options in the options parameter, **Then** those options are applied to the email sending process
3. **Given** an email connector is configured with invalid SMTP settings, **When** sendEmail is called, **Then** the system rejects the operation with a clear validation error

---

### User Story 2 - Receive and Process Email Responses (Priority: P1)

When a human agent responds to a support request email, the system automatically detects the incoming email, extracts the task identifier from the subject, and routes the email content to the appropriate callback handler for processing.

**Why this priority**: This completes the bidirectional communication loop. Without this, the system can send emails but cannot receive and process responses, making the feature incomplete.

**Independent Test**: Can be fully tested by setting up an email listener with valid IMAP configuration and a callback function, sending a test email to the monitored inbox with a subject containing a task ID, and verifying that the callback is invoked with the correct task ID and email content.

**Acceptance Scenarios**:

1. **Given** an email listener is active and monitoring an inbox, **When** a new email arrives with subject "Re: Support request: [#task-123]", **Then** the listener extracts taskId "task-123" and invokes the callback with the taskId and email content
2. **Given** an email listener is active and monitoring an inbox, **When** a new email arrives with subject "Support request: [#task-456]", **Then** the listener extracts taskId "task-456" and invokes the callback with the taskId and email content
3. **Given** an email listener is active and monitoring an inbox, **When** a new email arrives with a subject that does not contain a task ID pattern, **Then** the listener ignores the email and does not invoke the callback
4. **Given** an email listener is configured with invalid IMAP settings, **When** the listener attempts to start, **Then** the system rejects the operation with a clear validation error

---

### User Story 3 - Configuration Validation and Environment Setup (Priority: P2)

Developers and system administrators need to configure SMTP and IMAP settings for the email connector. The system validates these configurations to prevent runtime errors and provides clear examples of required configuration values.

**Why this priority**: While not the core user-facing functionality, proper configuration validation prevents operational issues and makes the system easier to set up and maintain. This is essential for reliable deployment.

**Independent Test**: Can be fully tested by attempting to create an email connector with various invalid configurations (missing fields, wrong types, invalid values) and verifying that validation errors are returned. Also test that a .env.sample file exists with clear examples of all required configuration values.

**Acceptance Scenarios**:

1. **Given** a developer wants to set up the email connector, **When** they reference the .env.sample file, **Then** they can see examples of all required SMTP and IMAP configuration fields with clear descriptions
2. **Given** an email connector is being instantiated, **When** SMTP configuration is provided with missing required fields, **Then** the system returns validation errors indicating which fields are missing or invalid
3. **Given** an email connector is being instantiated, **When** IMAP configuration is provided with invalid port numbers or host values, **Then** the system returns validation errors indicating the specific validation failures

---

### Edge Cases

- What happens when the email server is temporarily unavailable during sendEmail?
- How does the system handle emails with malformed subjects that partially match the task ID pattern?
- What happens when multiple emails arrive simultaneously with the same task ID?
- How does the listener handle connection failures or network interruptions?
- What happens when the callback function throws an error during email processing?
- How does the system handle very long email messages or attachments?
- What happens when an email subject contains multiple task ID patterns?
- How does the system handle special characters or encoding issues in email subjects or content?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an email connector class that accepts SMTP and IMAP configuration as constructor parameters
- **FR-002**: System MUST validate SMTP configuration using a Zod schema before allowing email operations
- **FR-003**: System MUST validate IMAP configuration using a Zod schema before allowing listener operations
- **FR-004**: System MUST provide a sendEmail method that accepts taskId (string), message (string), and optional options (record of unknown type)
- **FR-005**: System MUST construct email subject as "Support request: [#taskId]" where taskId is the provided task identifier
- **FR-006**: System MUST send emails via SMTP using the configured SMTP settings
- **FR-007**: System MUST allow SMTP-specific options to be passed through the options parameter to the sendEmail method
- **FR-008**: System MUST provide an exported email listener function that can monitor an inbox for new emails
- **FR-009**: System MUST trigger the listener callback whenever a new email arrives in the monitored inbox
- **FR-010**: System MUST extract taskId from email subject using regex pattern matching when processing incoming emails
- **FR-011**: System MUST only invoke the callback when a valid taskId is found in the email subject
- **FR-012**: System MUST pass the email content to the callback function when a taskId is successfully extracted
- **FR-013**: System MUST provide a .env.sample file with example SMTP and IMAP configuration values
- **FR-014**: System MUST place the email connector implementation in a new /connectors folder within the human-agent-proxy directory structure
- **FR-015**: System MUST handle email subject patterns that include reply prefixes (e.g., "Re:", "Fwd:") before the task ID pattern

### Key Entities *(include if feature involves data)*

- **Email Connector**: Represents the main class that encapsulates SMTP and IMAP configuration and provides email sending and listening capabilities. Key attributes include validated SMTP configuration, validated IMAP configuration, and connection state.
- **SMTP Configuration**: Represents the settings required to send emails via SMTP. Key attributes include host, port, security settings, and authentication credentials.
- **IMAP Configuration**: Represents the settings required to monitor an inbox for incoming emails. Key attributes include host, port, security settings, and authentication credentials.
- **Email Listener**: Represents the active monitoring process that watches for new emails and processes them. Key attributes include connection state, callback function, and monitoring status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: System successfully sends emails with correct subject format and message content within 5 seconds of sendEmail being called under normal network conditions
- **SC-002**: System detects and processes incoming emails with valid task IDs within 30 seconds of email delivery to the monitored inbox
- **SC-003**: System rejects invalid SMTP or IMAP configurations with clear, actionable error messages in 100% of validation attempts
- **SC-004**: System correctly extracts task IDs from email subjects with 100% accuracy for subjects matching the expected pattern format
- **SC-005**: System ignores emails without valid task ID patterns without errors or interruptions to the listener process
- **SC-006**: Developers can successfully configure the email connector using only the .env.sample file as reference in under 5 minutes

## Assumptions

- SMTP and IMAP servers are accessible from the human-agent-proxy deployment environment
- Email servers support standard SMTP (port 587/465) and IMAP (port 993) protocols
- The callback function provided to the listener is responsible for handling task routing and error management
- Email subjects may contain reply prefixes (Re:, Fwd:, etc.) that should be handled gracefully
- The system will handle one email connector instance per human-agent-proxy instance
- Task IDs in email subjects are expected to be alphanumeric strings, potentially with hyphens or underscores
- The email connector will be used primarily for support request workflows, not general email communication
- Network connectivity issues are transient and the system should handle reconnection attempts

## Dependencies

- Existing human-agent-proxy infrastructure and task management system
- Access to SMTP and IMAP email servers
- Zod library for schema validation (already present in dependencies)
- Email libraries for SMTP sending and IMAP monitoring (nodemailer and imap already present in dependencies)
