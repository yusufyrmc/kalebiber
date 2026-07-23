async function handleSignUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    })
  
    if (error) console.error('Kayıt hatası:', error.message)
    else console.log('Kayıt başarılı! E-postanızı kontrol edin.')
  }
  