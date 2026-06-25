import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { AmbientBackground } from '../../shared/components/ambient-background/ambient-background';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import { NAV_ITEMS } from './nav-items';

@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, AmbientBackground, NgTemplateOutlet, ThemeToggle],
  templateUrl: './shell.html',
})
export class Shell {
  private readonly auth = inject(AuthService);

  readonly mobileNavOpen = signal(false);

  readonly user = this.auth.currentUser;
  readonly navItems = computed(() => {
    const role = this.auth.role();
    return role ? NAV_ITEMS[role] : [];
  });

  readonly initials = computed(() => {
    const name = this.user()?.fullName ?? '';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');
  });

  toggleMobileNav(): void {
    this.mobileNavOpen.set(!this.mobileNavOpen());
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  logout(): void {
    this.auth.logout().subscribe();
  }
}