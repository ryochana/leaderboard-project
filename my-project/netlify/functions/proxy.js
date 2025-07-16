// นี่คือโค้ดที่จะรันบนเซิร์ฟเวอร์ของ Netlify (Node.js)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const FormData = require('form-data');

exports.handler = async function(event, context) {
    // 1. ดึง URL ของ Google Apps Script มาจาก Environment Variable เพื่อความปลอดภัย
    const GOOGLE_SCRIPT_URL = process.env.VITE_API_URL;

    if (!GOOGLE_SCRIPT_URL) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Google Script URL is not configured." })
        };
    }

    // 2. ตรวจสอบว่าเป็น GET หรือ POST request
    if (event.httpMethod === "GET") {
        // สำหรับ GET, เราต้องส่งต่อ query parameters ไปด้วย
        const params = new URLSearchParams(event.queryStringParameters).toString();
        const url = `${GOOGLE_SCRIPT_URL}?${params}`;

        try {
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(url);
            const text = await response.text();

            // Google Apps Script แบบ GET จะห่อ JSON ด้วย callback
            // เราต้องดึงเฉพาะ JSON ออกมา
            const jsonText = text.match(/\((.*)\)/)[1];
            
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: jsonText
            };
        } catch (error) {
            return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
        }

    // proxy.js -> ส่วนของ POST
} else if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body);
    const action = body.action;

    // --- ส่วนที่เพิ่มเข้ามา ---
    if (action === 'uploadProfileImage') {
        // ถ้าเป็นการอัปโหลดรูป ให้จัดการที่นี่โดยตรง
        try {
            const IMGBB_API_KEY = process.env.VITE_IMGBB_API_KEY;
            if (!IMGBB_API_KEY) throw new Error("IMGBB API Key is not configured in Netlify.");

            // data:image/jpeg;base64,/9j/4AAQSkZJRg...
            // เราต้องการแค่ส่วนที่เป็น base64
            const base64Data = body.fileData.split(',')[1];
            
            const form = new FormData();
            form.append('image', base64Data);
            form.append('name', body.fileName);

            const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: form
            });

            const imgbbResult = await imgbbResponse.json();

            if (!imgbbResult.success) {
                throw new Error(`ImgBB upload failed: ${imgbbResult.error.message}`);
            }

            const imageUrl = imgbbResult.data.url;

            const googlePayload = {
    		action: 'uploadProfileImage',
  		  studentId: body.studentId,
   		 imageUrl: imageUrl
	};

            const googleResponse = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(googlePayload)
            });

            const googleResult = await googleResponse.json();
            return { statusCode: 200, body: JSON.stringify(googleResult) };

        } catch (error) {
            return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
        }
    }
    // --- สิ้นสุดส่วนที่เพิ่มเข้ามา ---

    // ถ้าเป็น action อื่นๆ ให้ทำงานเหมือนเดิม
    try {
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
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
}

    // ถ้าไม่ใช่ GET หรือ POST
    return {
        statusCode: 405, // Method Not Allowed
        body: JSON.stringify({ error: "Only GET and POST methods are supported." })
    };
};