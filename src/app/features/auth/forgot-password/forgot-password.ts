import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService, AuthFailure } from '../../../core/services/auth.service';
import { AmbientBackground } from '../../../shared/components/ambient-background/ambient-background';
import { ThemeToggle } from '../../../shared/components/theme-toggle/theme-toggle';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AmbientBackground, ThemeToggle],
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
  });

  readonly errors = signal<string[]>([]);
  readonly submitted = signal(false);
  readonly loading = this.auth.loading;

  submit(): void {
    this.errors.set([]);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email } = this.form.getRawValue();
    this.auth.forgotPassword({ email: email! }).subscribe({
      next: () => this.submitted.set(true),
      error: (failure: AuthFailure) => this.errors.set(failure.errorMessages),
    });
  }
}