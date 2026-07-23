async function handleSignIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })
  
    if (error) console.error('Giriş hatası:', error.message)
    else console.log('Giriş başarılı!', data)
  }

  