export interface ValidationResult<T> {
  parsed?: T;
  errors: string[];
}

export function parseJsonObject(text: string): ValidationResult<Record<string, unknown>> {
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
      return { errors: ['JSON body must be an object.'] };
    }
    return { parsed: parsed as Record<string, unknown>, errors: [] };
  } catch (error) {
    return { errors: [`Invalid JSON: ${String(error)}`] };
  }
}
