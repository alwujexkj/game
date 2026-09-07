import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ParentPinHashSchema, ParentPinVerifySchema } from '@sujia/shared';
import { ParentService } from './parent.service';

@Controller('api/parent')
export class ParentController {
  constructor(private readonly parent: ParentService) {}

  @Post('pin')
  async setPin(@Body() body: unknown) {
    const parsed = ParentPinHashSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.parent.setPinHash(parsed.data.pinHash);
  }

  @Post('pin/verify')
  async verify(@Body() body: unknown) {
    const parsed = ParentPinVerifySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.parent.verifyPin(parsed.data.pin);
  }

  @Get('dashboard')
  async dashboard() {
    return this.parent.dashboard();
  }

  @Get('rank')
  async rank(@Query('weekKey') weekKey?: string) {
    return this.parent.rank(weekKey);
  }
}
