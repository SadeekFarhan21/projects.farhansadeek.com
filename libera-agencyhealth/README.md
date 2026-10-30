# Libera

**Find the freedom to shape your life.**

Libera is a guided mental wellness app that delivers five-minute emotional intervention sessions combining breathwork, mindfulness, EFT visualization, and micro-journaling. Built for [Hack Dartmouth X](https://hackdartmouth.io).

> *"Between stimulus and response there is a space. In that space is our power to choose our response."* — Viktor Frankl

## Features

### Sanctuary Path — Structured 30-Level Progression

Three practice packages spanning 10 weeks:

- **The Morning You Love** (Anchor) — Foundation-building morning sessions for intentional living
- **The Earned Moment** (Achievement) — Post-accomplishment sessions for a healthy relationship with success
- **The Lighter You** (Release) — Evening sessions to let go of accumulated tension

Each session follows a 5-step flow (~5 min total):
1. Mood check-in (emoji slider)
2. Breathwork (cyclic sighing, box breathing, etc.)
3. Breath watching (mindfulness observation)
4. EFT visualization (guided imagery with personalized narratives)
5. Micro-journal (three reflective prompts)

### Open Mode — Free-Access Library

5 breathwork patterns, 4 guided meditations, 4 EFT scenarios, and a Habit Breaker widget — accessible anytime without progression requirements.

### Insights Dashboard

Mood analytics, vividness scoring (visualization clarity over time), session timeline with expandable entries, day streaks, and per-package filtering.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions)
- **UI:** Tailwind CSS 4, Framer Motion, Lucide icons, glassmorphic design
- **Database & Auth:** Supabase (PostgreSQL + Row Level Security)
- **Audio:** Web Audio API (synthesized rain, white noise, cello drone, singing bowl)
- **Narration:** Browser Text-to-Speech for guided session delivery

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase URL and anon key to .env.local

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## License

Private — Hack Dartmouth X submission.
