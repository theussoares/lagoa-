import { describe, expect, it } from 'vitest'
import type { TransportError } from '#shared/types/errors'
import type { AsyncResultState } from '../app/types/asyncResult'
import type { ErrorCarrier } from '../app/types/error'
import { errorCodeOf, hasErrorCode } from '../app/utils/errorCode'

const loading: ErrorCarrier = { status: 'loading' }
const success: ErrorCarrier = { status: 'success' }
const nestedUnauthorized: ErrorCarrier = { status: 'error', error: { code: 'unauthorized' } }
const flatSuspended: ErrorCarrier = { status: 'error', code: 'shopSuspended' }

describe('errorCodeOf', () => {
  it('reads the code nested in `error` (service result state)', () => {
    expect(errorCodeOf(nestedUnauthorized)).toBe('unauthorized')
  })

  it('reads the flat `code` (composable state)', () => {
    expect(errorCodeOf(flatSuspended)).toBe('shopSuspended')
  })

  it('is null for states that are not in error', () => {
    expect(errorCodeOf(loading)).toBeNull()
    expect(errorCodeOf(success)).toBeNull()
  })

  it('accepts the state of useAsyncResult as is', () => {
    const state: AsyncResultState<number, TransportError> = { status: 'error', error: { code: 'network' } }
    expect(errorCodeOf(state)).toBe('network')
  })

  it('is null for an error state that carries no code', () => {
    expect(errorCodeOf({ status: 'error' })).toBeNull()
  })

  it('ignores a code on a state that is not in error', () => {
    expect(errorCodeOf({ status: 'idle', code: 'unauthorized' })).toBeNull()
  })
})

describe('hasErrorCode', () => {
  it('is true when any state is in error with a listed code', () => {
    expect(hasErrorCode([loading, flatSuspended, success], ['unauthorized', 'shopSuspended'])).toBe(true)
  })

  it('matches both state shapes', () => {
    expect(hasErrorCode([nestedUnauthorized], ['unauthorized'])).toBe(true)
    expect(hasErrorCode([flatSuspended], ['shopSuspended'])).toBe(true)
  })

  it('is false when the error code is not listed', () => {
    expect(hasErrorCode([flatSuspended], ['unauthorized'])).toBe(false)
  })

  it('is false for states without error and for no states', () => {
    expect(hasErrorCode([loading, success], ['unauthorized'])).toBe(false)
    expect(hasErrorCode([], ['unauthorized'])).toBe(false)
  })

  it('is false when no code is asked for', () => {
    expect(hasErrorCode([nestedUnauthorized], [])).toBe(false)
  })
})
