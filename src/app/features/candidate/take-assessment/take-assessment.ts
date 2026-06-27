import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApiFailure } from '../../../core/models/api-response.model';
import { AssessmentDetail, AssessmentQuestionSummary } from '../../../core/models/assessment.model';
import { AnswerSubmission } from '../../../core/models/submission.model';
import { CandidateAssessmentService } from '../../../core/services/candidate-assessment.service';
import { SubmissionService } from '../../../core/services/submission.service';

interface AnswerState {
  selectedOptionId?: number;
  answerText?: string;
}

@Component({
  selector: 'app-take-assessment',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './take-assessment.html',
})
export class TakeAssessment {
  private readonly route = inject(ActivatedRoute);
  private readonly assessmentService = inject(CandidateAssessmentService);
  private readonly submissionService = inject(SubmissionService);

  readonly assessmentId = Number(this.route.snapshot.paramMap.get('id'));

  readonly assessment = signal<AssessmentDetail | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly currentIndex = signal(0);
  /** questionId -> the answer recorded for it so far. */
  readonly answers = signal<Record<number, AnswerState>>({});

  readonly secondsRemaining = signal(0);
  private timerHandle?: ReturnType<typeof setInterval>;

  readonly submitting = signal(false);
  readonly submitError = signal<string[]>([]);
  readonly result = signal<{ totalScore: number; maxPossibleScore: number } | null>(null);

  readonly currentQuestion = computed<AssessmentQuestionSummary | null>(() => {
    const a = this.assessment();
    if (!a) return null;
    return a.questions[this.currentIndex()] ?? null;
  });

  readonly answeredCount = computed(() => {
    const answers = this.answers();
    return Object.keys(answers).filter((id) => this.isAnswered(Number(id))).length;
  });

  constructor() {
    // GET-ing this endpoint is what triggers the backend's SignalR
    // "CandidateStarted" signal — nothing extra needed here for that.
    this.assessmentService.getById(this.assessmentId).subscribe({
      next: (a) => {
        this.assessment.set(a);
        this.loading.set(false);
        this.startTimer(a.durationMinutes * 60);
      },
      error: (failure: ApiFailure) => {
        this.loadError.set(failure.errorMessages.join(' '));
        this.loading.set(false);
      },
    });

    inject(DestroyRef).onDestroy(() => this.stopTimer());
  }

  formattedTime(): string {
    const total = this.secondsRemaining();
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  selectOption(questionId: number, optionId: number): void {
    this.answers.set({ ...this.answers(), [questionId]: { selectedOptionId: optionId } });
  }

  setAnswerText(questionId: number, text: string): void {
    this.answers.set({ ...this.answers(), [questionId]: { answerText: text } });
  }

  isAnswered(questionId: number): boolean {
    const a = this.answers()[questionId];
    return !!a && (a.selectedOptionId !== undefined || !!a.answerText?.trim());
  }

  goTo(index: number): void {
    this.currentIndex.set(index);
  }

  next(): void {
    const a = this.assessment();
    if (!a) return;
    this.currentIndex.set(Math.min(this.currentIndex() + 1, a.questions.length - 1));
  }

  previous(): void {
    this.currentIndex.set(Math.max(this.currentIndex() - 1, 0));
  }

  confirmSubmit(): void {
    const a = this.assessment();
    if (!a) return;

    const unanswered = a.questions.length - this.answeredCount();
    if (unanswered > 0 && !confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) {
      return;
    }
    this.submit();
  }

  private startTimer(totalSeconds: number): void {
    this.secondsRemaining.set(totalSeconds);
    this.timerHandle = setInterval(() => {
      const next = this.secondsRemaining() - 1;
      this.secondsRemaining.set(Math.max(next, 0));
      if (next <= 0) {
        this.stopTimer();
        this.submit(); // time's up — submit whatever's been answered, no confirmation
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerHandle) clearInterval(this.timerHandle);
  }

  private submit(): void {
    if (this.submitting() || this.result()) return; // guards against the timer and a manual click racing

    const answersPayload: AnswerSubmission[] = Object.entries(this.answers())
      .filter(([, a]) => a.selectedOptionId !== undefined || !!a.answerText?.trim())
      .map(([questionId, a]) => ({
        questionId: Number(questionId),
        selectedOptionId: a.selectedOptionId ?? null,
        answerText: a.answerText ?? null,
      }));

    // The backend rejects an empty Answers array at the model-validation
    // level with a generic 400, before it ever reaches SubmissionService —
    // catching it here first gives a clearer message instead.
    if (answersPayload.length === 0) {
      this.submitError.set(['Answer at least one question before submitting.']);
      return;
    }

    this.submitting.set(true);
    this.submitError.set([]);

    this.submissionService
      .submit({ assessmentId: this.assessmentId, answers: answersPayload })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.stopTimer();
          this.result.set({ totalScore: res.totalScore, maxPossibleScore: res.maxPossibleScore });
        },
        error: (failure: ApiFailure) => {
          this.submitting.set(false);
          this.submitError.set(failure.errorMessages);
        },
      });
  }
}