import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { RealtimeModule } from './realtime/realtime.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProgressModule } from './progress/progress.module';

@Module({
  imports: [HealthModule, RealtimeModule, PrismaModule, ProgressModule],
})
export class AppModule {}
