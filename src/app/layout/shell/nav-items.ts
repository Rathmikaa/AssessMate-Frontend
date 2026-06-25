import { AppRole } from '../../core/models/auth.model';

export interface NavItem {
  label: string;
  route: string;
  icon: 'grid' | 'doc' | 'help' | 'chart' | 'send' | 'users';
}

export const NAV_ITEMS: Record<AppRole, NavItem[]> = {
  SuperAdmin: [{ label: 'Evaluators', route: '/superadmin/evaluators', icon: 'users' }],
  Evaluator: [
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'grid' },
    { label: 'Assessments', route: '/admin/assessments', icon: 'doc' },
    { label: 'Questions', route: '/admin/questions', icon: 'help' },
    { label: 'Candidates', route: '/admin/candidates', icon: 'users' },
    { label: 'Results', route: '/admin/results', icon: 'chart' },
  ],
  Candidate: [
    { label: 'Dashboard', route: '/candidate/dashboard', icon: 'grid' },
    { label: 'My Assessments', route: '/candidate/assessments', icon: 'doc' },
    { label: 'Submissions', route: '/candidate/submissions', icon: 'send' },
    { label: 'My Results', route: '/candidate/results', icon: 'chart' },
  ],
};