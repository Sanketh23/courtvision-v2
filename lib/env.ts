import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required").optional(),
  // Optional: server-side error tracking. Unset → Sentry disabled (M10).
  SENTRY_DSN: z.string().url().optional(),
});

// Reference each NEXT_PUBLIC_* var as a static member expression so Next.js
// inlines it into the client bundle. Passing `process.env` wholesale does NOT
// get inlined and yields `undefined` on the client.
export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SENTRY_DSN: process.env.SENTRY_DSN,
});
export type Env = z.infer<typeof envSchema>;
