import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiFailure } from '../../../core/models/api-response.model';
import { EvaluatorSummary } from '../../../core/models/evaluator.model';
import { EvaluatorService } from '../../../core/services/evaluator.service';

interface Banner {
  kind: 'success' | 'error';
  text: string;
}

@Component({
  selector: 'app-evaluators',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './evaluators.html',
})
export class Evaluators {
  private readonly fb = inject(FormBuilder);
  private readonly evaluatorService = inject(EvaluatorService);

  readonly evaluators = signal<EvaluatorSummary[]>([]);
  readonly loadingList = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly showCreateForm = signal(false);
  readonly creating = signal(false);
  readonly createErrors = signal<string[]>([]);

  readonly busyId = signal<number | null>(null);
  readonly banner = signal<Banner | null>(null);

  readonly form = this.fb.group({
    fullName: this.fb.control('', [Validators.required, Validators.maxLength(100)]),
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [Validators.required, Validators.minLength(8)]),
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loadingList.set(true);
    this.loadError.set(null);
    this.evaluatorService.getAll().subscribe({
      next: (list) => {
        this.evaluators.set(list);
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
    const { fullName, email, password } = this.form.getRawValue();

    this.evaluatorService.create({ fullName: fullName!, email: email!, password: password! }).subscribe({
      next: (evaluator) => {
        this.creating.set(false);
        this.showCreateForm.set(false);
        this.form.reset();
        this.banner.set({ kind: 'success', text: `Evaluator '${evaluator.fullName}' created.` });
        this.load();
      },
      error: (failure: ApiFailure) => {
        this.creating.set(false);
        this.createErrors.set(failure.errorMessages);
      },
    });
  }

  remove(evaluator: EvaluatorSummary): void {
    if (!confirm(`Delete ${evaluator.fullName}? This cannot be undone.`)) {
      return;
    }

    this.busyId.set(evaluator.id);
    this.evaluatorService.delete(evaluator.id).subscribe({
      next: (message) => {
        this.busyId.set(null);
        this.banner.set({ kind: 'success', text: message });
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