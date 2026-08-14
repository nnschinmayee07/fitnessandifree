# FitnessAndi Setup Guide

Complete setup guide for the FitnessAndi fitness tracking application.

## Prerequisites

- Node.js 20+ and npm
- Python 3.13+
- Supabase account

## Quick Start

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Set up Python ML service
cd ml
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and add your credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `NEXT_PUBLIC_ML_SERVICE_URL` - ML service URL (default: http://localhost:8001)
- `GROQ_API_KEY` - Groq API key (optional)
- `USDA_API_KEY` - USDA API key (optional)

### 3. Start Services

**Option A - Automated:**
```bash
./start-services.sh
```

**Option B - Manual:**

Terminal 1 - ML Service:
```bash
cd ml && source venv/bin/activate && uvicorn workout_server:app --port 8001 --reload
```

Terminal 2 - Next.js:
```bash
npm run dev
```

## Available Services

- **Application**: http://localhost:3000
- **ML Workout API**: http://localhost:8001/docs
- **Health Check**: http://localhost:8001/health

## Database Setup

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for running migrations.

## NPM Scripts

```bash
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests
npm run ml:workout   # Start workout ML service
npm run ml:food      # Start food ML service
```

## Troubleshooting

### ML Service Connection Refused

```bash
cd ml && source venv/bin/activate && uvicorn workout_server:app --port 8001 --reload
```

### Database Errors

1. Ensure user is authenticated
2. Run database migrations (see DATABASE_SETUP.md)
3. Check RLS policies in Supabase

### Port Already in Use

```bash
lsof -ti:8001 | xargs kill -9
```

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   └── (pages)/           # Frontend pages
├── components/            # React components
├── lib/                   # Business logic
├── ml/                    # Python ML services
│   ├── workout_server.py # Workout recommendations
│   └── server.py         # Food recognition
└── supabase/             # Database migrations
```
