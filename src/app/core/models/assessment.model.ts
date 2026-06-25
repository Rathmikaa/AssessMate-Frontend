/** Mirrors AssessmentSummaryDto. Deliberately minimal for now — Create/
 *  Update request shapes and a full AssessmentDetail land in Phase 5
 *  when the Assessments CRUD page is built. */
export interface AssessmentSummary {
  id: number;
  title: string;
  description: string;
  durationMinutes: number;
  isActive: boolean;
  questionCount: number;
}