
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jycmisyookzatuulifxl.supabase.co/rest/v1/'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y21pc3lvb2t6YXR1dWxpZnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODc0NDMsImV4cCI6MjA5NDc2MzQ0M30.3lt2X5e5l0fmozK9vOnnDTGp0sqSc_u9RoLZKy5nwyA'

// İstemciyi başlat
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Kayıt Olma Fonksiyonu
export async function handleSignUp(email, password) {
  return await supabase.auth.signUp({ email, password })
}

// Giriş Yapma Fonksiyonu
export async function handleSignIn(email, password) {
  return await supabase.auth.signInWithPassword({ email, password })
}

// Çıkış Yapma Fonksiyonu
export async function handleSignOut() {
  return await supabase.auth.signOut()
}


import { handleSignUp } from './supabaseClient.js'

const registerForm = document.getElementById('register-form')

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('email-input').value
  const password = document.getElementById('password-input').value

  const { data, error } = await handleSignUp(email, password)
  
  if (error) {
    alert('Hata: ' + error.message)
  } else {
    alert('Kayıt başarılı! Lütfen e-postanızı onaylayın.')
  }
})
