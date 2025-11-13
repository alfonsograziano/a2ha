import type { Express } from "express";
import {
  FakeSlackConnector,
  type FakeSlackListenerCallback,
} from "./FakeSlackConnector.js";

export { FakeSlackConnector } from "./FakeSlackConnector.js";
export type { FakeSlackListenerCallback } from "./FakeSlackConnector.js";
export type { FakeSlackConfig } from "./types.js";
export { validateFakeSlackConfig } from "./schemas.js";

/**
 * Creates a fake-slack listener using a FakeSlackConnector instance
 * This is a convenience function that wraps the FakeSlackConnector's startFakeSlackListener method
 * @param connector - FakeSlackConnector instance
 * @param expressApp - Express application instance
 * @param callback - Callback function to invoke when a valid task ID is found
 */
export async function createFakeSlackListener(
  connector: FakeSlackConnector,
  expressApp: Express,
  callback: FakeSlackListenerCallback
): Promise<void> {
  return connector.startFakeSlackListener(expressApp, callback);
}

