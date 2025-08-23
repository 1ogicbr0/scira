import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user, account, session } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from 'ai';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password, action } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (action === 'sign-up') {
      // Check if user already exists
      const existingUser = await db.query.user.findFirst({
        where: eq(user.email, email),
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'User already exists' },
          { status: 400 }
        );
      }

      // Create new user
      const newUser = await db.insert(user).values({
        id: generateId(),
        email,
        name: email.split('@')[0],
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      // Create account record for credentials
      await db.insert(account).values({
        id: generateId(),
        accountId: newUser[0].id,
        providerId: 'credentials',
        userId: newUser[0].id,
        password: password, // In production, hash this password
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create session manually in the database
      const sessionToken = generateId();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      await db.insert(session).values({
        id: sessionToken,
        token: sessionToken,
        userId: newUser[0].id,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      });

      const response = NextResponse.json(
        { success: true, user: newUser[0] },
        { status: 201 }
      );

      // Set session cookie with Better Auth's expected name
      response.cookies.set('better-auth.session_token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });

      console.log('✅ Created session for user:', newUser[0].id, 'with token:', sessionToken);
      return response;
    }

    if (action === 'sign-in') {
      // Find user by email
      const existingUser = await db.query.user.findFirst({
        where: eq(user.email, email),
      });

      if (!existingUser) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      // Find the account record for this user to check the password
      const userAccount = await db.query.account.findFirst({
        where: eq(account.userId, existingUser.id),
      });

      if (!userAccount) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      // Check password against stored password (in production, use proper password hashing)
      if (password !== userAccount.password) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      // Create session manually in the database
      const sessionToken = generateId();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      await db.insert(session).values({
        id: sessionToken,
        token: sessionToken,
        userId: existingUser.id,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      });

      const response = NextResponse.json(
        { success: true, user: existingUser },
        { status: 200 }
      );

      // Set session cookie with Better Auth's expected name
      response.cookies.set('better-auth.session_token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });

      console.log('✅ Created session for user:', existingUser.id, 'with token:', sessionToken);
      return response;
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Credentials auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 