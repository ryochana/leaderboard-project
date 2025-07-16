const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async function(event, context) {
    const GOOGLE_SCRIPT_URL = process.env.VITE_API_URL;

    if (!GOOGLE_SCRIPT_URL) {
        return { statusCode: 500, body: JSON.stringify({ error: "VITE_API_URL is not configured in Netlify." }) };
    }

    if (event.httpMethod === "GET") {
        const params = new URLSearchParams(event.queryStringParameters).toString();
        const url = `${GOOGLE_SCRIPT_URL}?${params}`;
        try {
            const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
            const text = await response.text();
            
            if (!text.startsWith(event.queryStringParameters.callback)) {
                return { statusCode: 502, body: JSON.stringify({ error: "Bad Gateway: Upstream response was not valid JSONP.", upstream_body: text }) };
            }

            const jsonText = text.match(/\(([\s\S]*)\)/)[1];
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: jsonText
            };
        } catch (error) {
            return { statusCode: 500, body: JSON.stringify({ error: `Proxy GET Error: ${error.message}` }) };
        }
    }

    if (event.httpMethod === "POST") {
        try {
            const body = JSON.parse(event.body);
            const action = body.action;

            if (action === 'uploadProfileImage') {
                const IMGBB_API_KEY = process.env.VITE_IMGBB_API_KEY;
                if (!IMGBB_API_KEY) throw new Error("VITE_IMGBB_API_KEY is not configured in Netlify.");

                const base64Data = body.fileData.split(',')[1];
                const form = new FormData();
                form.append('image', base64Data);
                
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
                    imageUrl: imageUrl,
                    user: body.user,
                };

                const googleResponse = await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(googlePayload)
                });
                const googleResult = await googleResponse.json();
                return { statusCode: 200, body: JSON.stringify(googleResult) };
            }

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

    return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" })
    };
};