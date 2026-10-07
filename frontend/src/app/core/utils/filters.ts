

export function isRealFilter(value: string | null | undefined): boolean {
  const text = (value ?? '').toString().trim();

  if (!text) {
    return false;
  }

  const normalized = text.toUpperCase();

  return normalized !== 'ALL' && normalized !== 'NULL' && normalized !== 'UNDEFINED';
}

export function buildFilters<T extends Record<string, string | undefined>>(
  source: T
): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(source)) {
    if (isRealFilter(value)) {
      result[key as keyof T] = value as T[keyof T];
    }
  }

  return result;
}