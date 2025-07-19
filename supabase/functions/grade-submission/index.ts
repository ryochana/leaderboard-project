// supabase/functions/grade-submission/index.ts (หรือ .js)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { studentId, missionId, score, userToken } = await req.json()

  // Verify that the user calling this function is an admin
  // (Simplified check again, real apps use JWT verification)
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('student_id', userToken) // Assuming userToken is student_id
    .single()
  
  if (userError || user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Permission denied. Admin access required.' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 403,
    })
  }

  // Upsert the score
  const { data, error } = await supabaseAdmin
    .from('submissions')
    .upsert({
      student_id: studentId,
      mission_id: missionId,
      score: score, // Can be null if ungraded
    }, {
      onConflict: 'student_id,mission_id'
    })
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  return new Response(JSON.stringify({ success: true, submission: data }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
