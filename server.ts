import crypto from 'crypto';
import express, {NextFunction, Request, Response} from 'express';
import {createServer as createViteServer} from 'vite';
import dotenv from 'dotenv';
import db from './src/lib/db.ts';
import {generateBriefCard} from './src/lib/ai.ts';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    'Missing required environment variable: GEMINI_API_KEY\n' +
    'Please set GEMINI_API_KEY in your .env file or in the process environment before starting the server.\n' +
    'Example: GEMINI_API_KEY=your-api-key-here'
  );
}

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
type IntelItemRow = {
  id: string;
  source: string;
  external_id: string;
  title: string;
  content: string;
  url: string | null;
  published_at: string;
  created_at: string;
};

function formatBriefResponse(brief: DailyBriefRow, cards: BriefCardRow[]) {
  return {
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
  };
}

async function generateTodaysBrief(): Promise<DailyBriefRow> {
  const today = new Date().toISOString().split('T')[0];

  const intelItems = db
    .prepare('SELECT * FROM intel_items ORDER BY published_at DESC')
    .all() as IntelItemRow[];

  // One card per intel item; if there are no items, generate a single fallback card
  const itemGroups: IntelItemRow[][] =
    intelItems.length > 0 ? intelItems.map(item => [item]) : [[]];

  const generatedCards = await Promise.all(
    itemGroups.map(group => generateBriefCard(group)),
  );

  const briefId = crypto.randomUUID();
  db.prepare('INSERT INTO daily_briefs (id, date) VALUES (?, ?)').run(briefId, today);

  const insertCard = db.prepare(
    'INSERT INTO brief_cards (id, brief_id, type, title, summary, why_it_matters, suggested_action, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  );
  for (let i = 0; i < generatedCards.length; i++) {
    const card = generatedCards[i];
    const type = intelItems[i]?.source ?? 'intelligence';
    insertCard.run(
      crypto.randomUUID(),
      briefId,
      type,
      card.title,
      JSON.stringify(card.summaryBullets),
      card.whyItMatters,
      card.suggestedAction ?? null,
      card.confidence,
    );
  }

  return db
    .prepare('SELECT * FROM daily_briefs WHERE id = ?')
    .get(briefId) as DailyBriefRow;
}

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

      res.json(formatBriefResponse(brief, cards));
    } catch (err) {
      next(err);
    }
  });

  app.post(
    '/api/daily-briefs/generate',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const today = new Date().toISOString().split('T')[0];

        // Return existing brief if one already exists for today (idempotent)
        const existing = db
          .prepare('SELECT * FROM daily_briefs WHERE date = ?')
          .get(today) as DailyBriefRow | undefined;

        if (existing) {
          const cards = db
            .prepare('SELECT * FROM brief_cards WHERE brief_id = ?')
            .all(existing.id) as BriefCardRow[];
          res.json(formatBriefResponse(existing, cards));
          return;
        }

        const brief = await generateTodaysBrief();
        const cards = db
          .prepare('SELECT * FROM brief_cards WHERE brief_id = ?')
          .all(brief.id) as BriefCardRow[];

        res.status(201).json(formatBriefResponse(brief, cards));
      } catch (err) {
        next(err);
      }
    },
  );

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the built static files
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Auto-generate today's brief if one doesn't exist yet
  const today = new Date().toISOString().split('T')[0];
  const todaysBrief = db.prepare('SELECT id FROM daily_briefs WHERE date = ?').get(today);
  if (!todaysBrief) {
    console.log(`No brief found for ${today}, auto-generating on startup...`);
    generateTodaysBrief().catch(err =>
      console.error('Failed to auto-generate daily brief on startup:', err),
    );
  }
}

startServer();
