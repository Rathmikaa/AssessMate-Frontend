/** Mirrors AssessmentSummaryDto */
export interface AssessmentSummary {
  id: number;
  title: string;
  description: string | null;
  durationMinutes: number;
  isActive: boolean;
  questionCount: number;
}

/** Mirrors OptionDto as embedded in AssessmentDetailDto's questions —
 *  no isCorrect here, same as what a candidate would see. The full
 *  option shape with isCorrect lives in question.model.ts's
 *  QuestionOption, returned only by the dedicated Question endpoints. */
export interface AssessmentOption {
  id: number;
  optionText: string;
}

/** Mirrors QuestionInAssessmentDto */
export interface AssessmentQuestionSummary {
  id: number;
  questionText: string;
  questionType: string;
  maxMarks: number;
  options: AssessmentOption[] | null;
}

/** Mirrors AssessmentDetailDto */
export interface AssessmentDetail {
  id: number;
  title: string;
  description: string | null;
  durationMinutes: number;
  isActive: boolean;
  createdAt: string; // ISO date string
  questions: AssessmentQuestionSummary[];
}

/** Mirrors CreateAssessmentDto / UpdateAssessmentDto — identical shape
 *  for both, so one request type covers create and update. */
export interface AssessmentRequest {
  title: string;
  description?: string | null;
  durationMinutes: number;
}