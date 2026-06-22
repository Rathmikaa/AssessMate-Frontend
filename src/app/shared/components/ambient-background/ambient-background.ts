import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Decorative, non-interactive backdrop shared by the auth screens and
 * the app shell. Carries the one signature visual motif of the app: a
 * ring with a single open notch — like a clock face missing a tick —
 * that drifts in a slow, continuous rotation. It's a quiet nod to what
 * AssessMate actually is: a place where assessments run against a clock.
 */
@Component({
  selector: 'app-ambient-background',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ambient-background.html',
})
export class AmbientBackground {
  /** 'hero' = large, prominent ring for the auth screens.
   *  'subtle' = smaller, dimmer ring for behind the app shell. */
  readonly variant = input<'hero' | 'subtle'>('hero');

  private readonly radius = 260;
  private readonly circumference = computed(() => 2 * Math.PI * this.radius);
  private readonly gap = 70;

  readonly dashArray = computed(() => `${this.circumference() - this.gap} ${this.gap}`);

  readonly ringWrapperClass = computed(() =>
    this.variant() === 'hero'
      ? 'w-[640px] h-[640px] -top-32 -right-40 opacity-30'
      : 'w-[380px] h-[380px] -top-24 -left-24 opacity-10',
  );

  readonly ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 360;
    const rad = (angle * Math.PI) / 180;
    const cx = 300 + this.radius * Math.sin(rad);
    const cy = 300 - this.radius * Math.cos(rad);
    const innerR = this.radius - 14;
    const ix = 300 + innerR * Math.sin(rad);
    const iy = 300 - innerR * Math.cos(rad);
    return { x1: ix, y1: iy, x2: cx, y2: cy };
  });
}
