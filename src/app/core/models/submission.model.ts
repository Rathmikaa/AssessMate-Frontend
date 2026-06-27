/** Mirrors AnswerDto */
export interface AnswerSubmission {
  questionId: number;
  selectedOptionId?: number | null;
  answerText?: string | null;
}

/** Mirrors SubmitAssessmentDto */
export interface SubmitAssessmentRequest {
  assessmentId: number;
  answers: AnswerSubmission[];
}

/** Mirrors SubmissionResultDto — returned immediately after submitting. */
export interface SubmissionResult {
  submissionId: number;
  assessmentTitle: string;
  totalScore: number;
  maxPossibleScore: number;
  status: string;
  submittedAt: string; // ISO date string
}

/** Mirrors SubmissionSummaryDto */
export interface SubmissionSummary {
  submissionId: number;
  assessmentTitle: string;
  totalScore: number;
  maxPossibleScore: number;
  status: string;
  submittedAt: string;
  // Only populated in the admin/evaluator results view — always null here.
  candidateName?: string | null;
  candidateEmail?: string | null;
}

/** Mirrors AnswerDetailDto */
export interface AnswerDetail {
  questionId: number;
  questionText: string;
  questionType: string;
  maxMarks: number;
  userAnswer: string | null;
  correctAnswer: string | null;
  score: number;
}

/** Mirrors SubmissionDetailDto */
export interface SubmissionDetail {
  submissionId: number;
  assessmentTitle: string;
  totalScore: number;
  maxPossibleScore: number;
  status: string;
  submittedAt: string;
  answers: AnswerDetail[];
}