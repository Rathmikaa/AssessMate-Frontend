import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService, AuthFailure } from '../../../core/services/auth.service';
import { AmbientBackground } from '../../../shared/components/ambient-background/ambient-background';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pw && confirm && pw !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AmbientBackground],
  templateUrl: './register.html',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.group(
    {
      fullName: this.fb.control('', [Validators.required, Validators.maxLength(100)]),
      email: this.fb.control('', [Validators.required, Validators.email]),
      password: this.fb.control('', [Validators.required, Validators.minLength(8)]),
      confirmPassword: this.fb.control('', [Validators.required]),
    },
    { validators: passwordsMatch },
  );

  readonly errors = signal<string[]>([]);
  readonly loading = this.auth.loading;

  submit(): void {
    this.errors.set([]);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { fullName, email, password } = this.form.getRawValue();

    this.auth.register({ fullName: fullName!, email: email!, password: password! }).subscribe({
      next: (result) => this.router.navigateByUrl(this.auth.homeRouteFor(result.role)),
      error: (failure: AuthFailure) => this.errors.set(failure.errorMessages),
    });
  }
}
