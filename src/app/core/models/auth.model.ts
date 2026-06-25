export type AppRole = 'SuperAdmin' | 'Evaluator' | 'Candidate';

/** Mirrors AIAssessment.Application.DTOs.Auth.AuthResultDto */
export interface AuthResult {
  userId: number;
  fullName: string;
  email: string;
  role: AppRole;
  token: string;
  refreshToken: string;
  expiresAt: string; // ISO date string
}

/** Mirrors LoginDto */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Mirrors RegisterDto — note: the API always assigns the "Candidate"
 *  role server-side on registration. There is no self-serve Evaluator or
 *  SuperAdmin signup — Evaluators are created by a SuperAdmin, and
 *  SuperAdmin is a seeded account only. */
export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

/** Mirrors ForgotPasswordDto */
export interface ForgotPasswordRequest {
  email: string;
}

/** Mirrors ResetPasswordDto — also reused for accepting an admin's
 *  candidate invite, since the backend's reset-password endpoint works
 *  whether or not the account had a password set yet. */
export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

/** Mirrors RefreshTokenDto */
export interface RefreshTokenRequest {
  refreshToken: string;
}