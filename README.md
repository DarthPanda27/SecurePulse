# 🛡️ SecurePulse

> An AI-powered cybersecurity intelligence platform that generates personalized, high-signal daily threat briefs using Google Gemini 3 Flash.

SecurePulse cuts through the noise of endless security feeds. It automatically ingests vulnerability data (like the CISA KEV catalog), scores relevance based on your tech stack, and leverages AI to synthesize complex threat data into readable, actionable daily intelligence cards.

![SecurePulse App Preview](https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1000&h=400) *(Placeholder for actual app screenshot)*

## ✨ Features

* **Automated Threat Ingestion**: Pulls in raw intelligence from trusted sources (e.g., CISA Known Exploited Vulnerabilities).
* **AI-Powered Summarization**: Uses **Gemini 3 Flash** to synthesize multiple data points into a single, coherent narrative.
* **Pulse-Style UX**: Clean, scannable daily brief cards featuring severity indicators, confidence scores, and "Why it matters" context.
* **Strict AI Guardrails**: Enforces structured JSON outputs using **Zod** validation to prevent hallucinations and ensure factual grounding. Includes deterministic fallbacks if AI validation fails.
* **Source Citations**: Every AI-generated brief includes direct citations and links to the raw intelligence sources.

## 🛠️ Tech Stack

* **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons
* **Backend**: Express.js (Full-stack SPA architecture)
* **Database**: `better-sqlite3` (Zero-config, local file-based SQL)
* **AI Integration**: `@google/genai` (Gemini 3 Flash)
* **Validation & Testing**: Zod, Vitest

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+ recommended)
* A Google Gemini API Key

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   Create a `.env` file in the root directory (you can copy `.env.example`) and add your Gemini API key:
   ```env
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```

3. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`. The local SQLite database (`data/securepulse.db`) will be initialized automatically on the first run.

## 🧪 Testing

SecurePulse includes a robust test suite for the AI integration, ensuring that Zod validation, prompt generation, and deterministic fallbacks work as expected.

```bash
npm run test
```

## 🏗️ Architecture Notes

This project uses a lightweight **Full-Stack SPA** pattern for the MVP. 
The `server.ts` file acts as an Express backend mounting API routes (like data ingestion and brief generation), while simultaneously using Vite as middleware to serve the React frontend during development. This eliminates the need for a separate backend repository while keeping the architecture simple and deployable.
