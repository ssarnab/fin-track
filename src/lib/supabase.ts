import { createClient } from "@supabase/supabase-js";
import { auth } from "@/lib/firebase";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/**
 * Supabase client that authenticates each request with the current Firebase
 * ID token. Requires Supabase "Third-Party Auth (Firebase)" to be enabled so
 * that RLS policies can match rows via `auth.jwt() ->> 'sub'` (= Firebase uid).
 *
 * We do NOT use Supabase Auth sessions — Firebase is the sole identity source.
 */
export const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  accessToken: async () => {
    const user = auth.currentUser;
    return user ? await user.getIdToken() : null;
  },
});
