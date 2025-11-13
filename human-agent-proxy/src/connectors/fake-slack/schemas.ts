/**
 * Zod schemas for fake-slack connector configuration validation
 */

import { z } from "zod";
import type { FakeSlackConfig } from "./types.js";

/**
 * Zod schema for FakeSlack configuration
 */
export const fakeSlackConfigSchema = z
  .object({
    apiUrl: z
      .string("FakeSlack API URL must be a string")
      .min(1, "FakeSlack API URL cannot be empty")
      .url("FakeSlack API URL must be a valid URL")
      .trim(),
  })
  .passthrough(); // Allow additional properties for FakeSlack-specific options

/**
 * Validates FakeSlack configuration and returns validated config or throws error
 * @param config - FakeSlack configuration to validate
 * @returns Validated FakeSlack configuration
 * @throws ZodError if validation fails
 */
export function validateFakeSlackConfig(config: unknown): FakeSlackConfig {
  return fakeSlackConfigSchema.parse(config);
}

