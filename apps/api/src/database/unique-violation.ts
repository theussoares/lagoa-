const UNIQUE_VIOLATION = '23505'

interface PgErrorShape {
  readonly code?: string
  readonly constraint_name?: string
  readonly cause?: unknown
}

function asPgError(value: unknown): PgErrorShape | null {
  return typeof value === 'object' && value !== null ? value : null
}

/** Nome da constraint única violada, ou `null` se o erro é outro. O Drizzle embrulha o erro do driver em `cause`. */
export function uniqueViolationConstraint(error: unknown): string | null {
  for (let current = asPgError(error); current !== null; current = asPgError(current.cause)) {
    if (current.code === UNIQUE_VIOLATION) return current.constraint_name ?? ''
  }
  return null
}
