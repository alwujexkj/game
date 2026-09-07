import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  DEMO_FAMILY_ID,
  WorkshopLevelUpsertSchema,
  WorkshopPublishSchema,
} from '@sujia/shared';
import { WorkshopService } from './workshop.service';

@Controller('api/workshop')
export class WorkshopController {
  constructor(private readonly workshop: WorkshopService) {}

  @Get()
  async list(@Query('familyId') familyId?: string) {
    return this.workshop.list(familyId || DEMO_FAMILY_ID);
  }

  @Get('published')
  async published(@Query('familyId') familyId?: string) {
    return this.workshop.listPublished(familyId || DEMO_FAMILY_ID);
  }

  @Get(':id')
  async one(@Param('id') id: string) {
    const res = await this.workshop.getById(id);
    if (!res.ok && !res.offline) throw new NotFoundException('workshop level not found');
    return res;
  }

  @Post()
  async upsert(@Body() body: unknown) {
    const parsed = WorkshopLevelUpsertSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.workshop.upsert(parsed.data);
  }

  @Post(':id/publish')
  async publish(@Param('id') id: string, @Body() body: unknown) {
    const parsed = WorkshopPublishSchema.safeParse({
      ...(typeof body === 'object' && body ? body : {}),
      id,
    });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.workshop.publish(parsed.data);
  }
}
