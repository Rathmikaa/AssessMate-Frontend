import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService, AuthFailure } from '../../../core/services/auth.service';
import { AmbientBackground } from '../../../shared/components/ambient-background/ambient-background';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AmbientBackground],
  templateUrl: './login.html',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [Validators.required]),
  });

  readonly showPassword = signal(false);
  readonly errors = signal<string[]>([]);
  readonly loading = this.auth.loading;

  togglePassword(): void {
    this.showPassword.set(!this.showPassword());
  }

  submit(): void {
    this.errors.set([]);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();

    this.auth.login({ email: email!, password: password! }).subscribe({
      next: (result) => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl ?? this.auth.homeRouteFor(result.role));
      },
      error: (failure: AuthFailure) => this.errors.set(failure.errorMessages),
    });
  }
}
