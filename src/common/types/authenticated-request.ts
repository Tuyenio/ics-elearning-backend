import type { Request } from 'express';
import { UserRole } from '../../users/entities/user.entity';

export interface AuthenticatedRequestUser {
  id: string;
  role: UserRole;
}

export type AuthenticatedRequest = Request & { user: AuthenticatedRequestUser };
