// supabase/functions/create-mission/index.ts (หรือ .js)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { missionData } = await req.json()

  // Verify that the user calling this function is an admin
  // This is a basic check. In a real app, you'd use Supabase Auth and RLS more thoroughly.
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.split('Bearer ')[1]

  if (!token) {
    return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 401,
    })
  }

  // Create a Supabase client with the service_role key
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Verify user is admin by checking their role in the 'users' table
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('student_id', token) // Assuming token is student_id for simplicity, but best practice is to use JWT to verify
    .single()
  
  if (userError || user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Permission denied. Admin access required.' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 403,
    })
  }

  // Insert the new mission
  const { data, error } = await supabaseAdmin
    .from('missions')
    .insert({
      topic: missionData.topic,
      detail: missionData.detail,
      assigned_date: missionData.assignedDate,
      due_date: missionData.dueDate,
      max_points: missionData.maxPoints,
      grade: missionData.grade,
    })
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  return new Response(JSON.stringify({ success: true, mission: data }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
