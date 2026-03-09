import { supabase } from './supabase';

/**
 * Sign up a new user with email and password.
 * emailRedirectTo uses the current origin so confirmation links always
 * point to the deployed app URL (not localhost).
 * NOTE: Add your Netlify URL to Supabase → Auth → URL Configuration → Redirect URLs.
 */
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Log in with email and password.
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Log out the current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Send a password reset email.
 * The link redirects back to the app (current origin) where the
 * PASSWORD_RECOVERY auth event is detected and the reset form is shown.
 */
export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}

/**
 * Update the authenticated user's password (called after PASSWORD_RECOVERY flow).
 */
export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}

/**
 * Get the current session (user + access token).
 * Returns null if not logged in.
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

/**
 * Subscribe to auth state changes (login, logout, token refresh, password recovery).
 * Callback receives (event, user) so callers can handle PASSWORD_RECOVERY separately.
 * Returns an unsubscribe function.
 *
 * Usage:
 *   const unsub = onAuthChange((event, user) => { ... });
 *   // later: unsub();
 */
export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      callback(event, session?.user ?? null);
    }
  );
  return () => subscription.unsubscribe();
}

/**
 * Update the user's profile (phone, display name, whatsapp link).
 */
export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Get the user's profile.
 */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}
