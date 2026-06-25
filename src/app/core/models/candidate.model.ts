/** Mirrors CandidateSummaryDto */
export interface CandidateSummary {
  id: number;
  fullName: string;
  email: string;
  isInvitePending: boolean;
  isActive: boolean;
  submissionCount: number;
}

/** Mirrors SubmissionSummaryDto as embedded in CandidateDetailDto */
export interface CandidateSubmissionSummary {
  submissionId: number;
  assessmentTitle: string;
  totalScore: number;
  maxPossibleScore: number;
  status: string;
  submittedAt: string; // ISO date string
}

/** Mirrors CandidateDetailDto */
export interface CandidateDetail extends CandidateSummary {
  submissions: CandidateSubmissionSummary[];
}

/** Mirrors CreateCandidateDto */
export interface CreateCandidateRequest {
  fullName: string;
  email: string;
  assessmentId?: number | null;
}

/** Mirrors ResendInviteDto */
export interface ResendInviteRequest {
  assessmentId?: number | null;
}