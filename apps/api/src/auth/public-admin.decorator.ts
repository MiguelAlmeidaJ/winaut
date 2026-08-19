import { SetMetadata } from '@nestjs/common';

import { PUBLIC_ADMIN_KEY } from './auth.constants';

export const PublicAdmin = () => SetMetadata(PUBLIC_ADMIN_KEY, true);
