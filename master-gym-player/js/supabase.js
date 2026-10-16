// js/supabase.js
// Configure with your Supabase credentials or inject via window variables
const supabaseUrl = window.ENV_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const supabaseKey = window.ENV_SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY';

if (window.supabase && typeof window.supabase.createClient === 'function') {
  window.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
}
