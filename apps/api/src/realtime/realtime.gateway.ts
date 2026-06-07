import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { SOCKET_EVENTS } from "@schedule/shared";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@schedule/shared";
import { RealtimeService, TypedServer } from "./realtime.service";
import type { Socket } from "socket.io";

interface AuthedSocket
  extends Socket<ClientToServerEvents, ServerToClientEvents> {
  data: { userId: string };
}

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);
  private realtime!: RealtimeService;
  private jwt!: JwtService;

  constructor(private readonly moduleRef: ModuleRef) {}

  afterInit(server: TypedServer) {
    this.realtime = this.moduleRef.get(RealtimeService, { strict: false });
    this.jwt = this.moduleRef.get(JwtService, { strict: false });
    this.realtime.setServer(server);
  }

  handleConnection(client: AuthedSocket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.headers.authorization?.replace(/^Bearer\s+/i, "") ??
        undefined);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = this.jwt.verify<{ sub: string }>(token);
      client.data.userId = payload.sub;
      this.logger.log(`socket connected user=${payload.sub} sid=${client.id}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthedSocket) {
    if (client.data?.userId) {
      // disconnected — 无额外清理操作
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.SUBSCRIBE)
  onSubscribe(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { scheduleId: string },
  ) {
    if (!body?.scheduleId) return;
    client.join(this.realtime.scheduleRoom(body.scheduleId));
  }

  @SubscribeMessage(SOCKET_EVENTS.UNSUBSCRIBE)
  onUnsubscribe(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { scheduleId: string },
  ) {
    if (!body?.scheduleId) return;
    client.leave(this.realtime.scheduleRoom(body.scheduleId));
  }
}
