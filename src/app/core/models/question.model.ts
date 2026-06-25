export type QuestionTypeValue = 'MCQ' | 'Descriptive';

/** Mirrors OptionResponseDto — includes isCorrect, unlike the option
 *  shape embedded in an AssessmentDetail (see assessment.model.ts). */
export interface QuestionOption {
  id: number;
  optionText: string;
  isCorrect: boolean;
}

/** Mirrors QuestionResponseDto */
export interface QuestionResponse {
  id: number;
  questionText: string;
  questionType: string;
  maxMarks: number;
  modelAnswer: string | null;
  options: QuestionOption[];
}

/** Mirrors CreateQuestionDto — used for both create and update; the
 *  backend's AdminQuestionController.Update reuses the same DTO type. */
export interface QuestionRequest {
  questionText: string;
  questionType: QuestionTypeValue;
  maxMarks: number;
  assessmentId: number;
  modelAnswer?: string | null;
  options?: string[] | null;
  correctOptionIndex?: number | null;
}