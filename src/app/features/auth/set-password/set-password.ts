import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService, AuthFailure } from '../../../core/services/auth.service';
import { AmbientBackground } from '../../../shared/components/ambient-background/ambient-background';
import { ThemeToggle } from '../../../shared/components/theme-toggle/theme-toggle';
import { passwordsMatch } from '../../../shared/validators/password-match.validator';

@Component({
  selector: 'app-set-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AmbientBackground, ThemeToggle],
  templateUrl: './set-password.html',
})
export class SetPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  private readonly email = this.route.snapshot.queryParamMap.get('email');
  private readonly token = this.route.snapshot.queryParamMap.get('token');

  /** Carried through from the invite email when the admin invited this
   *  candidate straight to a specific assessment. There's no candidate
   *  assessment-detail route to deep-link into yet (a later phase) — for
   *  now this only changes the wording below. */
  readonly assessmentId = this.route.snapshot.queryParamMap.get('assessmentId');

  readonly linkInvalid = !this.email || !this.token;

  readonly form = this.fb.group(
    {
      password: this.fb.control('', [Validators.required, Validators.minLength(8)]),
      confirmPassword: this.fb.control('', [Validators.required]),
    },
    { validators: passwordsMatch },
  );

  readonly errors = signal<string[]>([]);
  readonly submitted = signal(false);
  readonly loading = this.auth.loading;

  submit(): void {
    this.errors.set([]);
    if (this.form.invalid || !this.email || !this.token) {
      this.form.markAllAsTouched();
      return;
    }

    const { password } = this.form.getRawValue();
    this.auth
      .resetPassword({ email: this.email, token: this.token, newPassword: password! })
      .subscribe({
        next: () => this.submitted.set(true),
        error: (failure: AuthFailure) => this.errors.set(failure.errorMessages),
      });
  }
}