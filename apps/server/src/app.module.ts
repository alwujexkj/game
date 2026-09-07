import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { RealtimeModule } from './realtime/realtime.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProgressModule } from './progress/progress.module';
import { RoomsModule } from './rooms/rooms.module';
import { WorkshopModule } from './workshop/workshop.module';
import { GiftsModule } from './gifts/gifts.module';
import { ParentModule } from './parent/parent.module';

@Module({
  imports: [HealthModule, RealtimeModule, PrismaModule, ProgressModule, RoomsModule, WorkshopModule, GiftsModule, ParentModule],
})
export class AppModule {}
