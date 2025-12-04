import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jvbrrgqepuhabwddufby.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2YnJyZ3FlcHVoYWJ3ZGR1ZmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTQzODIsImV4cCI6MjA4MDE5MDM4Mn0.aoAyKQyZZwrTbocGqKLxai1kUccAvcY45-B06huKPGo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);