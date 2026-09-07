import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  DEMO_FAMILY_ID,
  PROFILE_KEYS,
  PROFILE_META,
  type ProfileKey,
} from '@sujia/shared';
import { RoomsService } from '../rooms/rooms.service';

type SocketAuth = {
  familyId: string;
  profileKey: ProfileKey;
  displayName: string;
  roomCode?: string;
};

@WebSocketGateway({
  cors: { origin: true },
  namespace: '/room',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly log = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly rooms: RoomsService) {}

  private channel(code: string) {
    return `room:${code.toUpperCase()}`;
  }

  private authOf(client: Socket): SocketAuth | null {
    return (client.data.auth as SocketAuth) || null;
  }

  private emitError(client: Socket, code: string, message: string, detail?: unknown) {
    client.emit('room.error', { code, message, detail });
  }

  handleConnection(client: Socket) {
    const raw = (client.handshake.auth || {}) as Record<string, unknown>;
    const familyId = String(raw.familyId || DEMO_FAMILY_ID);
    const profileKey = String(raw.profileKey || '');
    const displayName = String(raw.displayName || '');

    if (!PROFILE_KEYS.includes(profileKey as ProfileKey)) {
      this.emitError(client, 'AUTH_FAILED', 'profileKey 必须是 tiantian|mengying|mengzhe');
      client.disconnect(true);
      return;
    }

    const key = profileKey as ProfileKey;
    client.data.auth = {
      familyId: familyId || DEMO_FAMILY_ID,
      profileKey: key,
      displayName: displayName || PROFILE_META[key].displayName,
    } satisfies SocketAuth;

    this.log.debug(`connected ${key} family=${familyId} sock=${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const auth = this.authOf(client);
    const code = auth?.roomCode;
    if (!auth || !code) return;
    try {
      const state = await this.rooms.markOffline(code, auth.profileKey, client.id);
      if (state) {
        this.server.to(this.channel(code)).emit('room.state', state);
      }
    } catch (e) {
      this.log.warn(`disconnect cleanup failed: ${String(e)}`);
    }
  }

  @SubscribeMessage('room.join')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { code?: string },
  ) {
    const auth = this.authOf(client);
    if (!auth) {
      this.emitError(client, 'AUTH_FAILED', '未鉴权');
      return;
    }
    const code = String(body?.code || '').trim().toUpperCase();
    if (!code) {
      this.emitError(client, 'ROOM_NOT_FOUND', '请输入房间码');
      return;
    }

    const result = await this.rooms.socketJoin({
      code,
      familyId: auth.familyId,
      profileKey: auth.profileKey,
      displayName: auth.displayName,
      socketId: client.id,
    });

    if (!result.ok) {
      this.emitError(client, result.error.code, result.error.message);
      return;
    }

    // Leave previous room channel if any
    if (auth.roomCode && auth.roomCode !== code) {
      client.leave(this.channel(auth.roomCode));
    }
    auth.roomCode = code;
    await client.join(this.channel(code));
    this.server.to(this.channel(code)).emit('room.state', result.state);
  }

  @SubscribeMessage('join')
  onJoinAlias(@ConnectedSocket() client: Socket, @MessageBody() body: { code?: string }) {
    return this.onJoin(client, body);
  }

  @SubscribeMessage('room.leave')
  async onLeave(@ConnectedSocket() client: Socket) {
    const auth = this.authOf(client);
    if (!auth?.roomCode) return;
    const code = auth.roomCode;
    const state = await this.rooms.leave(code, auth.profileKey);
    client.leave(this.channel(code));
    auth.roomCode = undefined;
    if (state) {
      this.server.to(this.channel(code)).emit('room.state', state);
    }
  }

  @SubscribeMessage('leave')
  onLeaveAlias(@ConnectedSocket() client: Socket) {
    return this.onLeave(client);
  }

  @SubscribeMessage('room.ready')
  async onReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { ready?: boolean },
  ) {
    const auth = this.authOf(client);
    if (!auth?.roomCode) {
      this.emitError(client, 'BAD_STATE', '请先加入房间');
      return;
    }
    const result = await this.rooms.setReady(auth.roomCode, auth.profileKey, Boolean(body?.ready));
    if (!result.ok) {
      this.emitError(client, result.error.code, result.error.message);
      return;
    }
    this.server.to(this.channel(auth.roomCode)).emit('room.state', result.state);
  }

  @SubscribeMessage('ready')
  onReadyAlias(@ConnectedSocket() client: Socket, @MessageBody() body: { ready?: boolean }) {
    return this.onReady(client, body);
  }

  @SubscribeMessage('room.kick')
  async onKick(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { profileId?: string; profileKey?: string },
  ) {
    const auth = this.authOf(client);
    if (!auth?.roomCode) {
      this.emitError(client, 'BAD_STATE', '请先加入房间');
      return;
    }
    const target = String(body?.profileId || body?.profileKey || '');
    const result = await this.rooms.kick(auth.roomCode, auth.profileKey, target);
    if (!result.ok) {
      this.emitError(client, result.error.code, result.error.message);
      return;
    }
    this.server.to(this.channel(auth.roomCode)).emit('room.state', result.state);
  }

  @SubscribeMessage('kick')
  onKickAlias(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { profileId?: string; profileKey?: string },
  ) {
    return this.onKick(client, body);
  }

  @SubscribeMessage('room.start')
  async onStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { levelId?: string },
  ) {
    const auth = this.authOf(client);
    if (!auth?.roomCode) {
      this.emitError(client, 'BAD_STATE', '请先加入房间');
      return;
    }
    const result = await this.rooms.start(auth.roomCode, auth.profileKey, body?.levelId);
    if (!result.ok) {
      this.emitError(client, result.error.code, result.error.message);
      return;
    }
    const ch = this.channel(auth.roomCode);
    this.server.to(ch).emit('room.state', result.state);
    this.server.to(ch).emit('room.started', result.started);
    this.server.to(ch).emit('room.turn', result.turn);
  }

  @SubscribeMessage('start')
  onStartAlias(@ConnectedSocket() client: Socket, @MessageBody() body: { levelId?: string }) {
    return this.onStart(client, body);
  }

  @SubscribeMessage('room.answer')
  async onAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { questionId?: string; answer?: string | number; clientTs?: number },
  ) {
    const auth = this.authOf(client);
    if (!auth?.roomCode) {
      this.emitError(client, 'BAD_STATE', '请先加入房间');
      return;
    }
    if (!body?.questionId || body.answer === undefined) {
      this.emitError(client, 'ANSWER_DENIED', '答题参数不完整');
      return;
    }
    const result = await this.rooms.answer(auth.roomCode, auth.profileKey, {
      questionId: body.questionId,
      answer: body.answer,
      clientTs: body.clientTs,
    });
    if (!result.ok) {
      this.emitError(client, result.error.code, result.error.message);
      return;
    }
    const ch = this.channel(auth.roomCode);
    this.server.to(ch).emit('room.answerResult', result.answerResult);
    this.server.to(ch).emit('room.state', result.state);
    if (result.turn) {
      this.server.to(ch).emit('room.turn', result.turn);
    }
    if (result.settled) {
      this.server.to(ch).emit('room.settled', result.settled);
    }
  }

  @SubscribeMessage('answer')
  onAnswerAlias(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { questionId?: string; answer?: string | number; clientTs?: number },
  ) {
    return this.onAnswer(client, body);
  }

  @SubscribeMessage('room.sync')
  async onSync(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { version?: number; code?: string },
  ) {
    const auth = this.authOf(client);
    const code = String(body?.code || auth?.roomCode || '').toUpperCase();
    if (!code) {
      this.emitError(client, 'ROOM_NOT_FOUND', '没有可同步的房间');
      return;
    }
    const state = await this.rooms.sync(code, body?.version);
    if (!state) {
      this.emitError(client, 'ROOM_NOT_FOUND', '房间不存在');
      return;
    }
    if (auth) {
      auth.roomCode = code;
      await client.join(this.channel(code));
    }
    client.emit('room.state', state);
  }

  @SubscribeMessage('sync')
  onSyncAlias(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { version?: number; code?: string },
  ) {
    return this.onSync(client, body);
  }
}
