export function serializeRow<T extends Record<string, unknown>>(row: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[key] = value instanceof Date ? value.toISOString() : value;
  }
  return result as T;
}

export function serializeRows<T extends Record<string, unknown>>(
  rows: T[]
): T[] {
  return rows.map(serializeRow);
}
