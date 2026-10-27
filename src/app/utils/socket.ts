import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyToken } from '../modules/Auth/auth.utils';
import config from '../config';
import { User } from '../modules/User/user.model';
import { ChatServices } from '../modules/Chat/chat.services';
import { sendNotification } from './sendNotification';

let io: Server;

export const initializeSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:5175',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
      ],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // ── Authentication Middleware ──
  io.use(async (socket, next) => {
    const token = socket.handshake.query.token as string;

    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = verifyToken(token, config.jwt_access_secret as string) as {
        userId: string;
        role: string;
      };
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // ── Connection Handler ──
  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.user.userId;
    console.log(`✅ [${userId}] Socket connected`);

    try {
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastActiveAt: new Date(),
      });

      // Join personal room (same as userId) for direct messaging
      socket.join(userId);

      // Broadcast online status to other connected clients
      socket.broadcast.emit('USER_STATUS_CHANGED', {
        userId,
        isOnline: true,
      });
    } catch (err) {
      console.error(`❌ [${userId}] Error on connect:`, err);
    }

    // ── CREATE_OR_GET_CONVERSATION ──
    socket.on('CREATE_OR_GET_CONVERSATION', async (data) => {
      try {
        const { receiverId } = data;

        if (!receiverId) {
          socket.emit('CONVERSATION_ERROR', { message: 'Receiver ID is required' });
          return;
        }

        const conversation = await ChatServices.createOrGetConversationOnly(
          userId,
          receiverId,
        );

        socket.emit('CONVERSATION_CREATED', {
          conversationId: conversation._id,
        });
      } catch (err: any) {
        console.error(`❌ [${userId}] CREATE_OR_GET_CONVERSATION error:`, err.message);
        socket.emit('CONVERSATION_ERROR', { message: 'Failed to create/get conversation' });
      }
    });

    // ── SEND_PRIVATE_MESSAGE ──
    socket.on('SEND_PRIVATE_MESSAGE', async (data) => {
      try {
        const { receiverId, text, file, conversationId: existingConversationId } = data;

        if (!receiverId) {
          socket.emit('MESSAGE_ERROR', { message: 'Receiver ID is required' });
          return;
        }
        if (!text && !file) {
          socket.emit('MESSAGE_ERROR', { message: 'Message text or file is required' });
          return;
        }

        // Delegate all DB work to the service layer
        const { message: populatedMessage, conversationId, lastMessageAt } =
          await ChatServices.sendAndSaveMessage(
            userId,
            receiverId,
            text,
            file,
            existingConversationId,
          );

        // ── 1. Deliver real-time to receiver if online ──
        io.to(receiverId).emit('RECEIVE_PRIVATE_MESSAGE', {
          message: populatedMessage,
          conversationId,
        });

        // Confirm to sender
        socket.emit('MESSAGE_SENT', {
          message: populatedMessage,
          conversationId,
        });

        // Update receiver's sidebar
        io.to(receiverId).emit('CONVERSATION_UPDATED', {
          conversationId,
          lastMessage: populatedMessage?.text || (file ? '📎 Image' : ''),
          lastMessageSender: userId,
          lastMessageAt: lastMessageAt || new Date(),
        });

        // ── 2. FCM Push Notification if receiver is offline ──
        const receiverSockets = await io.in(receiverId).fetchSockets();
        if (receiverSockets.length === 0) {
          const senderName =
            (populatedMessage?.sender as any)?.firstName || 'Someone';
          const preview = text
            ? text.substring(0, 100)
            : file
              ? 'Sent an image'
              : 'Sent a message';

          await sendNotification(
            receiverId,
            `New message from ${senderName}`,
            preview,
            'chat_message',
            {
              conversationId: conversationId.toString(),
              senderId: userId,
            },
          );
        }
      } catch (err: any) {
        console.error(`❌ [${userId}] SEND_PRIVATE_MESSAGE error:`, err.message);
        socket.emit('MESSAGE_ERROR', { message: err.message || 'Failed to send message' });
      }
    });

    // ── START_TYPING ──
    socket.on('START_TYPING', (data) => {
      const { receiverId } = data;
      if (receiverId) {
        io.to(receiverId).emit('USER_TYPING', {
          senderId: userId,
          conversationId: data.conversationId,
        });
      }
    });

    // ── STOP_TYPING ──
    socket.on('STOP_TYPING', (data) => {
      const { receiverId } = data;
      if (receiverId) {
        io.to(receiverId).emit('USER_STOPPED_TYPING', {
          senderId: userId,
          conversationId: data.conversationId,
        });
      }
    });

    // ── MARK_AS_READ ──
    socket.on('MARK_AS_READ', async (data) => {
      try {
        const { conversationId } = data;
        if (!conversationId) return;

        await ChatServices.markMessagesAsReadInDB(conversationId, userId);

        // Notify the other participant that messages were read
        const conversation = await ChatServices.findOrCreateConversation(userId, '', conversationId);
        if (conversation) {
          const otherParticipant = conversation.participants.find(
            (p) => p.toString() !== userId,
          );
          if (otherParticipant) {
            io.to(otherParticipant.toString()).emit('MESSAGES_READ', {
              conversationId,
              readBy: userId,
            });
          }
        }
      } catch (err: any) {
        console.error(`❌ [${userId}] MARK_AS_READ error:`, err.message);
      }
    });

    // ── Disconnect Handler (Multi-tab aware) ──
    socket.on('disconnect', async () => {
      console.log(`⚠️  [${userId}] Socket disconnected, checking for other tabs...`);

      try {
        // Only set offline if ALL tabs/sockets for this user are gone
        const remainingSockets = await io.in(userId).fetchSockets();

        if (remainingSockets.length === 0) {
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastActiveAt: new Date(),
          });

          io.emit('USER_STATUS_CHANGED', {
            userId,
            isOnline: false,
          });

          console.log(`❌ [${userId}] Fully offline (no tabs remaining)`);
        } else {
          console.log(`🔵 [${userId}] Still online via ${remainingSockets.length} other tab(s)`);
        }
      } catch (err) {
        console.error(`❌ [${userId}] Error on disconnect:`, err);
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};