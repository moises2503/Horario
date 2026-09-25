// js/config.js
// Reemplaza los valores con tus credenciales reales de Supabase
const SUPABASE_URL = 'https://rwepzomakxqytvdxvuey.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__4cEn4x6wwdq8M_xttcXUg_HfXX9Vba';

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
