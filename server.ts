import express, {NextFunction, Request, Response} from 'express';
import {createServer as createViteServer} from 'vite';
import dotenv from 'dotenv';
import db from './src/lib/db.ts';

dotenv.config();

type DailyBriefRow = {id: string; date: string; created_at: string};
type BriefCardRow = {
  id: string;
  brief_id: string;
  type: string;
  title: string;
  summary: string;
  why_it_matters: string;
  suggested_action: string | null;
  confidence: string;
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({status: 'ok', app: 'SecurePulse MVP'});
  });

  app.get('/api/daily-briefs/latest', (req: Request, res: Response, next: NextFunction) => {
    try {
      const brief = db
        .prepare('SELECT * FROM daily_briefs ORDER BY date DESC LIMIT 1')
        .get() as DailyBriefRow | undefined;

      if (!brief) {
        res.status(404).json({error: 'No daily brief found'});
        return;
      }

      const cards = db
        .prepare('SELECT * FROM brief_cards WHERE brief_id = ?')
        .all(brief.id) as BriefCardRow[];

      res.json({
        id: brief.id,
        date: brief.date,
        createdAt: brief.created_at,
        cards: cards.map(card => ({
          id: card.id,
          type: card.type,
          title: card.title,
          summary: JSON.parse(card.summary),
          whyItMatters: card.why_it_matters,
          suggestedAction: card.suggested_action,
          confidence: card.confidence,
        })),
      });
    } catch (err) {
      next(err);
    }
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

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({error: 'Internal server error'});
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
