import { supabase } from '@/integrations/supabase/client';

/**
 * Initiates Google OAuth sign-in flow via Supabase.
 * Redirects user to Google consent screen and returns to /auth/callback.
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}
