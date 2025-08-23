import 'server-only';

import { and, asc, desc, eq, gt, gte, inArray, lt, sql, type SQL } from 'drizzle-orm';
import {
  user,
  chat,
  type User,
  message,
  type Message,
  type Chat,
  stream,
  extremeSearchUsage,
  messageUsage,
  customInstructions,
  payment,
} from './schema';
import { ChatSDKError } from '../errors';
import { db } from './index'; // Use unified database connection
import { 
  getDodoPayments, 
  setDodoPayments, 
  getDodoProStatus, 
  setDodoProStatus 
} from '../performance-cache';

type VisibilityType = 'public' | 'private';

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get user by email');
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat' + error);
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db.delete(chat).where(eq(chat.id, id)).returning();
    return chatsDeleted;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete chat by id');
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(whereCondition ? and(whereCondition, eq(chat.userId, id)) : eq(chat.userId, id))
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db.select().from(chat).where(eq(chat.id, startingAfter)).limit(1);

      if (!selectedChat) {
        throw new ChatSDKError('not_found:database', `Chat with id ${startingAfter} not found`);
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db.select().from(chat).where(eq(chat.id, endingBefore)).limit(1);

      if (!selectedChat) {
        throw new ChatSDKError('not_found:database', `Chat with id ${endingBefore} not found`);
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chats by user id');
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    console.log('🔍 getChatById - Fetching chat:', id);
    
    const chatResult = await db.select().from(chat).where(eq(chat.id, id)).limit(1);
    
    console.log('🔍 getChatById - Found chat:', chatResult.length > 0 ? chatResult[0] : null);
    
    return chatResult[0];
  } catch (error) {
    console.error('🔍 getChatById - Error:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function getChatWithUserById({ id }: { id: string }) {
  try {
    const [result] = await db
      .select({
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        visibility: chat.visibility,
        userId: chat.userId,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
      })
      .from(chat)
      .innerJoin(user, eq(chat.userId, user.id))
      .where(eq(chat.id, id));
    return result;
  } catch (error) {
    console.log('Error getting chat with user by id', error);
    return null;
  }
}

export async function saveMessages({ messages }: { messages: Array<Omit<Message, 'id'>> }) {
  try {
    console.log('🔍 saveMessages - Saving messages:', messages.length);
    
    // Filter out empty or invalid messages
    const validMessages = messages.filter(msg => 
      msg.chatId && 
      msg.role && 
      msg.parts && 
      Array.isArray(msg.parts) && 
      msg.parts.length > 0
    );
    
    if (validMessages.length === 0) {
      console.log('🔍 saveMessages - No valid messages to save');
      return;
    }
    
    console.log('🔍 saveMessages - Valid messages to save:', validMessages.length);
    console.log('🔍 saveMessages - Message details:', validMessages.map(m => ({ chatId: m.chatId, role: m.role })));
    
    // Ensure createdAt is a proper Date object for each message and remove id since it's auto-generated
    const processedMessages = validMessages.map(msg => ({
      chatId: msg.chatId,
      role: msg.role,
      parts: msg.parts,
      attachments: msg.attachments,
      createdAt: msg.createdAt instanceof Date ? msg.createdAt : new Date(msg.createdAt),
    }));
    
    console.log('🔍 saveMessages - Processed messages with proper dates');
    console.log('🔍 saveMessages - First message sample:', JSON.stringify(processedMessages[0], null, 2));
    
    const result = await db.insert(message).values(processedMessages);
    
    console.log('🔍 saveMessages - Successfully saved messages');
    
    return result;
  } catch (error) {
    console.error('🔍 saveMessages - Error saving messages:', error);
    console.error('🔍 saveMessages - Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error.cause : undefined,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

export async function getMessagesByChatId({
  id,
  limit = 50,
  offset = 0,
}: {
  id: string;
  limit?: number;
  offset?: number;
}) {
  'use cache';

  try {
    console.log('🔍 getMessagesByChatId - Fetching messages for chat:', id);
    console.log('🔍 getMessagesByChatId - Limit:', limit, 'Offset:', offset);
    
    const messages = await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt))
      .limit(limit)
      .offset(offset);
    
    console.log('🔍 getMessagesByChatId - Found messages:', messages.length);
    console.log('🔍 getMessagesByChatId - Message IDs:', messages.map(m => m.id));
    
    return messages;
  } catch (error) {
    console.error('🔍 getMessagesByChatId - Error:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to get messages by chat id');
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get message by id');
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({ chatId, timestamp }: { chatId: string; timestamp: Date }) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)));

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      return await db.delete(message).where(and(eq(message.chatId, chatId), inArray(message.id, messageIds)));
    }
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete messages by chat id after timestamp');
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update chat visibility by id');
  }
}

export async function updateChatTitleById({ chatId, title }: { chatId: string; title: string }) {
  try {
    const [updatedChat] = await db
      .update(chat)
      .set({ title, updatedAt: new Date() })
      .where(eq(chat.id, chatId))
      .returning();
    return updatedChat;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update chat title by id');
  }
}

export async function updateChatPinStatus({ chatId, isPinned }: { chatId: string; isPinned: boolean }) {
  try {
    const [updatedChat] = await db
      .update(chat)
      .set({ isPinned, updatedAt: new Date() })
      .where(eq(chat.id, chatId))
      .returning();
    return updatedChat;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update chat pin status');
  }
}

export async function updateChatArchiveStatus({ chatId, isArchived }: { chatId: string; isArchived: boolean }) {
  try {
    const [updatedChat] = await db
      .update(chat)
      .set({ isArchived, updatedAt: new Date() })
      .where(eq(chat.id, chatId))
      .returning();
    return updatedChat;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update chat archive status');
  }
}

export async function getChatsWithLastMessage({ userId }: { userId: string }) {
  try {
    // Get all chats for the user
    const chats = await db
      .select({
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        visibility: chat.visibility,
        isPinned: chat.isPinned,
        isArchived: chat.isArchived,
      })
      .from(chat)
      .where(eq(chat.userId, userId))
      .orderBy(desc(chat.updatedAt));

    // Get message counts for each chat
    const messageCounts = await db
      .select({
        chatId: message.chatId,
        count: sql<number>`count(*)`.as('count'),
      })
      .from(message)
      .where(inArray(message.chatId, chats.map(c => c.id)))
      .groupBy(message.chatId);

    const messageCountMap = new Map(messageCounts.map(mc => [mc.chatId, mc.count]));

    // Get the last message for each chat (simplified approach)
    const lastMessages = await db
      .select({
        chatId: message.chatId,
        id: message.id,
        role: message.role,
        parts: message.parts,
        createdAt: message.createdAt,
      })
      .from(message)
      .where(inArray(message.chatId, chats.map(c => c.id)))
      .orderBy(desc(message.createdAt));

    // Group messages by chat and get the latest one for each
    const lastMessageMap = new Map();
    lastMessages.forEach(msg => {
      if (!lastMessageMap.has(msg.chatId)) {
        lastMessageMap.set(msg.chatId, msg);
      }
    });

    // Transform the data to match the Thread interface
    return chats.map(chat => {
      const lastMessage = lastMessageMap.get(chat.id);
      let lastMessageText = 'No messages yet';
      
      if (lastMessage?.parts) {
        try {
          const parts = lastMessage.parts as any;
          
          if (Array.isArray(parts) && parts.length > 0) {
            // Find the first part that contains actual text content
            let textPart = null;
            
            for (const part of parts) {
              // Skip step-start and other metadata parts
              if (part?.type === 'step-start' || part?.type === 'step-end' || part?.type === 'tool-call') {
                continue;
              }
              
              // Look for parts with actual text content
              if (part?.text) {
                textPart = part.text;
                break;
              } else if (part?.content) {
                textPart = part.content;
                break;
              } else if (typeof part === 'string') {
                textPart = part;
                break;
              } else if (part?.type === 'text' && part?.text) {
                textPart = part.text;
                break;
              }
            }
            
            if (textPart) {
              lastMessageText = textPart;
            } else {
              // If no text part found, try to extract from the first non-metadata part
              const firstNonMetadataPart = parts.find(part => 
                part?.type !== 'step-start' && 
                part?.type !== 'step-end' && 
                part?.type !== 'tool-call'
              );
              
              if (firstNonMetadataPart) {
                if (typeof firstNonMetadataPart === 'string') {
                  lastMessageText = firstNonMetadataPart;
                } else if (firstNonMetadataPart?.text) {
                  lastMessageText = firstNonMetadataPart.text;
                } else if (firstNonMetadataPart?.content) {
                  lastMessageText = firstNonMetadataPart.content;
                } else {
                  lastMessageText = JSON.stringify(firstNonMetadataPart);
                }
              } else {
                lastMessageText = 'Message content';
              }
            }
          } else if (typeof parts === 'string') {
            lastMessageText = parts;
          } else if (parts?.text) {
            lastMessageText = parts.text;
          } else if (parts?.content) {
            lastMessageText = parts.content;
          } else {
            // Try to stringify the parts if it's an object
            lastMessageText = typeof parts === 'object' ? JSON.stringify(parts) : String(parts);
          }
          
          // Truncate the message if it's too long
          if (lastMessageText.length > 100) {
            lastMessageText = lastMessageText.substring(0, 100) + '...';
          }
        } catch (error) {
          console.error('Error parsing message parts:', error);
          lastMessageText = 'Message content';
        }
      }

      return {
        id: chat.id,
        title: chat.title,
        lastMessage: lastMessageText,
        timestamp: (lastMessage?.createdAt as Date)?.toISOString() || (chat.updatedAt as Date).toISOString(),
        isPinned: chat.isPinned,
        isArchived: chat.isArchived,
        messageCount: messageCountMap.get(chat.id) || 0,
      };
    });
  } catch (error) {
    console.error('Error in getChatsWithLastMessage:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to get chats with last message');
  }
}

export async function getMessageCountByUserId({ id, differenceInHours }: { id: string; differenceInHours: number }) {
  try {
    // Use the new message usage tracking system instead
    // This is more reliable as it won't be affected by message deletions
    return await getMessageCount({ userId: id });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get message count by user id');
  }
}

export async function createStreamId({ streamId, chatId }: { streamId: string; chatId: string }) {
  try {
    await db.insert(stream).values({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create stream id');
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get stream ids by chat id');
  }
}

export async function getExtremeSearchUsageByUserId({ userId }: { userId: string }) {
  try {
    const now = new Date();
    // Start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Start of next month
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    startOfNextMonth.setHours(0, 0, 0, 0);

    const [usage] = await db
      .select()
      .from(extremeSearchUsage)
      .where(
        and(
          eq(extremeSearchUsage.userId, userId),
          gte(extremeSearchUsage.date, startOfMonth),
          lt(extremeSearchUsage.date, startOfNextMonth),
        ),
      )
      .limit(1);

    return usage;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get extreme search usage');
  }
}

export async function incrementExtremeSearchUsage({ userId }: { userId: string }) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // End of current month for monthly reset
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    endOfMonth.setHours(0, 0, 0, 0);

    const existingUsage = await getExtremeSearchUsageByUserId({ userId });

    if (existingUsage) {
      const [updatedUsage] = await db
        .update(extremeSearchUsage)
        .set({
          searchCount: existingUsage.searchCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(extremeSearchUsage.id, existingUsage.id))
        .returning();
      return updatedUsage;
    } else {
      const [newUsage] = await db
        .insert(extremeSearchUsage)
        .values({
          userId,
          searchCount: 1,
          date: today,
          resetAt: endOfMonth,
        })
        .returning();
      return newUsage;
    }
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to increment extreme search usage');
  }
}

export async function getExtremeSearchCount({ userId }: { userId: string }): Promise<number> {
  try {
    const usage = await getExtremeSearchUsageByUserId({ userId });
    return usage?.searchCount || 0;
  } catch (error) {
    console.error('Error getting extreme search count:', error);
    return 0;
  }
}

export async function getMessageUsageByUserId({ userId }: { userId: string }) {
  try {
    const now = new Date();
    // Start of current day
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startOfDay.setHours(0, 0, 0, 0);

    // Start of next day
    const startOfNextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    startOfNextDay.setHours(0, 0, 0, 0);

    const [usage] = await db
      .select()
      .from(messageUsage)
      .where(
        and(eq(messageUsage.userId, userId), gte(messageUsage.date, startOfDay), lt(messageUsage.date, startOfNextDay)),
      )
      .limit(1);

    return usage;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get message usage');
  }
}

export async function incrementMessageUsage({ userId }: { userId: string }) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // End of current day for daily reset
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    endOfDay.setHours(0, 0, 0, 0);

    // Clean up previous day entries for this user
    await db.delete(messageUsage).where(and(eq(messageUsage.userId, userId), lt(messageUsage.date, today)));

    const existingUsage = await getMessageUsageByUserId({ userId });

    if (existingUsage) {
      const [updatedUsage] = await db
        .update(messageUsage)
        .set({
          messageCount: existingUsage.messageCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(messageUsage.id, existingUsage.id))
        .returning();
      return updatedUsage;
    } else {
      const [newUsage] = await db
        .insert(messageUsage)
        .values({
          userId,
          messageCount: 1,
          date: today,
          resetAt: endOfDay,
        })
        .returning();
      return newUsage;
    }
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to increment message usage');
  }
}

export async function getMessageCount({ userId }: { userId: string }): Promise<number> {
  try {
    const usage = await getMessageUsageByUserId({ userId });
    return usage?.messageCount || 0;
  } catch (error) {
    console.error('Error getting message count:', error);
    return 0;
  }
}

export async function getHistoricalUsageData({ userId }: { userId: string }) {
  try {
    // Get actual message data for the last 90 days from message table (3 months)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 89);

    // Get all user messages from their chats in the date range
    const historicalMessages = await db
      .select({
        createdAt: message.createdAt,
        role: message.role,
      })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, userId),
          eq(message.role, 'user'), // Only count user messages, not assistant responses
          gte(message.createdAt, startDate),
          lt(message.createdAt, endDate),
        ),
      )
      .orderBy(asc(message.createdAt));

    // Group messages by date and count them
    const dailyCounts = new Map<string, number>();

    historicalMessages.forEach((msg) => {
      const dateKey = msg.createdAt.toISOString().split('T')[0]; // Get YYYY-MM-DD format
      dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);
    });

    // Convert to array format expected by the frontend
    const result = Array.from(dailyCounts.entries()).map(([date, count]) => ({
      date: new Date(date),
      messageCount: count,
    }));

    return result;
  } catch (error) {
    console.error('Error getting historical usage data:', error);
    return [];
  }
}

// Custom Instructions CRUD operations
export async function getCustomInstructionsByUserId({ userId }: { userId: string }) {
  try {
    const [instructions] = await db
      .select()
      .from(customInstructions)
      .where(eq(customInstructions.userId, userId))
      .limit(1);

    return instructions;
  } catch (error) {
    console.error('Error getting custom instructions:', error);
    return null;
  }
}

export async function createCustomInstructions({ userId, content }: { userId: string; content: string }) {
  try {
    const [newInstructions] = await db
      .insert(customInstructions)
      .values({
        userId,
        content,
      })
      .returning();

    return newInstructions;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create custom instructions');
  }
}

export async function updateCustomInstructions({ userId, content }: { userId: string; content: string }) {
  try {
    const [updatedInstructions] = await db
      .update(customInstructions)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(eq(customInstructions.userId, userId))
      .returning();

    return updatedInstructions;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update custom instructions');
  }
}

export async function deleteCustomInstructions({ userId }: { userId: string }) {
  try {
    const [deletedInstructions] = await db
      .delete(customInstructions)
      .where(eq(customInstructions.userId, userId))
      .returning();

    return deletedInstructions;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete custom instructions');
  }
}

// Payment CRUD operations
export async function getPaymentsByUserId({ userId }: { userId: string }) {
  try {
    // Check cache first
    const cachedPayments = getDodoPayments(userId);
    if (cachedPayments) {
      return cachedPayments.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // Fetch from database and cache
    const payments = await db.select().from(payment).where(eq(payment.userId, userId)).orderBy(desc(payment.createdAt));
    setDodoPayments(userId, payments);
    return payments;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get payments by user id');
  }
}

export async function getPaymentById({ paymentId }: { paymentId: string }) {
  try {
    const [selectedPayment] = await db.select().from(payment).where(eq(payment.id, paymentId));
    return selectedPayment;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get payment by id');
  }
}

export async function getSuccessfulPaymentsByUserId({ userId }: { userId: string }) {
  try {
    return await db
      .select()
      .from(payment)
      .where(and(eq(payment.userId, userId), eq(payment.status, 'succeeded')))
      .orderBy(desc(payment.createdAt));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get successful payments by user id');
  }
}

export async function getTotalPaymentAmountByUserId({ userId }: { userId: string }) {
  try {
    const payments = await getSuccessfulPaymentsByUserId({ userId });
    return payments.reduce((total, payment) => total + (payment.totalAmount || 0), 0);
  } catch (error) {
    console.error('Error getting total payment amount:', error);
    return 0;
  }
}

export async function hasSuccessfulDodoPayment({ userId }: { userId: string }) {
  try {
    // Check cache first for overall status
    const cachedStatus = getDodoProStatus(userId);
    if (cachedStatus !== null) {
      return cachedStatus.hasPayments || false;
    }

    // Fallback to database query
    const payments = await getSuccessfulPaymentsByUserId({ userId });
    const hasPayments = payments.length > 0;
    
    // Cache the result
    const statusData = { hasPayments, isProUser: false };
    setDodoProStatus(userId, statusData);
    
    return hasPayments;
  } catch (error) {
    console.error('Error checking DodoPayments status:', error);
    return false;
  }
}

export async function isDodoPaymentsProExpired({ userId }: { userId: string }) {
  try {
    const payments = await getSuccessfulPaymentsByUserId({ userId });
    
    if (payments.length === 0) {
      return true; // No payments = expired
    }
    
    // Get the most recent successful payment
    const mostRecentPayment = payments
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    
    // Check if it's older than 1 month
    const paymentDate = new Date(mostRecentPayment.createdAt);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    return paymentDate <= oneMonthAgo;
  } catch (error) {
    console.error('Error checking DodoPayments expiration:', error);
    return true;
  }
}

export async function getDodoPaymentsExpirationInfo({ userId }: { userId: string }) {
  try {
    const payments = await getSuccessfulPaymentsByUserId({ userId });
    
    if (payments.length === 0) {
      return null;
    }
    
    // Get the most recent successful payment
    const mostRecentPayment = payments
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    
    // Calculate expiration date (1 month from payment)
    const expirationDate = new Date(mostRecentPayment.createdAt);
    expirationDate.setMonth(expirationDate.getMonth() + 1);
    
    // Calculate days until expiration
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      paymentDate: mostRecentPayment.createdAt,
      expirationDate,
      daysUntilExpiration,
      isExpired: daysUntilExpiration <= 0,
      isExpiringSoon: daysUntilExpiration <= 7 && daysUntilExpiration > 0,
    };
  } catch (error) {
    console.error('Error getting DodoPayments expiration info:', error);
    return null;
  }
}
