import { loadEnvConfig } from '@next/env';
import { defineConfig } from 'drizzle-kit';

// Same env files as Next.js (.env.local from `vercel env pull`, .env, …).
loadEnvConfig(process.cwd());

// Migrations prefer the direct (unpooled) Neon URL; the pooled one works too.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  ...(url ? { dbCredentials: { url } } : {}),
  strict: true,
  verbose: true,
});
