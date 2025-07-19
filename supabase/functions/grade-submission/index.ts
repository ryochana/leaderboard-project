// supabase/functions/grade-submission/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': req.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  const { studentId, missionId, score, userToken } = requestBody; // userToken คือ Base64 token

  // --- START: Admin Authentication Logic ---
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const base64Token = userToken; // ใช้ userToken ที่ส่งมาเป็น Base64 token

  console.log('--- grade-submission Function Log ---');
  console.log('Base64 Token:', base64Token);

  if (!base64Token) { // ถ้าไม่มี Token
    console.error('Error: Base64 token missing. Returning 401.');
    return new Response(JSON.stringify({ error: 'Authorization token missing.' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 401, // Unauthorized
    })
  }

  let decodedToken;
  try {
    decodedToken = JSON.parse(atob(base64Token)); // ถอดรหัส Base64 และแปลงเป็น JSON
  } catch (decodeError) { // ถ้าถอดรหัสไม่ได้ หรือ JSON ไม่ถูกต้อง
    console.error('Error decoding or parsing token:', decodeError);
    return new Response(JSON.stringify({ error: 'Invalid token format.' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 401, // Unauthorized
    })
  }

  const adminStudentId = parseInt(decodedToken.student_id, 10); // ดึง student_id
  const adminRole = decodedToken.role; // ดึง role

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
