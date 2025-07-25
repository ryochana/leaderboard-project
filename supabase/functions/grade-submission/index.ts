// supabase/functions/grade-submission/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': req.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-auth',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  let requestBody;
  try {
      requestBody = await req.json();
  } catch (jsonError) {
      console.error("Failed to parse request body as JSON:", jsonError);
      return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 400,
      });
  }
  const { studentId, missionId, score, userToken } = requestBody; // userToken คือ Base64 token จาก Frontend

  // --- START: Admin Authentication Logic ---
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // ดึง Base64 Token จาก Custom Header 'X-Admin-Auth'
  const base64Token = req.headers.get('X-Admin-Auth'); 

  console.log('--- grade-submission Function Log ---');
  console.log('Base64 Token:', base64Token); // ตรวจสอบว่าได้ค่าจาก Header หรือไม่

  if (!base64Token) { // ถ้าไม่มี Token
    console.error('Error: X-Admin-Auth token missing. Returning 401.');
    return new Response(JSON.stringify({ error: 'Authorization token missing. Please log in as Admin.' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 401, // Unauthorized
    })
  }

  let decodedToken;
  try {
    decodedToken = JSON.parse(atob(base64Token)); // ถอดรหัส Base64 และแปลงเป็น JSON
  } catch (decodeError) {
    console.error('Error decoding or parsing token:', decodeError);
    return new Response(JSON.stringify({ error: 'Invalid token format. Please log in again.' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 401, // Unauthorized
    })
  }

  const adminStudentId = parseInt(decodedToken.student_id, 10);
  const adminRole = decodedToken.role;

  console.log('Decoded Token:', decodedToken);
  console.log('Parsed adminStudentId:', adminStudentId);
  console.log('Parsed adminRole:', adminRole);

  if (isNaN(adminStudentId) || adminRole !== 'admin') { // ตรวจสอบ ID และ Role ต้องเป็นตัวเลขและ Admin
    console.error('Error: Invalid Admin ID or Role. Returning 403.');
    return new Response(JSON.stringify({ error: 'Permission denied. Invalid Admin credentials.' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 403, // Forbidden
    })
  }
  // --- END: Admin Authentication Logic ---

  const { data, error } = await supabaseAdmin
    .from('submissions')
    .upsert({
      student_id: studentId,
      mission_id: missionId,
      score: score,
    }, {
      onConflict: 'student_id,mission_id'
    })
  
  if (error) {
    console.error('Error upserting submission:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 400, // Bad Request
    })
  }

  return new Response(JSON.stringify({ success: true, submission: data }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
    status: 200, // OK
  })
})
