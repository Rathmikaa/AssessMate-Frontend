/**
 * Every AssessMate API response — success or error — is wrapped in this
 * shape by BaseController.ToResponse(). Always read `body` for the
 * payload and `errorMessages` / `messages` for user-facing text.
 */
export interface ApiResponse<T> {
  statusCode: number;
  isSuccess: boolean;
  messages: string[];
  errorMessages: string[];
  body: T | null;
}

/** Generic version of AuthService's AuthFailure — used by feature services
 *  outside the auth area (Candidates, and later Assessments/Questions/
 *  Submissions) so they don't all need their own copy of the same shape.
 *  AuthFailure itself is left as-is in auth.service.ts to avoid touching
 *  the five auth pages that already import it from there. */
export interface ApiFailure {
  statusCode: number;
  errorMessages: string[];
}

/** A successful response that's still worth showing messages for — e.g.
 *  candidate creation can succeed (201) while also warning "...but the
 *  invite email failed to send." */
export interface ApiOutcome<T> {
  body: T | null;
  messages: string[];
}