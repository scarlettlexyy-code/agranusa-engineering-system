/**
 * frontend/api/gas.js
 * Vercel Serverless Function Proxy for Google Apps Script Backend.
 * Solves browser CORS restrictions and securely forwards requests to Google Apps Script.
 */

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const gasUrl = process.env.GAS_API_URL || process.env.VITE_GAS_API_URL;

  if (!gasUrl) {
    return res.status(500).json({
      success: false,
      error: 'Environment variable GAS_API_URL belum dikonfigurasi di Vercel.'
    });
  }

  try {
    let response;
    if (req.method === 'POST') {
      response = await fetch(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body || {}),
        redirect: 'follow'
      });
    } else {
      const queryString = new URLSearchParams(req.query || {}).toString();
      const targetUrl = queryString ? `${gasUrl}?${queryString}` : gasUrl;
      response = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow'
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('GAS Proxy Error:', error);
    return res.status(502).json({
      success: false,
      error: 'Gagal menghubungi backend Google Apps Script: ' + error.message
    });
  }
}
