import {
  Injectable,
  Logger,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';

@Injectable()
export class AuthBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AuthBootstrapService.name);

  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const email = this.config.get<string>('ADMIN_BOOTSTRAP_EMAIL')?.trim();
    const password =
      this.config.get<string>('ADMIN_BOOTSTRAP_PASSWORD')?.trim();
    const name =
      this.config.get<string>('ADMIN_BOOTSTRAP_NAME')?.trim() ||
      'Administrador';

    if (!email && !password) {
      this.logger.warn(
        'No bootstrap administrator configured. Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD before the first login.',
      );
      return;
    }

    if (!email || !password) {
      throw new Error(
        'ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD must be configured together.',
      );
    }

    if (password.length < 12) {
      throw new Error(
        'ADMIN_BOOTSTRAP_PASSWORD must contain at least 12 characters.',
      );
    }

    const created = await this.auth.bootstrapFirstAdmin({
      name,
      email,
      password,
    });

    if (created) {
      this.logger.warn(
        'Initial administrator created. Remove ADMIN_BOOTSTRAP_PASSWORD from the environment and restart the API.',
      );
    }
  }
}
