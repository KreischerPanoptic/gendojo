/**
 * Generic API response wrapper.
 *
 * GenDojo NestJS backend returns errors as:
 *   { statusCode, message, error? }
 *
 * Successful responses are the payload directly (no envelope).
 * This wrapper is used internally in the API layer for typed error handling.
 */
export interface ApiErrorResponse {
  statusCode: number
  message: string
  error?: string
}

/**
 * Wraps paginated list responses where the API returns an array.
 * Used for GET /datasets, GET /jobs etc.
 */
export type ListResponse<T> = T[]