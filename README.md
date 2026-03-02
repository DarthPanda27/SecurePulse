<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SecurePulse

## Run locally

**Prerequisites:** Node.js + PostgreSQL

1. Install dependencies:
   `npm install`
2. Copy envs:
   `cp .env.example .env.local`
3. Set `GEMINI_API_KEY` and `DATABASE_URL` in `.env.local`.
4. Generate Prisma client:
   `npm run db:generate`
5. Apply migration:
   `npm run db:migrate`
6. Seed representative records:
   `npm run db:seed`
7. Start app:
   `npm run dev`

## Prisma checks

- Validate schema: `npx prisma validate`
- Check migration status: `npx prisma migrate status`
