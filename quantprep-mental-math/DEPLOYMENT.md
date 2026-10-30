# Deployment Notes

## High Score Storage

The app currently uses a file-based storage system for the global high score (`data/highscore.json`). This works for local development but **will not persist in production** on serverless platforms like Vercel, Netlify, or similar services because they use read-only filesystems.

### For Production Deployment

To make the high score persist across deployments and users, you'll need to use a database. Here are recommended options:

#### Option 1: Supabase (Recommended - Free Tier Available)
1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Create a table:
   ```sql
   CREATE TABLE high_scores (
     id SERIAL PRIMARY KEY,
     score NUMERIC NOT NULL,
     updated_at TIMESTAMP DEFAULT NOW()
   );
   ```
4. Insert initial value:
   ```sql
   INSERT INTO high_scores (score) VALUES (0);
   ```
5. Update `app/api/highscore/route.ts` to use Supabase client

#### Option 2: Vercel KV (Redis)
1. Add Vercel KV to your project
2. Update the API route to use KV storage

#### Option 3: Upstash Redis (Free Tier)
1. Create account at [upstash.com](https://upstash.com)
2. Create a Redis database
3. Update API route to use Upstash client

### Current Implementation

The current file-based implementation works for:
- ✅ Local development
- ✅ Self-hosted servers with persistent storage
- ❌ Serverless platforms (Vercel, Netlify, etc.)

For now, the app will work locally and you can upgrade to a database solution when ready to deploy to production.

