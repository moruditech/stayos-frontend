// Verified directly against src/middleware/errorHandler.js on the backend.
// `fields` is an array of { field, message } pairs — never a Record/map.
// A validators/error-mapping layer written against the wrong shape
// (packages/validators, Document 06) silently drops every field-level error.

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// CORRECTED FIELD NAME: verified directly against utils/ApiResponse.js —
// `ApiResponse.success(res, data, message, meta)` sends the pagination
// object under the key `meta`, not `pagination`. Nothing in the codebase
// read this field before now (client.ts's request() discarded everything
// but `data`), so the wrong name never surfaced as a runtime bug — it would
// have started silently once a paginated list screen was built against it.
export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: Pagination;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorPayload {
  code: string; // e.g. 'VALIDATION_ERROR', 'READ_ONLY_ACCESS', 'TOKEN_EXPIRED'
  message: string;
  fields?: ApiFieldError[];
  requestId: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
}

export type ApiEnvelope<T> = ApiResponse<T> | ApiErrorResponse;
