# Tasks: Email Listener and Connector

**Input**: Design documents from `/specs/001-email-connector/`
**Prerequisites**: spec.md (user stories with priorities)

**Tests**: Tests are not explicitly requested in the specification, so test tasks are not included. Focus is on implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Project structure**: `human-agent-proxy/src/connectors/` (new folder per spec requirement)
- All paths are relative to `human-agent-proxy/` directory

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create connectors directory structure at human-agent-proxy/src/connectors/
- [X] T002 [P] Create email connector directory at human-agent-proxy/src/connectors/email/
- [X] T003 [P] Create types directory at human-agent-proxy/src/connectors/email/types.ts for configuration types

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Create Zod schema for SMTP configuration in human-agent-proxy/src/connectors/email/schemas.ts
- [X] T005 [P] Create Zod schema for IMAP configuration in human-agent-proxy/src/connectors/email/schemas.ts
- [X] T006 Create configuration validation utility functions in human-agent-proxy/src/connectors/email/schemas.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Send Support Request via Email (Priority: P1) 🎯 MVP

**Goal**: Enable the human-agent-proxy to send emails to human agents with task identifiers in the subject line

**Independent Test**: Create an email connector instance with valid SMTP configuration, call sendEmail with a taskId and message, and verify that an email is delivered to the recipient's inbox with the correct subject format "Support request: [#taskId]" and message content.

### Implementation for User Story 1

- [X] T007 [US1] Create EmailConnector class constructor in human-agent-proxy/src/connectors/email/EmailConnector.ts that accepts SMTP and IMAP configuration parameters
- [X] T008 [US1] Implement configuration validation in EmailConnector constructor using Zod schemas from schemas.ts
- [X] T009 [US1] Create sendEmail method signature in human-agent-proxy/src/connectors/email/EmailConnector.ts accepting taskId (string), message (string), and optional options (Record<string, unknown>)
- [X] T010 [US1] Implement email subject construction as "Support request: [#taskId]" in sendEmail method
- [X] T011 [US1] Implement SMTP email sending logic using nodemailer in sendEmail method in human-agent-proxy/src/connectors/email/EmailConnector.ts
- [X] T012 [US1] Implement options parameter handling to pass SMTP-specific options through to nodemailer in sendEmail method
- [X] T013 [US1] Add error handling for SMTP connection failures and email sending errors in sendEmail method
- [X] T014 [US1] Export EmailConnector class from human-agent-proxy/src/connectors/email/index.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. You can create an EmailConnector instance and send emails with task IDs.

---

## Phase 4: User Story 2 - Receive and Process Email Responses (Priority: P1)

**Goal**: Automatically detect incoming emails, extract task identifiers from subjects, and route email content to callback handlers

**Independent Test**: Set up an email listener with valid IMAP configuration and a callback function, send a test email to the monitored inbox with a subject containing a task ID, and verify that the callback is invoked with the correct task ID and email content.

### Implementation for User Story 2

- [X] T015 [US2] Create task ID extraction utility function using regex pattern in human-agent-proxy/src/connectors/email/EmailConnector.ts that matches "Support request: [#taskId]" and handles reply prefixes (Re:, Fwd:, etc.)
- [X] T016 [US2] Create email listener function signature in human-agent-proxy/src/connectors/email/EmailConnector.ts that accepts a callback function parameter
- [X] T017 [US2] Implement IMAP connection setup and inbox monitoring in email listener function in human-agent-proxy/src/connectors/email/EmailConnector.ts
- [X] T018 [US2] Implement new email detection logic using IMAP mail events in email listener function
- [X] T019 [US2] Implement email parsing using mailparser in email listener function to extract subject and content
- [X] T020 [US2] Implement task ID extraction from email subject using regex utility in email listener function
- [X] T021 [US2] Implement callback invocation logic that only triggers when valid taskId is found in email listener function
- [X] T022 [US2] Pass email content (text or html) to callback function along with extracted taskId in email listener function
- [X] T023 [US2] Add error handling for IMAP connection failures, email parsing errors, and callback errors in email listener function
- [X] T024 [US2] Implement email marking as read after successful processing in email listener function
- [X] T025 [US2] Export email listener function from human-agent-proxy/src/connectors/email/index.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. You can send emails and receive/process email responses with task ID extraction.

---

## Phase 5: User Story 3 - Configuration Validation and Environment Setup (Priority: P2)

**Goal**: Provide clear configuration examples and ensure robust validation prevents runtime errors

**Independent Test**: Attempt to create an email connector with various invalid configurations (missing fields, wrong types, invalid values) and verify that validation errors are returned. Also verify that a .env.sample file exists with clear examples of all required configuration values.

### Implementation for User Story 3

- [X] T026 [US3] Create .env.sample file at human-agent-proxy/.env.sample with example SMTP configuration (host, port, secure, user, pass)
- [X] T027 [US3] Add example IMAP configuration to .env.sample file (host, port, user, password, tls settings)
- [X] T028 [US3] Add descriptive comments to .env.sample explaining each configuration field
- [X] T029 [US3] Enhance Zod schema validation error messages to be clear and actionable in human-agent-proxy/src/connectors/email/schemas.ts
- [X] T030 [US3] Add validation for port number ranges (valid SMTP/IMAP ports) in Zod schemas
- [X] T031 [US3] Add validation for required vs optional fields with clear error messages in Zod schemas
- [X] T032 [US3] Test configuration validation with various invalid inputs and verify error messages are helpful

**Checkpoint**: All user stories should now be independently functional. Configuration is well-documented and validated.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and edge case handling

- [X] T033 [P] Add connection retry logic for IMAP connection failures in email listener function
- [X] T034 [P] Add handling for malformed email subjects that partially match task ID pattern in task ID extraction utility
- [X] T035 [P] Add handling for multiple emails arriving simultaneously with same task ID in email listener function
- [X] T036 [P] Add error handling for callback function throwing errors during email processing in email listener function
- [X] T037 [P] Add handling for very long email messages in email listener function (content truncation or size limits)
- [X] T038 [P] Add handling for email subjects containing multiple task ID patterns (extract first valid one) in task ID extraction utility
- [X] T039 [P] Add handling for special characters and encoding issues in email subjects and content
- [X] T040 Add comprehensive logging for email sending, receiving, and processing operations
- [X] T041 Add JSDoc comments to EmailConnector class and all public methods
- [X] T042 Create README.md in human-agent-proxy/src/connectors/email/ with usage examples and configuration guide

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Stories 1 and 2 (both P1) can proceed in parallel after Foundational
  - User Story 3 (P2) can start after Foundational but may benefit from seeing US1/US2 patterns
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on US1, but shares EmailConnector class structure
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Enhances validation used by US1 and US2

### Within Each User Story

- Configuration validation before implementation
- Core class structure before methods
- Basic functionality before error handling
- Core implementation before edge cases
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks (T002, T003) marked [P] can run in parallel
- All Foundational tasks (T004, T005) marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, User Stories 1 and 2 can start in parallel (if team capacity allows)
- Polish tasks marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# These tasks can be done in parallel (different concerns):
Task: "Create EmailConnector class constructor in human-agent-proxy/src/connectors/email/EmailConnector.ts"
Task: "Create sendEmail method signature in human-agent-proxy/src/connectors/email/EmailConnector.ts"
```

---

## Parallel Example: User Story 2

```bash
# These tasks can be done in parallel (different utilities):
Task: "Create task ID extraction utility function using regex pattern in human-agent-proxy/src/connectors/email/EmailConnector.ts"
Task: "Create email listener function signature in human-agent-proxy/src/connectors/email/EmailConnector.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently by creating an EmailConnector and sending a test email
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP - can send emails!)
3. Add User Story 2 → Test independently → Deploy/Demo (Full bidirectional communication)
4. Add User Story 3 → Test independently → Deploy/Demo (Production-ready configuration)
5. Add Polish phase → Production hardening
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (sendEmail functionality)
   - Developer B: User Story 2 (email listener functionality)
3. Developer C: User Story 3 (configuration validation) can start after seeing US1/US2 patterns
4. All developers: Polish phase (edge cases, error handling)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- The EmailConnector class should encapsulate both SMTP (sending) and IMAP (listening) functionality
- The listener callback signature should be: `(taskId: string, emailContent: string) => void | Promise<void>`
- Configuration validation happens at EmailConnector instantiation time
- Email listener should handle reconnection automatically on connection failures

