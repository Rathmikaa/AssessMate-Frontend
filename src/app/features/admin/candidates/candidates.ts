import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ApiFailure } from '../../../core/models/api-response.model';
import { AssessmentSummary } from '../../../core/models/assessment.model';
import { CandidateSummary } from '../../../core/models/candidate.model';
import { AssessmentService } from '../../../core/services/assessment.service';
import { CandidateService } from '../../../core/services/candidate.service';
import { Pagination } from '../../../shared/components/pagination/pagination';

interface Banner {
  kind: 'success' | 'error';
  lines: string[];
}

const PAGE_SIZE = 10;

@Component({
  selector: 'app-candidates',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Pagination],
  templateUrl: './candidates.html',
})
export class Candidates {
  private readonly fb = inject(FormBuilder);
  private readonly candidateService = inject(CandidateService);
  private readonly assessmentService = inject(AssessmentService);

  readonly candidates = signal<CandidateSummary[]>([]);
  readonly totalCount = signal(0);
  readonly assessments = signal<AssessmentSummary[]>([]);
  /** Inviting someone to a deactivated assessment would be pointless —
   *  they can't access it once they sign in (see CandidateAssessmentController). */
  readonly activeAssessments = computed(() => this.assessments().filter((a) => a.isActive));

  readonly loadingList = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly searchTerm = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = PAGE_SIZE;

  /** Per-row "invite to assessment" selection, keyed by candidate id. NOT
   *  read off a #template-ref <select>'s raw .value — this app runs
   *  zoneless (no zone.js), so a native `change` event Angular was never
   *  bound to doesn't trigger a re-render, which left [disabled] and the
   *  click handler reading a stale value and the Send button stuck
   *  disabled. A signal written via an explicit (change) binding sidesteps
   *  that entirely. */
  readonly selectedAssessmentByCandidate = signal<Record<number, number | null>>({});

  /** debounceTime(300) so we're not firing a request on every keystroke —
   *  takeUntilDestroyed cleans the subscription up automatically when this
   *  component is destroyed, no manual unsubscribe needed. */
  private readonly searchInput$ = new Subject<string>();

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

    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.currentPage.set(1); // a new search result set always starts back at page 1
        this.loadCandidates();
      });

    // There's no live push yet for "a candidate activated their account"
    // (unlike assessment-taking activity, which the SignalR hub already
    // covers) — so this list can go stale the moment that happens in
    // another tab. Refetching on tab focus is a lightweight stand-in for
    // a real-time signal, without polling on a timer.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        this.loadCandidates();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('visibilitychange', onVisible));
  }

  loadCandidates(): void {
    this.loadingList.set(true);
    this.loadError.set(null);
    this.candidateService.getAll(this.currentPage(), this.pageSize, this.searchTerm()).subscribe({
      next: (paged) => {
        this.candidates.set(paged.items);
        this.totalCount.set(paged.totalCount);
        this.loadingList.set(false);
      },
      error: (failure: ApiFailure) => {
        this.loadError.set(failure.errorMessages.join(' '));
        this.loadingList.set(false);
      },
    });
  }

  onSearchInput(value: string): void {
    this.searchInput$.next(value);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadCandidates();
  }

  pickerValue(candidateId: number): number | null {
    return this.selectedAssessmentByCandidate()[candidateId] ?? null;
  }

  onPickerChange(candidateId: number, rawValue: string): void {
    const value = rawValue ? Number(rawValue) : null;
    this.selectedAssessmentByCandidate.set({ ...this.selectedAssessmentByCandidate(), [candidateId]: value });
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

  inviteToAssessment(candidate: CandidateSummary): void {
    const assessmentId = this.pickerValue(candidate.id);
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