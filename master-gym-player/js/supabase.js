// js/supabase.js
const supabaseUrl = 'https://dqadrnqntyemxebljaue.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxYWRybnFudHllbXhlYmxqYXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDUwMzQsImV4cCI6MjA5MDk4MTAzNH0.kGpyMeEp84UwR5DXURdg1xsSnvIxiw8poIJGTPq24aM';

window.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
