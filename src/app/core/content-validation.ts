export function requireContent(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('Invalid learning content: ' + message);
}
export const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
export const integer = (value: unknown, min = 0): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min;
export const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(nonempty);
export const distinct = (values: readonly unknown[]) => new Set(values).size === values.length;
export const cefr = (value: unknown) => ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(String(value));
