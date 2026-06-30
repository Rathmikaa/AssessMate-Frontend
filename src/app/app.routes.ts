import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { AuthService } from './core/services/auth.service';
import { Shell } from './layout/shell/shell';

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
            loadComponent: () =>
              import('./features/admin/dashboard/dashboard').then((m) => m.EvaluatorDashboard),
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
            loadComponent: () => import('./features/admin/results/results').then((m) => m.Results),
          },
          {
            path: 'results/:submissionId',
            loadComponent: () =>
              import('./features/admin/result-detail/result-detail').then((m) => m.AdminResultDetail),
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
            loadComponent: () =>
              import('./features/candidate/dashboard/dashboard').then((m) => m.CandidateDashboard),
          },
          {
            path: 'assessments',
            loadComponent: () =>
              import('./features/candidate/my-assessments/my-assessments').then((m) => m.CandidateAssessments),
          },
          {
            path: 'assessments/:id',
            loadComponent: () =>
              import('./features/candidate/take-assessment/take-assessment').then((m) => m.TakeAssessment),
          },
          {
            path: 'results',
            loadComponent: () =>
              import('./features/candidate/my-results/my-results').then((m) => m.MyResults),
          },
          {
            path: 'results/:submissionId',
            loadComponent: () =>
              import('./features/candidate/result-detail/result-detail').then((m) => m.ResultDetail),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];