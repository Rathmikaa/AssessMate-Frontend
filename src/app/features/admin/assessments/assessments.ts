import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiFailure } from '../../../core/models/api-response.model';
import { AssessmentSummary } from '../../../core/models/assessment.model';
import { AssessmentService } from '../../../core/services/assessment.service';

interface Banner {
  kind: 'success' | 'error';
  text: string;
}

@Component({
  selector: 'app-assessments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './assessments.html',
})
export class Assessments {
  private readonly fb = inject(FormBuilder);
  private readonly assessmentService = inject(AssessmentService);

  readonly assessments = signal<AssessmentSummary[]>([]);
  readonly loadingList = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly showForm = signal(false);
  /** null = creating a new one; a number = editing that assessment's id. */
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);
  readonly formErrors = signal<string[]>([]);

  readonly busyId = signal<number | null>(null);
  readonly banner = signal<Banner | null>(null);

  readonly form = this.fb.group({
    title: this.fb.control('', [Validators.required, Validators.maxLength(200)]),
    description: this.fb.control(''),
    durationMinutes: this.fb.control(30, [Validators.required, Validators.min(1), Validators.max(480)]),
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loadingList.set(true);
    this.loadError.set(null);
    this.assessmentService.getAllForAdmin().subscribe({
      next: (list) => {
        this.assessments.set(list);
        this.loadingList.set(false);
      },
      error: (failure: ApiFailure) => {
        this.loadError.set(failure.errorMessages.join(' '));
        this.loadingList.set(false);
      },
    });
  }

  openCreateForm(): void {
    this.editingId.set(null);
    this.form.reset({ title: '', description: '', durationMinutes: 30 });
    this.formErrors.set([]);
    this.showForm.set(true);
  }

  openEditForm(a: AssessmentSummary): void {
    this.editingId.set(a.id);
    this.form.reset({
      title: a.title,
      description: a.description ?? '',
      durationMinutes: a.durationMinutes,
    });
    this.formErrors.set([]);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  submit(): void {
    this.formErrors.set([]);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const { title, description, durationMinutes } = this.form.getRawValue();
    const req = { title: title!, description: description || null, durationMinutes: durationMinutes! };
    const editingId = this.editingId();

    const onSuccess = () => {
      this.saving.set(false);
      this.showForm.set(false);
      this.banner.set({ kind: 'success', text: editingId ? 'Assessment updated.' : 'Assessment created.' });
      this.load();
    };
    const onError = (failure: ApiFailure) => {
      this.saving.set(false);
      this.formErrors.set(failure.errorMessages);
    };

    if (editingId) {
      this.assessmentService.update(editingId, req).subscribe({ next: onSuccess, error: onError });
    } else {
      this.assessmentService.create(req).subscribe({ next: onSuccess, error: onError });
    }
  }

  toggleActive(a: AssessmentSummary): void {
    this.busyId.set(a.id);
    this.assessmentService.toggleActive(a.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.load();
      },
      error: (failure: ApiFailure) => {
        this.busyId.set(null);
        this.banner.set({ kind: 'error', text: failure.errorMessages.join(' ') });
      },
    });
  }

  remove(a: AssessmentSummary): void {
    if (!confirm(`Delete "${a.title}"? This also deletes its questions and cannot be undone.`)) {
      return;
    }
    this.busyId.set(a.id);
    this.assessmentService.delete(a.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.banner.set({ kind: 'success', text: `Assessment "${a.title}" deleted.` });
        this.load();
      },
      error: (failure: ApiFailure) => {
        this.busyId.set(null);
        this.banner.set({ kind: 'error', text: failure.errorMessages.join(' ') });
      },
    });
  }

  dismissBanner(): void {
    this.banner.set(null);
  }
}