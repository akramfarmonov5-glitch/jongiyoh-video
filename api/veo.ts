export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const veoBackend = process.env.VEO_BACKEND_URL || 'http://localhost:3001';
  const { action, jobId } = req.query || {};

  try {
    // 1. Health check: GET /api/veo?action=health
    if (req.method === 'GET' && action === 'health') {
      try {
        const response = await fetch(`${veoBackend}/api/health`);
        if (response.ok) {
          const data = await response.json();
          return res.status(200).json(data);
        }
      } catch (err) {
        return res.status(503).json({
          status: 'unavailable',
          error: "Veo serveri (localhost:3001) ishga tushmagan. Iltimos 'veo-video-generator' papkasida 'npm run dev' ni ishga tushiring."
        });
      }
    }

    // 2. Job status check: GET /api/veo?action=status&jobId=...
    if (req.method === 'GET' && action === 'status' && jobId) {
      try {
        const response = await fetch(`${veoBackend}/api/jobs/${encodeURIComponent(jobId)}`);
        const data = await response.json();
        return res.status(response.status).json(data);
      } catch (err: any) {
        return res.status(502).json({ error: "Job holatini tekshirib bo'lmadi: " + err.message });
      }
    }

    // 3. Start Generation: POST /api/veo
    if (req.method === 'POST') {
      const { action: postAction, payload } = req.body || {};
      const targetEndpoint = postAction === 'generate' ? `${veoBackend}/api/generate-video` : `${veoBackend}/api/generate-video`;

      try {
        const response = await fetch(targetEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload || req.body)
        });

        const data = await response.json();
        return res.status(response.status).json(data);
      } catch (err: any) {
        return res.status(503).json({
          error: "Veo generatsiya serveriga (localhost:3001) so'rov yetib bormadi. Server ishlayotganini tekshiring."
        });
      }
    }

    return res.status(400).json({ error: 'Noma‘lum Veo so‘rovi' });
  } catch (error: any) {
    console.error('Veo Proxy Error:', error);
    return res.status(500).json({
      error: error?.message || 'Veo proksi xatoligi'
    });
  }
}
