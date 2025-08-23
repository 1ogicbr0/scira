import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { session, user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Extract session token from cookie
    const cookies = request.headers.get('cookie');
    console.log('🔍 Session API - Cookies:', cookies);
    
    if (!cookies) {
      console.log('🔍 Session API - No cookies found');
      return NextResponse.json(null);
    }

    const match = cookies.match(/better-auth\.session_token=([^;]+)/);
    if (!match) {
      console.log('🔍 Session API - No session token found in cookies');
      return NextResponse.json(null);
    }

    const sessionToken = match[1];
    console.log('🔍 Session API - Session token:', sessionToken);

    try {
      // Find session in database
      const sessionRecord = await db.query.session.findFirst({
        where: eq(session.token, sessionToken),
      });

      console.log('🔍 Session API - Session record:', sessionRecord);

      if (!sessionRecord) {
        console.log('🔍 Session API - No session record found');
        return NextResponse.json(null);
      }

      // Check if session is expired
      if (new Date() > sessionRecord.expiresAt) {
        console.log('🔍 Session API - Session expired');
        return NextResponse.json(null);
      }

      // Fetch user data separately
      const userRecord = await db.query.user.findFirst({
        where: eq(user.id, sessionRecord.userId),
      });

      console.log('🔍 Session API - User record:', userRecord);

      if (!userRecord) {
        console.log('🔍 Session API - No user record found');
        return NextResponse.json(null);
      }

      console.log('🔍 Session API - Returning session for user:', userRecord.email);

      // Return session with user data
      return NextResponse.json({
        user: userRecord,
        session: sessionRecord,
      });
    } catch (dbError) {
      console.error('🔍 Session API - Database error:', dbError);
      return NextResponse.json(null);
    }
  } catch (error) {
    console.error('🔍 Session API - Error getting session:', error);
    return NextResponse.json(null);
  }
} 