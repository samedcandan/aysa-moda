import crypto from 'crypto';

const API_KEY = process.env.IYZICO_API_KEY;
const SECRET_KEY = process.env.IYZICO_SECRET_KEY;
const BASE_URL = process.env.IYZICO_BASE_URL;

function generateAuthorizationHeader(uri, requestBody) {
  const randomString = Math.random().toString(36).substring(2, 14);
  const jsonBody = JSON.stringify(requestBody);
  
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(randomString + uri + jsonBody)
    .digest('hex');
    
  const authStr = `apiKey:${API_KEY}&randomKey:${randomString}&signature:${signature}`;
  return `IYZWSv2 ${Buffer.from(authStr).toString('base64')}`;
}

export async function iyzicoRequest(path, body) {
  const authorization = generateAuthorizationHeader(path, body);

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authorization,
      'x-iyzi-rnd': Math.random().toString(36).substring(2, 14)
    },
    body: JSON.stringify(body)
  });

  return res.json();
}
