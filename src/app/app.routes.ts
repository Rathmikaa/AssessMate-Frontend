import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { AuthService } from './core/services/auth.service';
import { Shell } from './layout/shell/shell';
import { PlaceholderPage } from './shared/components/placeholder-page/placeholder-page';

/** '/' has no inherent meaning once you're signed in — send the user to
 *  their own role's dashboard rather than guessing Admin vs Candidate. */
const roleHomeRedirect: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.role();
  return router.createUrlTree([role ? auth.homeRouteFor(role) : '/login']);
};

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', canActivate: [roleHomeRedirect], children: [] },

      // ── Admin ────────────────────────────────────────────────
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { role: 'Admin' },
        children: [
          {
            path: 'dashboard',
            component: PlaceholderPage,
            data: {
              title: 'Admin dashboard',
              description: 'Assessment volume, recent submissions, and at-a-glance candidate progress will live here.',
            },
          },
          {
            path: 'assessments',
            component: PlaceholderPage,
            data: {
              title: 'Assessments',
              description: 'Create, edit, and publish assessments — backed by GET/POST/PUT/DELETE on api/admin/assessments.',
            },
          },
          {
            path: 'questions',
            component: PlaceholderPage,
            data: {
              title: 'Questions',
              description: 'Manage the question bank per assessment — backed by api/admin/questions.',
            },
          },
          {
            path: 'results',
            component: PlaceholderPage,
            data: {
              title: 'Results',
              description: 'Review graded submissions across all candidates — backed by api/admin/results.',
            },
          },
        ],
      },

      // ── Candidate ────────────────────────────────────────────
      {
        path: 'candidate',
        canActivate: [roleGuard],
        data: { role: 'Candidate' },
        children: [
          {
            path: 'dashboard',
            component: PlaceholderPage,
            data: {
              title: 'Your dashboard',
              description: 'Upcoming and completed assessments will be summarized here.',
            },
          },
          {
            path: 'assessments',
            component: PlaceholderPage,
            data: {
              title: 'My assessments',
              description: 'Assessments assigned to you — backed by api/candidate/assessments.',
            },
          },
          {
            path: 'submissions',
            component: PlaceholderPage,
            data: {
              title: 'Submissions',
              description: 'The in-progress test-taking flow will live here — backed by api/candidate/submissions.',
            },
          },
          {
            path: 'results',
            component: PlaceholderPage,
            data: {
              title: 'My results',
              description: 'Your scored submissions — backed by api/candidate/results.',
            },
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
