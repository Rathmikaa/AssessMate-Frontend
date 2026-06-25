import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Attach as a group-level validator on any FormGroup with 'password' and
 *  'confirmPassword' controls. Sets a 'mismatch' error on the GROUP (not
 *  on either control) when they differ and both have a value. */
export function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pw && confirm && pw !== confirm ? { mismatch: true } : null;
}