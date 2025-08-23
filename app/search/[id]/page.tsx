import { notFound } from 'next/navigation';
import { ChatInterface } from '@/components/chat-interface';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import { Message } from '@/lib/db/schema';
import { Metadata } from 'next';
import { db } from '@/lib/db';
import { session, user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

// Helper function to get user from session (same as in chat-management API)
async function getUserFromSession() {
  try {
    const headersList = await headers();
    const cookies = headersList.get('cookie');
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

interface UIMessage {
  id: string;
  parts: any;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt: Date;
  experimental_attachments?: Array<any>;
}

// metadata
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = (await params).id;
  const chat = await getChatById({ id });
  const currentUser = await getUserFromSession();
  
  // if not chat, return Ola Chat
  if (!chat) {
    return { title: 'Ola Chat' };
  }
  let title;
  // if chat is public, return title
  if (chat.visibility === 'public') {
    title = chat.title;
  }
  // if chat is private, return title
  if (chat.visibility === 'private') {
    if (!currentUser) {
      title = 'Ola Chat';
    }
    if (currentUser!.id !== chat.userId) {
      title = 'Ola Chat';
    }
    title = chat.title;
  }
  return {
    title: title,
    description: 'A search in ola.ai',
    openGraph: {
      title: title,
      url: `https://ola.ai/search/${id}`,
      description: 'A search in ola.ai',
      siteName: 'ola.ai',
      images: [
        {
          url: `https://ola.ai/api/og/chat/${id}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      url: `https://ola.ai/search/${id}`,
      description: 'A search in ola.ai',
      siteName: 'ola.ai',
      creator: '@olaai',
      images: [
        {
          url: `https://ola.ai/api/og/chat/${id}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    alternates: {
      canonical: `https://ola.ai/search/${id}`,
    },
  } as Metadata;
}

function convertToUIMessages(messages: Array<Message>): Array<UIMessage> {
  return messages.map((message) => {
    // Ensure parts are properly structured
    let processedParts = message.parts;

    // If parts is missing or empty for a user message, create a text part from empty string
    if (message.role === 'user' && (!processedParts || !Array.isArray(processedParts) || processedParts.length === 0)) {
      // Create an empty text part since there's no content property in DBMessage
      processedParts = [
        {
          type: 'text',
          text: '',
        },
      ];
    }

    // Extract content from parts or use empty string
    const content =
      processedParts && Array.isArray(processedParts)
        ? processedParts
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join('\n')
        : '';

    return {
      id: message.id,
      parts: processedParts,
      role: message.role as UIMessage['role'],
      content,
      createdAt: message.createdAt,
      experimental_attachments: (message.attachments as Array<any>) ?? [],
    };
  });
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });
  const currentUser = await getUserFromSession();

  console.log('🔍 Page - Chat ID:', id);
  console.log('🔍 Page - Chat found:', !!chat);
  console.log('🔍 Page - Current user:', currentUser?.id);

  // If chat exists in database, handle it normally
  if (chat) {
    if (chat.visibility === 'private') {
      if (!currentUser) {
        console.log('🔍 Page - Private chat, no user, returning notFound');
        return notFound();
      }

      if (currentUser.id !== chat.userId) {
        console.log('🔍 Page - Private chat, user mismatch, returning notFound');
        return notFound();
      }
    }

    // Fetch only the initial 20 messages for faster loading
    const messagesFromDb = await getMessagesByChatId({
      id,
      offset: 0,
    });

    console.log('🔍 Page - Messages from DB: ', messagesFromDb.length);

    const initialMessages = convertToUIMessages(messagesFromDb);

    // Determine if the current user owns this chat
    const isOwner = currentUser ? currentUser.id === chat.userId : false;

    return (
      <ChatInterface
        initialChatId={id}
        initialMessages={initialMessages}
        initialVisibility={chat.visibility as 'public' | 'private'}
        isOwner={isOwner}
      />
    );
  }

  // If chat doesn't exist in database, it could be:
  // 1. A new chat session (fresh UUID)
  // 2. A local storage thread (for unauthenticated users)
  console.log('🔍 Page - Chat not found in database, could be new session or local storage thread:', id);
  
  return (
    <ChatInterface
      initialChatId={id}
      initialMessages={[]} // Empty messages - will be loaded from local storage if available
      initialVisibility="private"
      isOwner={true}
    />
  );
}
