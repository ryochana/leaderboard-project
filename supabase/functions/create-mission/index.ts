// supabase/functions/create-mission/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // --- NEW CORS HANDLING BLOCK ---
  // Headers to allow CORS requests from your Netlify domain(s)
  const corsHeaders = {
    'Access-Control-Allow-Origin': req.headers.get('Origin') || '*', // Dynamically allows the requesting origin. Safer than hardcoding.
    'Access-Control-Allow-Methods': 'POST, OPTIONS', // Allowed HTTP methods
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', // Allowed request headers
  }

  // Handle OPTIONS request (preflight request from browser)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204, // 204 No Content for successful OPTIONS response
      headers: corsHeaders,
    })
  }
  // --- END NEW CORS HANDLING BLOCK ---

  const { missionData } = await req.json()

  // Verify that the user calling this function is an admin
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.split('Bearer ')[1]

  if (!token) {
    return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }, // Include CORS headers in error response
      status: 401,
    })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('student_id', token)
    .single()
  
  if (userError || user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Permission denied. Admin access required.' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }, // Include CORS headers in error response
      status: 403,
    })
  }

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
      headers: { 'Content-Type': 'application/json', ...corsHeaders }, // Include CORS headers in error response
      status: 400,
    })
  }

  return new Response(JSON.stringify({ success: true, mission: data }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }, // Include CORS headers in success response
    status: 200,
  })
})
