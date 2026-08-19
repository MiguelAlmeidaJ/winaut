import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AgentJobsModule } from './agent-jobs/agent-jobs.module';
import { AgentsModule } from './agents/agents.module';
import { AutomationRunsModule } from './automation-runs/automation-runs.module';
import { AutomationSchedulerModule } from './automation-scheduler/automation-scheduler.module';
import { AutomationSchedulesModule } from './automation-schedules/automation-schedules.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { HealthModule } from './health/health.module';
import { WinThorInstancesModule } from './winthor-instances/winthor-instances.module';
import { WinThorAccessProfilesModule } from './winthor-access-profiles/winthor-access-profiles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),

    ScheduleModule.forRoot(),

    AuthModule,
    HealthModule,
    CompaniesModule,
    WinThorInstancesModule,
    WinThorAccessProfilesModule,
    AgentsModule,
    AutomationSchedulesModule,
    AutomationRunsModule,
    AgentJobsModule,
    AutomationSchedulerModule,
  ],
})
export class AppModule {}
