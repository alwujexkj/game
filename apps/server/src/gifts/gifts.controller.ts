import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  GiftSendSchema,
  InventoryUpsertSchema,
  ProfileKeySchema,
} from '@sujia/shared';
import { GiftsService } from './gifts.service';

@Controller('api/gifts')
export class GiftsController {
  constructor(private readonly gifts: GiftsService) {}

  @Get('inventory')
  async inventory(@Query('profileKey') profileKey?: string) {
    const parsed = ProfileKeySchema.safeParse(profileKey);
    if (!parsed.success) throw new BadRequestException('profileKey required');
    return this.gifts.getInventory(parsed.data);
  }

  @Post('inventory')
  async upsertInventory(@Body() body: unknown) {
    const parsed = InventoryUpsertSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.gifts.upsertInventory({
      profileKey: parsed.data.profileKey,
      items: parsed.data.items,
    });
  }

  @Post()
  async send(@Body() body: unknown) {
    const parsed = GiftSendSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.gifts.sendGift(parsed.data);
  }
}
