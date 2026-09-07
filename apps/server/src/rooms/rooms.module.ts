import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProgressModule } from '../progress/progress.module';
import { RoomStore } from './room-store';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';

@Module({
  imports: [PrismaModule, ProgressModule],
  controllers: [RoomsController],
  providers: [RoomStore, RoomsService],
  exports: [RoomsService, RoomStore],
})
export class RoomsModule {}
