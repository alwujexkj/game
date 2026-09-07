import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // M0: do not require DB up for /api/health; connect lazily when used.
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
