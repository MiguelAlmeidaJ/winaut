import { Controller, Get } from '@nestjs/common';

import { PublicAdmin } from '../auth/public-admin.decorator';
import { HealthService } from './health.service';

@PublicAdmin()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check() {
    return this.healthService.check();
  }
}
