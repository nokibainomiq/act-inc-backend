import { Types } from 'mongoose';

/**
 * Stub: Chat services — implement when Chat module is built.
 */

export const ChatServices = {
  async createOrGetConversationOnly(userId: string, receiverId: string) {
    console.log('⏸️ [STUB] ChatServices.createOrGetConversationOnly — returning stub conversation');
    return { _id: new Types.ObjectId() };
  },

  async sendAndSaveMessage(
    userId: string,
    receiverId: string,
    text?: string,
    file?: any,
    existingConversationId?: string,
  ) {
    console.log('⏸️ [STUB] ChatServices.sendAndSaveMessage');
    return {
      message: {
        _id: new Types.ObjectId(),
        text: text || '',
        sender: { firstName: 'Stub' },
      },
      conversationId: existingConversationId ? new Types.ObjectId(existingConversationId) : new Types.ObjectId(),
      lastMessageAt: new Date(),
    };
  },

  async markMessagesAsReadInDB(conversationId: string, userId: string) {
    console.log('⏸️ [STUB] ChatServices.markMessagesAsReadInDB');
  },

  async findOrCreateConversation(userId: string, _other: string, conversationId?: string) {
    console.log('⏸️ [STUB] ChatServices.findOrCreateConversation');
    return {
      _id: conversationId ? new Types.ObjectId(conversationId) : new Types.ObjectId(),
      participants: [new Types.ObjectId(userId)],
    };
  },
};
