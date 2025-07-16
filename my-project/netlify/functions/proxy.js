// netlify/functions/proxy.js (Stable version with correct fetch)

// ใช้ node-fetch v2 ซึ่งเข้ากันได้ดีกับ require
const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async function(event, context) {
    const GOOGLE_SCRIPT_URL = process.env.VITE_API_URL;

    // --- ส่วนของ GET Request (สำหรับโหลดข้อมูล) ---
    if (event.httpMethod === "GET") {
        const params = new URLSearchParams(event.queryStringParameters).toString();
        const url = `${GOOGLE_SCRIPT_URL}?${params}`;
        try {
            const response = await fetch(url);
            const text = await response.text();
            // ดึงเฉพาะ JSON ที่อยู่ในวงเล็บออกมา
            const jsonText = text.match(/\((.*)\)/)[1];
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: jsonText
            };
        } catch (error) {
            return { statusCode: 500, body: JSON.stringify({ error: `Proxy GET Error: ${error.message}` }) };
        }
    }

    // --- ส่วนของ POST Request (สำหรับส่งข้อมูล) ---
    if (event.httpMethod === "POST") {
        try {
            const body = JSON.parse(event.body);
            const action = body.action;

            // --- เคสพิเศษ: อัปโหลดรูปภาพ ---
            if (action === 'uploadProfileImage') {
                const IMGBB_API_KEY = process.env.VITE_IMGBB_API_KEY;
                if (!IMGBB_API_KEY) throw new Error("IMGBB API Key is not configured in Netlify.");

                const base64Data = body.fileData.split(',')[1];
                
                const form = new FormData();
                form.append('image', base64Data);
                form.append('name', body.fileName);

                // 1. อัปโหลดไป ImgBB
                const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: form
                });
                const imgbbResult = await imgbbResponse.json();
                if (!imgbbResult.success) {
                    throw new Error(`ImgBB upload failed: ${imgbbResult.error.message}`);
                }
                const imageUrl = imgbbResult.data.url;

                // 2. ส่งแค่ URL ไปบันทึกที่ Google Script
                const googlePayload = {
                    action: 'uploadProfileImage',
                    studentId: body.studentId,
                    imageUrl: imageUrl,
                    user: body.user // ส่ง user object ไปด้วยตามโค้ดเดิม
                };
                const googleResponse = await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(googlePayload)
                });
                const googleResult = await googleResponse.json();
                return { statusCode: 200, body: JSON.stringify(googleResult) };
            }

            // --- สำหรับ Action อื่นๆ ---
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: event.body
            });
            const data = await response.json();
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            };
        } catch (error) {
            return { statusCode: 500, body: JSON.stringify({ success: false, error: `Proxy POST Error: ${error.message}` }) };
        }
    }

    // ถ้าไม่ใช่ GET หรือ POST
    return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" })
    };
};