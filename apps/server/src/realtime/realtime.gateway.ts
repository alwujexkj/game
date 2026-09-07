import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * M0 empty Socket.IO stub.
 * Real room events are documented in docs/房间事件细稿-v1.md (planned for M2).
 */
@WebSocketGateway({
  cors: { origin: true },
  namespace: '/room',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    client.emit('stub', {
      ok: true,
      message: '房间实时能力将在 M2 实现',
    });
  }

  handleDisconnect(_client: Socket) {
    // no-op for M0
  }
}
