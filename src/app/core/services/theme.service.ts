import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'assessmate.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** index.html's inline script already applies the correct theme to
   *  <html data-theme="..."> before Angular even bootstraps (avoids a
   *  flash of the wrong theme). This just reads that back as the
   *  signal's initial value and takes over keeping it in sync. */
  readonly theme = signal<Theme>(this.readInitial());

  constructor() {
    effect(() => {
      document.documentElement.setAttribute('data-theme', this.theme());
    });

    // Only keep following the OS preference live if the user has never
    // explicitly clicked the toggle — once they do, their choice sticks.
    if (!this.hasExplicitChoice()) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      media.addEventListener('change', (e) => {
        if (!this.hasExplicitChoice()) {
          this.theme.set(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  private hasExplicitChoice(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  private readInitial(): Theme {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}