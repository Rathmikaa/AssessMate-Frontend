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
