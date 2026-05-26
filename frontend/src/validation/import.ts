import { parseJsonObject, type ValidationResult } from './json';

interface ImportTaskPayload {
  title?: unknown;
}

interface ImportPayload {
  tasks?: unknown;
}

export function validateImportTasksPayload(text: string): ValidationResult<Record<string, unknown>> {
  const parsedResult = parseJsonObject(text);
  if (!parsedResult.parsed) return parsedResult;

  const payload = parsedResult.parsed as ImportPayload;
  const errors: string[] = [];

  if (!Array.isArray(payload.tasks)) {
    errors.push('Field "tasks" must be an array.');
  } else if (payload.tasks.length === 0) {
    errors.push('Field "tasks" must include at least one task.');
  } else {
    payload.tasks.forEach((item, index) => {
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        errors.push(`tasks[${index}] must be an object.`);
        return;
      }
      const task = item as ImportTaskPayload;
      if (typeof task.title !== 'string' || !task.title.trim()) {
        errors.push(`tasks[${index}].title must be a non-empty string.`);
      }
    });
  }

  return { parsed: parsedResult.parsed, errors };
}
