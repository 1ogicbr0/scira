import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { session, user, chat } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { 
  updateChatPinStatus, 
  updateChatArchiveStatus, 
  getChatsWithLastMessage,
  saveChat,
  saveMessages,
  updateChatTitleById,
  getChatById,
  deleteChatById
} from '@/lib/db/queries';

// Helper function to get user from session
async function getUserFromSession(request: NextRequest) {
  try {
    const cookies = request.headers.get('cookie');
    if (!cookies) return null;

    const match = cookies.match(/better-auth\.session_token=([^;]+)/);
    if (!match) return null;

    const sessionToken = match[1];
    const sessionRecord = await db.query.session.findFirst({
      where: eq(session.token, sessionToken),
    });

    if (!sessionRecord || new Date() > sessionRecord.expiresAt) {
      return null;
    }

    const userRecord = await db.query.user.findFirst({
      where: eq(user.id, sessionRecord.userId),
    });

    return userRecord;
  } catch (error) {
    console.error('Error getting user from session:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getUserFromSession(request);
    
    console.log('GET /api/chat-management - User:', currentUser?.id);
    
    if (!currentUser?.id) {
      console.log('GET /api/chat-management - No user session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('GET /api/chat-management - Fetching threads for user:', currentUser.id);
    
    // Test database connection first
    try {
      const testChat = await db.select().from(chat).where(eq(chat.userId, currentUser.id)).limit(1);
      console.log('GET /api/chat-management - Database connection test successful, found chats:', testChat.length);
    } catch (dbTestError) {
      console.error('GET /api/chat-management - Database connection test failed:', dbTestError);
      return NextResponse.json({ error: 'Database connection failed', details: dbTestError instanceof Error ? dbTestError.message : 'Unknown error' }, { status: 500 });
    }
    
    try {
      const threads = await getChatsWithLastMessage({ userId: currentUser.id });
      console.log('GET /api/chat-management - Found threads:', threads.length);
      return NextResponse.json({ threads });
    } catch (dbError) {
      console.error('GET /api/chat-management - Database error:', dbError);
      return NextResponse.json({ error: 'Database error', details: dbError instanceof Error ? dbError.message : 'Unknown error' }, { status: 500 });
    }
  } catch (error) {
    console.error('GET /api/chat-management - Error fetching threads:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromSession(request);
    if (!currentUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId, title, visibility, messages } = await request.json();

    if (!chatId || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if chat exists
    const existingChat = await getChatById({ id: chatId });
    
    if (existingChat) {
      // Update existing chat
      await updateChatTitleById({ chatId, title });
    } else {
      // Create new chat
      await saveChat({
        id: chatId,
        userId: currentUser.id,
        title,
        visibility: visibility || 'private',
      });
    }

    // Save messages if provided (now optional since messages are saved by search API)
    if (messages && Array.isArray(messages) && messages.length > 0) {
      console.log('Saving messages via chat management API:', messages.length);
      const messagesToSave = messages.map(msg => ({
        chatId,
        role: msg.role,
        parts: msg.parts,
        attachments: msg.attachments || [],
        createdAt: msg.createdAt instanceof Date ? msg.createdAt : new Date(msg.createdAt || Date.now()),
      }));
      
      await saveMessages({ messages: messagesToSave });
    } else {
      console.log('No messages to save via chat management API (messages are saved by search API)');
    }

    return NextResponse.json({ success: true, chatId });
  } catch (error) {
    console.error('Error saving chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getUserFromSession(request);
    if (!currentUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId, action, value } = await request.json();

    if (!chatId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result;
    switch (action) {
      case 'pin':
        result = await updateChatPinStatus({ chatId, isPinned: value });
        break;
      case 'archive':
        result = await updateChatArchiveStatus({ chatId, isArchived: value });
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, chat: result });
  } catch (error) {
    console.error('Error updating chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getUserFromSession(request);
    if (!currentUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ error: 'Missing chatId parameter' }, { status: 400 });
    }

    // Verify the chat belongs to the user
    const chat = await getChatById({ id: chatId });
    if (!chat || chat.userId !== currentUser.id) {
      return NextResponse.json({ error: 'Chat not found or access denied' }, { status: 404 });
    }

    // Delete the chat and all its messages
    await deleteChatById({ id: chatId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 