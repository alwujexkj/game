import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { DEMO_FAMILY_ID, RoomCreateSchema, RoomJoinSchema } from '@sujia/shared';
import { RoomsService } from './rooms.service';
import { RoomStore } from './room-store';

@Controller('api/rooms')
export class RoomsController {
  constructor(
    private readonly rooms: RoomsService,
    private readonly store: RoomStore,
  ) {}

  @Get('meta')
  meta() {
    return {
      ok: true,
      demoFamilyId: DEMO_FAMILY_ID,
      store: this.store.backend(),
      levelId: 'T1',
      mode: 'all_must_correct',
      maxMembers: 3,
    };
  }

  @Post()
  async create(@Body() body: unknown) {
    const parsed = RoomCreateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const data = parsed.data;
    const result = await this.rooms.createRoom({
      familyId: data.familyId || DEMO_FAMILY_ID,
      profileKey: data.profileKey,
      displayName: data.displayName,
      levelId: data.levelId,
    });
    return { ok: true, ...result };
  }

  @Post('join')
  async join(@Body() body: unknown) {
    const parsed = RoomJoinSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const data = parsed.data;
    const code = data.code.trim().toUpperCase();
    const result = await this.rooms.validateJoin({
      code,
      familyId: data.familyId || DEMO_FAMILY_ID,
      profileKey: data.profileKey,
      displayName: data.displayName,
    });
    if (!result.ok) {
      return { ok: false, error: { code: result.code, message: result.message } };
    }
    return { ok: true, code: result.code, state: result.state };
  }

  @Get('health-auth')
  authHint() {
    return {
      ok: true,
      handshake: {
        auth: {
          familyId: DEMO_FAMILY_ID,
          profileKey: 'tiantian|mengying|mengzhe',
          displayName: 'optional',
        },
      },
      note: 'M2 demo: all browsers share familyId sujia-demo',
    };
  }
}
