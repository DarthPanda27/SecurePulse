import express from 'express';
import {createServer as createViteServer} from 'vite';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({status: 'ok', app: 'SecurePulse MVP'});
  });

  app.get('/api/daily-briefs/latest', (_req, res) => {
    res.json({
      title: 'Active exploitation spike in edge VPN appliances',
      summary:
        'Attackers are chaining newly disclosed edge device vulnerabilities to gain initial access before ransomware deployment.',
      severity: 'critical',
      confidence: 'HIGH CONFIDENCE',
      bullets: [
        'CISA and vendor telemetry confirm exploitation attempts within 48 hours of disclosure.',
        'Most impacted environments expose management interfaces to the public internet.',
        'Post-compromise activity includes credential dumping and privileged persistence tasks.',
      ],
      action: 'Patch internet-facing edge appliances immediately and rotate privileged credentials.',
      generatedAt: new Date().toISOString(),
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
