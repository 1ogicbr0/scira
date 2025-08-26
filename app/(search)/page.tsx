'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatInterface } from '@/components/chat-interface';
import { InstallPrompt } from '@/components/InstallPrompt';
import { useAppSession } from '@/lib/session-context';
import { v4 as uuidv4 } from 'uuid';

const SearchParamsWrapper = () => {
  const searchParams = useSearchParams();
  const newChatId = searchParams.get('newChat');
  const { user, isAuthenticated, isLoading } = useAppSession();

  // Generate a new UUID if no chat ID is provided
  const chatId = newChatId || uuidv4();

  // Debug global session
  console.log('🔍 Home page - user:', user);
  console.log('🔍 Home page - isAuthenticated:', isAuthenticated);
  console.log('🔍 Home page - isLoading:', isLoading);

  return (
    <>
      <ChatInterface initialChatId={chatId} />
      <InstallPrompt />
    </>
  );
};

const Home = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchParamsWrapper />
    </Suspense>
  );
};

export default Home;
