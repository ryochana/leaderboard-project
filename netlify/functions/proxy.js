// The final, correct version of proxy.js

// Using dynamic import for ES Modules in a CommonJS environment (Netlify's default)
exports.handler = async (event) => {
  const { default: fetch } = await import('node-fetch');
  const { default: FormData } = await import('form-data');

  const GOOGLE_SCRIPT_URL = process.env.VITE_API_URL;
  const IMGBB_API_KEY = process.env.VITE_IMGBB_API_KEY;

  if (!GOOGLE_SCRIPT_URL) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "VITE_API_URL is not configured in Netlify." })
    };
  }
  
  // --- CORS Headers - สำคัญมาก! ---
  const headers = {
    'Access-Control-Allow-Origin': '*', // Allows any origin
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // --- Handle preflight request for CORS ---
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }


  // --- GET Request Handler ---
  if (event.httpMethod === "GET") {
    // We add a 'callback' parameter because our Apps Script expects it for JSONP
    const params = new URLSearchParams(event.queryStringParameters);
    params.set('callback', 'callback'); // Add a dummy callback name
    
    const url = `${GOOGLE_SCRIPT_URL}?${params.toString()}`;

    try {
      const response = await fetch(url);
      const text = await response.text();

      // *** THIS IS THE FIX ***
      // We will now extract the pure JSON data from the JSONP response
      const jsonTextMatch = text.match(/^callback\(([\s\S]*)\)$/);
      
      if (!jsonTextMatch || !jsonTextMatch[1]) {
        // If it's not JSONP, maybe it's just JSON (e.g., an error message from GAS)
        // Let's try to parse it as plain JSON.
        try {
            JSON.parse(text); // Check if it's valid JSON
            return { statusCode: 200, headers, body: text };
        } catch (e) {
            // If it's neither, then it's a bad response
            return {
                statusCode: 502, // Bad Gateway
                headers,
                body: JSON.stringify({ error: "Bad Gateway: Upstream response was not valid JSON or JSONP.", upstream_body: text })
            };
        }
      }

      // Return only the pure JSON part
      return {
        statusCode: 200,
        headers, // Use our CORS headers
        body: jsonTextMatch[1]
      };

    } catch (error) {
      return { 
        statusCode: 500, 
        headers,
        body: JSON.stringify({ error: `Proxy GET Error: ${error.message}` }) 
      };
    }
  }

  // --- POST Request Handler ---
  // POST requests from our Apps Script return pure JSON, so this part is mostly fine.
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body);
      const action = body.action;

      if (action === 'uploadProfileImage') {
        if (!IMGBB_API_KEY) throw new Error("VITE_IMGBB_API_KEY is not configured.");

        const base64Data = body.fileData.split(',')[1];
        const form = new FormData();
        form.append('image', base64Data);

        const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: form
        });
        const imgbbResult = await imgbbResponse.json();
        if (!imgbbResult.success) {
          throw new Error(`ImgBB upload failed: ${imgbbResult.error?.message || 'Unknown'}`);
        }
        
        const googlePayload = {
          action: 'uploadProfileImage',
          studentId: body.studentId,
          imageUrl: imgbbResult.data.url,
          user: body.user,
        };

        const googleResponse = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(googlePayload)
        });
        const googleResult = await googleResponse.json();
        return { statusCode: 200, headers, body: JSON.stringify(googleResult) };
      }

      // Other POST actions
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: event.body
      });
      const data = await response.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data)
      };

    } catch (error) {
      return { 
        statusCode: 500, 
        headers,
        body: JSON.stringify({ success: false, error: `Proxy POST Error: ${error.message}` }) 
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: 'Method Not Allowed'
  };
};
