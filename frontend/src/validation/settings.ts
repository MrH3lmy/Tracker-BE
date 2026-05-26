import { parseJsonObject, type ValidationResult } from './json';

export function validateSettingsPayload(text: string): ValidationResult<Record<string, unknown>> {
  return parseJsonObject(text);
}
