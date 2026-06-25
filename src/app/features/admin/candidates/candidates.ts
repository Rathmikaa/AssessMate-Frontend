import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiFailure } from '../../../core/models/api-response.model';
import { AssessmentSummary } from '../../../core/models/assessment.model';
import { CandidateSummary } from '../../../core/models/candidate.model';
import { AssessmentService } from '../../../core/services/assessment.service';
import { CandidateService } from '../../../core/services/candidate.service';

interface Banner {
  kind: 'success' | 'error';
  lines: string[];
}

@Component({
  selector: 'app-candidates',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './candidates.html',
})
export class Candidates {
  private readonly fb = inject(FormBuilder);
  private readonly candidateService = inject(CandidateService);
  private readonly assessmentService = inject(AssessmentService);

  readonly candidates = signal<CandidateSummary[]>([]);
  readonly assessments = signal<AssessmentSummary[]>([]);
  /** Inviting someone to a deactivated assessment would be pointless —
   *  they can't access it once they sign in (see CandidateAssessmentController). */
  readonly activeAssessments = computed(() => this.assessments().filter((a) => a.isActive));

  readonly loadingList = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly showCreateForm = signal(false);
  readonly creating = signal(false);
  readonly createErrors = signal<string[]>([]);

  /** Per-row pending state so clicking "Deactivate" on one row doesn't
   *  disable buttons on every other row while it's in flight. */
  readonly busyId = signal<number | null>(null);

  readonly banner = signal<Banner | null>(null);

  readonly form = this.fb.group({
    fullName: this.fb.control('', [Validators.required, Validators.maxLength(100)]),
    email: this.fb.control('', [Validators.required, Validators.email]),
    assessmentId: this.fb.control<number | null>(null),
  });

  constructor() {
    this.loadCandidates();
    this.assessmentService.getAllForAdmin().subscribe({
      next: (list) => this.assessments.set(list),
      error: () => this.assessments.set([]), // non-fatal — the picker just stays empty
    });
  }

  loadCandidates(): void {
    this.loadingList.set(true);
    this.loadError.set(null);
    this.candidateService.getAll().subscribe({
      next: (list) => {
        this.candidates.set(list);
        this.loadingList.set(false);
      },
      error: (failure: ApiFailure) => {
        this.loadError.set(failure.errorMessages.join(' '));
        this.loadingList.set(false);
      },
    });
  }

  toggleCreateForm(): void {
    this.showCreateForm.set(!this.showCreateForm());
    this.createErrors.set([]);
  }

  submitCreate(): void {
    this.createErrors.set([]);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.creating.set(true);
    const { fullName, email, assessmentId } = this.form.getRawValue();

    this.candidateService.create({ fullName: fullName!, email: email!, assessmentId }).subscribe({
      next: (outcome) => {
        this.creating.set(false);
        this.showCreateForm.set(false);
        this.form.reset();
        this.banner.set({ kind: 'success', lines: outcome.messages });
        this.loadCandidates();
      },
      error: (failure: ApiFailure) => {
        this.creating.set(false);
        this.createErrors.set(failure.errorMessages);
      },
    });
  }

  resendInvite(candidate: CandidateSummary): void {
    this.busyId.set(candidate.id);
    this.candidateService.resendInvite(candidate.id, {}).subscribe({
      next: (outcome) => this.handleActionResult(outcome.messages),
      error: (failure: ApiFailure) => this.handleActionError(failure),
    });
  }

  inviteToAssessment(candidate: CandidateSummary, assessmentId: number | null): void {
    if (!assessmentId) return;
    this.busyId.set(candidate.id);
    this.candidateService.inviteToAssessment(candidate.id, assessmentId).subscribe({
      next: (outcome) => this.handleActionResult(outcome.messages),
      error: (failure: ApiFailure) => this.handleActionError(failure),
    });
  }

  deactivate(candidate: CandidateSummary): void {
    if (!confirm(`Deactivate ${candidate.fullName}? They won't be able to log in until reactivated.`)) {
      return;
    }
    this.busyId.set(candidate.id);
    this.candidateService.deactivate(candidate.id).subscribe({
      next: (outcome) => {
        this.handleActionResult(outcome.messages);
        this.loadCandidates();
      },
      error: (failure: ApiFailure) => this.handleActionError(failure),
    });
  }

  reactivate(candidate: CandidateSummary): void {
    this.busyId.set(candidate.id);
    this.candidateService.reactivate(candidate.id).subscribe({
      next: (outcome) => {
        this.handleActionResult(outcome.messages);
        this.loadCandidates();
      },
      error: (failure: ApiFailure) => this.handleActionError(failure),
    });
  }

  dismissBanner(): void {
    this.banner.set(null);
  }

  private handleActionResult(messages: string[]): void {
    this.busyId.set(null);
    this.banner.set({ kind: 'success', lines: messages });
  }

  private handleActionError(failure: ApiFailure): void {
    this.busyId.set(null);
    this.banner.set({ kind: 'error', lines: failure.errorMessages });
  }
}