import { Body, Controller, Get, Post, Query, BadRequestException } from '@nestjs/common';
import {
  ProfileKeySchema,
  ProgressUpsertSchema,
  type ProfileKey,
} from '@sujia/shared';
import { ProgressService } from './progress.service';

@Controller('api/progress')
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get()
  async list(@Query('profileKey') profileKey?: string) {
    const parsed = ProfileKeySchema.safeParse(profileKey);
    if (!parsed.success) {
      throw new BadRequestException('profileKey required: tiantian|mengying|mengzhe');
    }
    return this.progress.list(parsed.data as ProfileKey);
  }

  @Post()
  async upsert(@Body() body: unknown) {
    const parsed = ProgressUpsertSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.progress.upsert(parsed.data);
  }
}
