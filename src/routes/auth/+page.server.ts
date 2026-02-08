import { redirect } from '@sveltejs/kit'

import type { Actions } from './$types'

export const actions: Actions = {
  register: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    console.log("Registering user:", email);
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      console.error("SignUp error:", error)
      redirect(303, '/auth/error')
    } else {
      console.log("SignUp success:", data);
      redirect(303, '/')
    }
  },
  login: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error(error)
      redirect(303, '/auth')
    } else {
      redirect(303, '/')
    }
  },
}