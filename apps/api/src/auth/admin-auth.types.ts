import type { AdminRole } from '../generated/prisma/client';

export interface AuthenticatedAdmin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
}
