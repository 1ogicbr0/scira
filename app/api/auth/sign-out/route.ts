import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { session } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Extract session token from cookie
    const cookies = request.headers.get('cookie');
    
    if (!cookies) {
      return NextResponse.json({ success: true });
    }

    const match = cookies.match(/better-auth\.session_token=([^;]+)/);
    if (!match) {
      return NextResponse.json({ success: true });
    }

    const sessionToken = match[1];

    // Delete the session from database
    await db.delete(session).where(eq(session.token, sessionToken));

    // Create response with cleared cookie
    const response = NextResponse.json({ success: true });
    
    // Clear the session cookie
    response.cookies.set('better-auth.session_token', '', {
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json({ success: false, error: 'Failed to sign out' }, { status: 500 });
  }
} 