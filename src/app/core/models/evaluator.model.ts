/** Normalized shape used throughout the frontend — the backend's two
 *  evaluator endpoints actually return this data under different key
 *  names (fullName vs userName); EvaluatorService normalizes both into
 *  this one shape so components don't need to know about it. */
export interface EvaluatorSummary {
  id: number;
  fullName: string;
  email: string;
}

/** Mirrors CreateEvaluatorDto */
export interface CreateEvaluatorRequest {
  fullName: string;
  email: string;
  password: string;
}