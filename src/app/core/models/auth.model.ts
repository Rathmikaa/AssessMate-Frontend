export type AppRole = 'Admin' | 'Candidate';

/** Mirrors AIAssessment.Application.DTOs.Auth.AuthResultDto */
export interface AuthResult {
  userId: number;
  fullName: string;
  email: string;
  role: AppRole;
  token: string;
  expiresAt: string; // ISO date string
}

/** Mirrors LoginDto */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Mirrors RegisterDto — note: the API always assigns the "Candidate"
 *  role server-side on registration. There is no self-serve Admin
 *  signup, by design. */
export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}
