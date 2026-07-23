import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jycmisyookzatuulifxl.supabase.co/rest/v1/'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y21pc3lvb2t6YXR1dWxpZnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODc0NDMsImV4cCI6MjA5NDc2MzQ0M30.3lt2X5e5l0fmozK9vOnnDTGp0sqSc_u9RoLZKy5nwyA'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

