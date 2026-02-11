import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Notification } from './entities/notification.entity';

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
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Set<string>> = new Map();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });

      const userId = payload.sub;
      client.data.userId = userId;

      // Add socket to user's set of sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.add(client.id);
      }

      // Join user-specific room
      client.join(`user:${userId}`);

      console.log(`Client connected: ${client.id} for user ${userId}`);
    } catch (error: any) {
      console.error('WebSocket connection error:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.userSockets.has(userId)) {
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
    console.log(`Client disconnected: ${client.id}`);
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
  handleSubscribe(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      client.join(`user:${userId}`);
      return { status: 'subscribed', userId };
    }
    return { status: 'error', message: 'Chưa xác thực' };
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { status: 'pong', timestamp: new Date().toISOString() };
  }
}
