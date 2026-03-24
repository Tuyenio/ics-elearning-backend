import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Notification } from './entities/notification.entity';

type AuthPayload = { sub: string };
type NotificationClientData = { userId?: string };
type NotificationSocket = Socket & { data: NotificationClientData };

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: 'notifications',
})
@Injectable()
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Set<string>> = new Map();

  constructor(private jwtService: JwtService) {}

  private extractToken(client: NotificationSocket): string | undefined {
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    const authToken = auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const authorizationHeader = client.handshake.headers.authorization;
    if (typeof authorizationHeader === 'string') {
      return authorizationHeader.split(' ')[1];
    }

    return undefined;
  }

  private getSocketUserId(client: NotificationSocket): string | undefined {
    const rawData = (client as { data?: unknown }).data;
    if (!rawData || typeof rawData !== 'object') {
      return undefined;
    }

    const userId = (rawData as { userId?: unknown }).userId;
    return typeof userId === 'string' ? userId : undefined;
  }

  private setSocketUserId(client: NotificationSocket, userId: string): void {
    const rawData = (client as { data?: unknown }).data;
    const nextData: NotificationClientData =
      rawData && typeof rawData === 'object'
        ? ({
            ...(rawData as Record<string, unknown>),
            userId,
          } as NotificationClientData)
        : { userId };

    (client as { data: NotificationClientData }).data = nextData;
  }

  handleConnection(client: NotificationSocket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<AuthPayload>(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });

      const userId = payload.sub;
      this.setSocketUserId(client, userId);

      // Add socket to user's set of sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.add(client.id);
      }

      // Join user-specific room
      void client.join(`user:${userId}`);

      this.logger.debug(`Client connected: ${client.id} for user ${userId}`);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown websocket error';
      this.logger.warn(`WebSocket connection error: ${message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: NotificationSocket) {
    const userId = this.getSocketUserId(client);
    if (userId && this.userSockets.has(userId)) {
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  // Send notification to specific user
  sendToUser(userId: string, notification: Notification) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  // Send notification to multiple users
  sendToUsers(userIds: string[], notification: Notification) {
    userIds.forEach((userId) => {
      this.server.to(`user:${userId}`).emit('notification', notification);
    });
  }

  // Broadcast to all connected users (for system announcements)
  broadcast(notification: Notification) {
    this.server.emit('notification', notification);
  }

  // Send unread count update
  sendUnreadCount(userId: string, count: number) {
    this.server.to(`user:${userId}`).emit('unreadCount', { count });
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: NotificationSocket) {
    const userId = this.getSocketUserId(client);
    if (userId) {
      void client.join(`user:${userId}`);
      return { status: 'subscribed', userId };
    }
    return { status: 'error', message: 'Chưa xác thực' };
  }

  @SubscribeMessage('ping')
  handlePing() {
    return { status: 'pong', timestamp: new Date().toISOString() };
  }
}
