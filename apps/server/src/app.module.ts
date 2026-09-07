import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { RealtimeModule } from './realtime/realtime.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [HealthModule, RealtimeModule, PrismaModule],
})
export class AppModule {}
