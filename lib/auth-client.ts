import { createAuthClient } from 'better-auth/react';
import { dodopaymentsClient } from '@dodopayments/better-auth';

export const authClient = createAuthClient({
  baseURL: process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_APP_URL : 'http://localhost:3000',
  plugins: [dodopaymentsClient()],
  cookieName: 'better-auth.session_token',
});

export const { signIn, signOut, signUp, useSession } = authClient;

// Export betterauthClient for compatibility with existing code
export const betterauthClient = authClient;
