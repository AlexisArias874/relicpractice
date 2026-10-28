/**
 * Supabase is an optional, future integration.
 *
 * The first version is deliberately 100% client-side: no API keys, no remote
 * calls and no account requirement. When accounts, cross-device statistics or
 * saved exercises are added, install `@supabase/supabase-js`, add the project
 * URL and anon key through Vite environment variables, and keep all writes
 * behind an explicit user action.
 *
 * Suggested tables:
 *
 *   profiles        (id uuid primary key references auth.users, display_name)
 *   practice_results(id uuid primary key, user_id uuid, method text,
 *                    category text, difficulty text, mode text, score int,
 *                    time_seconds int, completed_at timestamptz, payload jsonb)
 *   preferences     (user_id uuid primary key, payload jsonb, updated_at)
 *
 * The local `useStats` hook is the single source of truth today, so a future
 * sync layer can upload the local history without changing the UI components.
 */
export const SUPABASE_INTEGRATION_STATUS = 'planned' as const;
