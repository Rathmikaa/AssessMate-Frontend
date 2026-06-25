import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { AuthService } from './core/services/auth.service';
import { Shell } from './layout/shell/shell';
import { PlaceholderPage } from './shared/components/placeholder-page/placeholder-page';

/** '/' has no inherent meaning once you're signed in — send the user to
 *  their own role's dashboard rather than guessing. */
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
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    // Reached from an admin-created candidate's invite email.
    path: 'set-password',
    loadComponent: () => import('./features/auth/set-password/set-password').then((m) => m.SetPassword),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', canActivate: [roleHomeRedirect], children: [] },

      // ── SuperAdmin ───────────────────────────────────────────
      {
        path: 'superadmin',
        canActivate: [roleGuard],
        data: { role: 'SuperAdmin' },
        children: [
          {
            path: 'evaluators',
            loadComponent: () =>
              import('./features/superadmin/evaluators/evaluators').then((m) => m.Evaluators),
          },
        ],
      },

      // ── Evaluator ────────────────────────────────────────────
      // URL segment stays "admin" to match the backend's own routes
      // (api/admin/...) even though the role is "Evaluator", not "Admin".
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { role: 'Evaluator' },
        children: [
          {
            path: 'dashboard',
            component: PlaceholderPage,
            data: {
              title: 'Evaluator dashboard',
              description: 'Assessment volume, recent submissions, and at-a-glance candidate progress will live here.',
            },
          },
          {
            path: 'assessments',
            loadComponent: () =>
              import('./features/admin/assessments/assessments').then((m) => m.Assessments),
          },
          {
            path: 'assessments/:id/questions',
            loadComponent: () => import('./features/admin/questions/questions').then((m) => m.Questions),
          },
          {
            path: 'candidates',
            loadComponent: () =>
              import('./features/admin/candidates/candidates').then((m) => m.Candidates),
          },
          {
            path: 'candidates/:id',
            loadComponent: () =>
              import('./features/admin/candidate-profile/candidate-profile').then(
                (m) => m.CandidateProfile,
              ),
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