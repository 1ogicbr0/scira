# Database Setup Guide

## Quick Setup

1. **Start the database services:**
   ```bash
   ./setup-db.sh
   ```

2. **Or manually:**
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up -d postgres redis
   
   # Wait for services to be ready, then run migrations
   npm run db:push
   ```

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/scira"
REDIS_URL="redis://localhost:6379"

# Better Auth (generate a random secret)
BETTER_AUTH_SECRET="your-secret-key-here"

# OAuth Providers (get these from GitHub, Google, Twitter developer consoles)
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
TWITTER_CLIENT_ID="your-twitter-client-id"
TWITTER_CLIENT_SECRET="your-twitter-client-secret"

# Add other API keys as needed...
```

## Database Commands

- `npm run db:generate` - Generate new migrations
- `npm run db:migrate` - Run migrations
- `npm run db:push` - Push schema changes directly
- `npm run db:studio` - Open Drizzle Studio

## Troubleshooting

If you get connection errors:
1. Make sure Docker is running
2. Check that PostgreSQL and Redis containers are up: `docker-compose ps`
3. Verify the DATABASE_URL in your `.env.local`
4. Try restarting the containers: `docker-compose restart postgres redis` 