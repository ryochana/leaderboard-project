// นี่คือโค้ดที่จะรันบนเซิร์ฟเวอร์ของ Netlify (Node.js)

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

    } else if (event.httpMethod === "POST") {
        // สำหรับ POST, เราส่งต่อ body ที่ได้รับมา
        try {
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: event.body // ส่ง body ต่อไปตรงๆ
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