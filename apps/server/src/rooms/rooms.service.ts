import { Injectable, Logger } from '@nestjs/common';
import {
  DEMO_FAMILY_ID,
  MAX_ROOM_MEMBERS,
  PROFILE_META,
  TEAM_LEVEL_ID,
  TEAM_QUESTION_TOTAL,
  computeStars,
  minAgeBand,
  pickTeamQuestions,
  publicQuestion,
  toPublicRoomState,
  type AgeBand,
  type ProfileKey,
  type RoomHotState,
  type RoomMemberState,
  type RoomPublicState,
  type TeamQuestionPayload,
} from '@sujia/shared';
import { RoomStatus as PrismaRoomStatus, Track } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { RoomStore } from './room-store';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class RoomsService {
  private readonly log = new Logger(RoomsService.name);

  constructor(
    private readonly store: RoomStore,
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}

  private nowIso() {
    return new Date().toISOString();
  }

  private genCode(): string {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return code;
  }

  private bump(state: RoomHotState) {
    state.version += 1;
  }

  private emptyScore(members: RoomMemberState[]) {
    const perProfile: RoomHotState['score']['perProfile'] = {};
    for (const m of members) {
      perProfile[m.profileId] = { correct: 0, wrong: 0 };
    }
    return { starsPending: 0, combo: 0, perProfile };
  }

  displayNameFor(profileKey: ProfileKey, override?: string) {
    return override?.trim() || PROFILE_META[profileKey].displayName;
  }

  async createRoom(input: {
    familyId: string;
    profileKey: ProfileKey;
    displayName?: string;
    levelId?: string;
  }): Promise<{ code: string; expiresAt: string; state: RoomPublicState }> {
    const familyId = input.familyId || DEMO_FAMILY_ID;
    const levelId = input.levelId || TEAM_LEVEL_ID;
    const displayName = this.displayNameFor(input.profileKey, input.displayName);

    let code = this.genCode();
    for (let i = 0; i < 8; i++) {
      const existing = await this.store.get(code);
      if (!existing || existing.status === 'closed') break;
      code = this.genCode();
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
    const member: RoomMemberState = {
      profileId: input.profileKey,
      displayName,
      ready: false,
      online: false,
      socketId: null,
      joinedAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
    };

    const state: RoomHotState = {
      version: 1,
      code,
      familyId,
      hostProfileId: input.profileKey,
      levelId,
      status: 'lobby',
      seed: '',
      mode: 'all_must_correct',
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
      members: [member],
      turnState: null,
      score: this.emptyScore([member]),
    };

    await this.store.set(state);
    await this.persistRoomRow(state, 'create');

    return { code, expiresAt: state.expiresAt, state: toPublicRoomState(state) };
  }

  async validateJoin(input: {
    code: string;
    familyId: string;
    profileKey: ProfileKey;
    displayName?: string;
  }): Promise<{ ok: true; code: string; state: RoomPublicState } | { ok: false; code: string; message: string }> {
    const room = await this.store.get(input.code);
    if (!room || room.status === 'closed') {
      return { ok: false, code: 'ROOM_NOT_FOUND', message: '房间不存在或已关闭' };
    }
    if (room.familyId !== (input.familyId || DEMO_FAMILY_ID)) {
      return { ok: false, code: 'WRONG_FAMILY', message: '只能加入同一家庭的房间' };
    }
    if (new Date(room.expiresAt).getTime() < Date.now()) {
      room.status = 'closed';
      this.bump(room);
      await this.store.set(room);
      return { ok: false, code: 'ROOM_NOT_FOUND', message: '房间已过期' };
    }
    const already = room.members.find((m) => m.profileId === input.profileKey);
    if (!already && room.members.length >= MAX_ROOM_MEMBERS) {
      return { ok: false, code: 'ROOM_FULL', message: '房间已满（最多 3 人）' };
    }
    if (room.status !== 'lobby' && !already) {
      return { ok: false, code: 'BAD_STATE', message: '对局已开始，无法新加入' };
    }
    return { ok: true, code: room.code, state: toPublicRoomState(room) };
  }

  async socketJoin(opts: {
    code: string;
    familyId: string;
    profileKey: ProfileKey;
    displayName?: string;
    socketId: string;
  }): Promise<{ ok: true; state: RoomPublicState } | { ok: false; error: { code: string; message: string } }> {
    const pre = await this.validateJoin(opts);
    if (!pre.ok) return { ok: false, error: { code: pre.code, message: pre.message } };

    const room = await this.store.get(opts.code);
    if (!room) {
      return { ok: false, error: { code: 'ROOM_NOT_FOUND', message: '房间不存在' } };
    }

    const name = this.displayNameFor(opts.profileKey, opts.displayName);
    const now = this.nowIso();
    let member = room.members.find((m) => m.profileId === opts.profileKey);
    if (!member) {
      member = {
        profileId: opts.profileKey,
        displayName: name,
        ready: false,
        online: true,
        socketId: opts.socketId,
        joinedAt: now,
        lastSeenAt: now,
      };
      room.members.push(member);
      room.score.perProfile[opts.profileKey] = { correct: 0, wrong: 0 };
    } else {
      member.displayName = name;
      member.online = true;
      member.socketId = opts.socketId;
      member.lastSeenAt = now;
    }
    this.bump(room);
    await this.store.set(room);
    return { ok: true, state: this.publicSnapshot(room) };
  }

  async leave(code: string, profileKey: string): Promise<RoomPublicState | null> {
    const room = await this.store.get(code);
    if (!room) return null;
    room.members = room.members.filter((m) => m.profileId !== profileKey);
    if (room.members.length === 0) {
      room.status = 'closed';
    } else if (room.hostProfileId === profileKey) {
      room.hostProfileId = room.members[0].profileId;
    }
    for (const m of room.members) {
      if (room.status === 'lobby') m.ready = false;
    }
    this.bump(room);
    await this.store.set(room);
    await this.persistRoomRow(room, 'update');
    return this.publicSnapshot(room);
  }

  async setReady(
    code: string,
    profileKey: string,
    ready: boolean,
  ): Promise<{ ok: true; state: RoomPublicState } | { ok: false; error: { code: string; message: string } }> {
    const room = await this.store.get(code);
    if (!room) return { ok: false, error: { code: 'ROOM_NOT_FOUND', message: '房间不存在' } };
    if (room.status !== 'lobby') {
      return { ok: false, error: { code: 'BAD_STATE', message: '当前不能准备' } };
    }
    const member = room.members.find((m) => m.profileId === profileKey);
    if (!member) return { ok: false, error: { code: 'AUTH_FAILED', message: '你不在这个房间' } };
    member.ready = ready;
    member.lastSeenAt = this.nowIso();
    this.bump(room);
    await this.store.set(room);
    return { ok: true, state: this.publicSnapshot(room) };
  }

  async kick(
    code: string,
    hostKey: string,
    targetKey: string,
  ): Promise<{ ok: true; state: RoomPublicState } | { ok: false; error: { code: string; message: string } }> {
    const room = await this.store.get(code);
    if (!room) return { ok: false, error: { code: 'ROOM_NOT_FOUND', message: '房间不存在' } };
    if (room.hostProfileId !== hostKey) {
      return { ok: false, error: { code: 'NOT_HOST', message: '只有房主可以踢人' } };
    }
    if (targetKey === hostKey) {
      return { ok: false, error: { code: 'BAD_STATE', message: '不能踢自己' } };
    }
    room.members = room.members.filter((m) => m.profileId !== targetKey);
    delete room.score.perProfile[targetKey];
    this.bump(room);
    await this.store.set(room);
    return { ok: true, state: this.publicSnapshot(room) };
  }

  async start(
    code: string,
    hostKey: string,
    levelId?: string,
  ): Promise<
    | { ok: true; state: RoomPublicState; started: object; turn: object }
    | { ok: false; error: { code: string; message: string } }
  > {
    const room = await this.store.get(code);
    if (!room) return { ok: false, error: { code: 'ROOM_NOT_FOUND', message: '房间不存在' } };
    if (room.hostProfileId !== hostKey) {
      return { ok: false, error: { code: 'NOT_HOST', message: '只有房主可以开始' } };
    }
    if (room.status !== 'lobby') {
      return { ok: false, error: { code: 'BAD_STATE', message: '房间不在大厅' } };
    }
    const online = room.members.filter((m) => m.online);
    if (online.length < 2) {
      return { ok: false, error: { code: 'NOT_READY', message: '至少需要 2 人在线才能开始' } };
    }
    if (!online.every((m) => m.ready)) {
      return { ok: false, error: { code: 'NOT_READY', message: '还有小伙伴没准备好' } };
    }

    room.levelId = levelId || room.levelId || TEAM_LEVEL_ID;
    room.mode = 'all_must_correct';
    room.seed = `s_${code}_${Date.now().toString(36)}`;
    room.status = 'playing';
    room.score = this.emptyScore(room.members);

    const memberBands: AgeBand[] = online
      .map((m) => {
        const key = m.profileId as ProfileKey;
        return PROFILE_META[key]?.ageBand;
      })
      .filter((b): b is AgeBand => Boolean(b));
    const packBand = minAgeBand(memberBands);
    const questions = pickTeamQuestions(room.seed, TEAM_QUESTION_TOTAL, packBand);
    room._questions = questions;
    room.turnState = this.buildTurn(questions, 0);

    this.bump(room);
    await this.store.set(room);
    await this.persistRoomRow(room, 'update');

    const pub = this.publicSnapshot(room);
    return {
      ok: true,
      state: pub,
      started: {
        levelId: room.levelId,
        seed: room.seed,
        mode: room.mode,
        turnState: pub.turnState,
        version: room.version,
      },
      turn: {
        index: room.turnState!.index,
        total: room.turnState!.total,
        questionId: room.turnState!.questionId,
        question: room.turnState!.question,
        deadlineAt: room.turnState!.deadlineAt,
        version: room.version,
      },
    };
  }

  private buildTurn(questions: TeamQuestionPayload[], index: number) {
    const q = questions[index];
    return {
      index,
      total: questions.length,
      questionId: q.id,
      question: publicQuestion(q),
      deadlineAt: null as string | null,
      answers: {} as Record<string, { ok: boolean; answer?: string | number; clientTs?: number }>,
    };
  }

  async answer(
    code: string,
    profileKey: string,
    payload: { questionId: string; answer: string | number; clientTs?: number },
  ): Promise<
    | {
        ok: true;
        state: RoomPublicState;
        answerResult: object;
        turn?: object;
        settled?: object;
      }
    | { ok: false; error: { code: string; message: string } }
  > {
    const room = await this.store.get(code);
    if (!room) return { ok: false, error: { code: 'ROOM_NOT_FOUND', message: '房间不存在' } };
    if (room.status !== 'playing' || !room.turnState || !room._questions) {
      return { ok: false, error: { code: 'BAD_STATE', message: '当前不能答题' } };
    }
    const member = room.members.find((m) => m.profileId === profileKey);
    if (!member) return { ok: false, error: { code: 'AUTH_FAILED', message: '你不在这个房间' } };

    const turn = room.turnState;
    if (payload.questionId !== turn.questionId) {
      return { ok: false, error: { code: 'ANSWER_DENIED', message: '题目已切换' } };
    }
    if (turn.answers[profileKey]) {
      return { ok: false, error: { code: 'ANSWER_DENIED', message: '你已经答过这题了' } };
    }

    const q = room._questions[turn.index];
    const ok = String(payload.answer) === String(q.answer);
    turn.answers[profileKey] = {
      ok,
      answer: payload.answer,
      clientTs: payload.clientTs,
    };

    if (!room.score.perProfile[profileKey]) {
      room.score.perProfile[profileKey] = { correct: 0, wrong: 0 };
    }
    if (ok) room.score.perProfile[profileKey].correct += 1;
    else room.score.perProfile[profileKey].wrong += 1;

    this.bump(room);

    const activeKeys = room.members.filter((m) => m.online).map((m) => m.profileId);
    const allSubmitted = activeKeys.every((k) => turn.answers[k]);
    let advancedTurn: object | undefined;
    let settledPayload: object | undefined;

    if (allSubmitted) {
      const allCorrect = activeKeys.every((k) => turn.answers[k]?.ok);
      if (allCorrect) {
        room.score.combo += 1;
        room.score.starsPending = Math.min(3, room.score.starsPending + 1);
        const next = turn.index + 1;
        if (next >= room._questions.length) {
          settledPayload = await this.settle(room);
        } else {
          room.turnState = this.buildTurn(room._questions, next);
          advancedTurn = {
            index: room.turnState.index,
            total: room.turnState.total,
            questionId: room.turnState.questionId,
            question: room.turnState.question,
            deadlineAt: room.turnState.deadlineAt,
            version: room.version + 1,
          };
          this.bump(room);
        }
      } else {
        // all_must_correct: wrong → clear answers and retry same question
        room.score.combo = 0;
        turn.answers = {};
        this.bump(room);
      }
    }

    await this.store.set(room);
    const pub = this.publicSnapshot(room);
    return {
      ok: true,
      state: pub,
      answerResult: {
        profileId: profileKey,
        questionId: payload.questionId,
        ok,
        turnState: pub.turnState,
        score: pub.score,
        version: room.version,
      },
      turn: advancedTurn,
      settled: settledPayload,
    };
  }

  private async settle(room: RoomHotState) {
    room.status = 'settling';
    const members = room.members;
    const totalQ = room._questions?.length ?? TEAM_QUESTION_TOTAL;
    const starsByProfile: Record<string, number> = {};

    for (const m of members) {
      const stats = room.score.perProfile[m.profileId] ?? { correct: 0, wrong: 0 };
      const stars = computeStars({
        correct: stats.correct,
        total: Math.max(totalQ, stats.correct + stats.wrong, 1),
        heartsLeft: 3,
        maxHearts: 3,
        bestCombo: room.score.combo,
      });
      // Team clear bonus: if finished all questions, at least 1 star
      const awarded = Math.max(stars, room.score.starsPending > 0 ? 1 : 0);
      const finalStars = Math.min(3, Math.max(awarded, room.score.starsPending >= totalQ ? 3 : room.score.starsPending >= 3 ? 2 : awarded));
      starsByProfile[m.profileId] = finalStars;

      try {
        await this.progress.upsert({
          profileKey: m.profileId as ProfileKey,
          levelId: 'T1',
          stars: finalStars,
          bestCombo: room.score.combo,
          cleared: finalStars > 0,
        });
      } catch (e) {
        this.log.warn(`settle progress upsert failed for ${m.profileId}: ${String(e)}`);
      }
    }

    room.status = 'closed';
    this.bump(room);
    await this.persistRoomRow(room, 'update');

    return {
      starsByProfile,
      version: room.version,
      levelId: room.levelId,
      combo: room.score.combo,
    };
  }

  async sync(code: string, _version?: number): Promise<RoomPublicState | null> {
    const room = await this.store.get(code);
    if (!room) return null;
    return this.publicSnapshot(room);
  }

  async markOffline(code: string, profileKey: string, socketId: string): Promise<RoomPublicState | null> {
    const room = await this.store.get(code);
    if (!room) return null;
    const member = room.members.find((m) => m.profileId === profileKey);
    if (!member) return null;
    // Only mark offline if this socket still owns the seat (reconnect may have replaced)
    if (member.socketId && member.socketId !== socketId) return this.publicSnapshot(room);
    member.online = false;
    member.socketId = null;
    member.lastSeenAt = this.nowIso();
    this.bump(room);
    await this.store.set(room);
    return this.publicSnapshot(room);
  }

  findRoomCodeBySocket(socketId: string): Promise<string | null> {
    // Scanned from memory path; for redis-only we'd track socket→code map.
    return this.findCodeForSocket(socketId);
  }

  private async findCodeForSocket(socketId: string): Promise<string | null> {
    // RoomStore memory is authoritative enough for disconnect; also check via scanning known codes is hard on redis.
    // Maintain a side map on the gateway instead — this helper returns null; gateway keeps socket meta.
    void socketId;
    return null;
  }

  publicSnapshot(room: RoomHotState): RoomPublicState {
    return toPublicRoomState(room);
  }

  storeBackend() {
    return this.store.backend();
  }

  private async persistRoomRow(state: RoomHotState, _mode: 'create' | 'update') {
    try {
      const family = await this.progress.ensureCatalog();
      if (!family) return;

      // Ensure T1 level exists (team track)
      await this.prisma.level.upsert({
        where: { id: TEAM_LEVEL_ID },
        create: {
          id: TEAM_LEVEL_ID,
          track: 'team' as Track,
          title: '双人开门',
          sortOrder: 100,
          configJson: { teamMode: 'all_must_correct', subtitle: '组队全员答对才能开门' },
        },
        update: {
          title: '双人开门',
          track: 'team' as Track,
          configJson: { teamMode: 'all_must_correct', subtitle: '组队全员答对才能开门' },
        },
      });

      const host = await this.prisma.profile.findUnique({
        where: {
          familyId_key: { familyId: family.id, key: state.hostProfileId as never },
        },
      });
      if (!host) return;

      const status = state.status as PrismaRoomStatus;
      await this.prisma.room.upsert({
        where: { code: state.code },
        create: {
          code: state.code,
          familyId: family.id,
          hostProfileId: host.id,
          levelId: state.levelId === TEAM_LEVEL_ID ? TEAM_LEVEL_ID : state.levelId,
          seed: state.seed || null,
          status,
          expiresAt: new Date(state.expiresAt),
        },
        update: {
          hostProfileId: host.id,
          levelId: state.levelId === TEAM_LEVEL_ID ? TEAM_LEVEL_ID : state.levelId,
          seed: state.seed || null,
          status,
          expiresAt: new Date(state.expiresAt),
        },
      });
    } catch (e) {
      this.log.warn(`persist Room row skipped: ${String(e)}`);
    }
  }
}
