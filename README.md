# Liquid Notes

A full-stack, AI-enabled note-taking app with a premium **Liquid Glass** (glassmorphism) interface over your custom gradient background.

## Features

- **Liquid Glass UI** — Thick frosted glass panels with blur, glossy borders, and fluid transitions
- **Markdown editor** — Distraction-free writing with live preview and auto-save
- **Organization** — Folders, tags, and pin notes to the top
- **AI Auto-Categorize** — Suggests and applies tags and folders
- **AI Summarise & Insights** — 3-bullet summary plus extracted action items
- **AI Smart Search** — Semantic search by concept, not just keywords

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS 4
- **State:** Zustand with localStorage persistence
- **AI:** OpenAI or Anthropic via API routes
- **Cloud Sync (optional):** Supabase Auth + Postgres

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure AI (optional but required for AI features)

Copy the example env file and add your API key:

```bash
cp .env.example .env.local
```

For OpenAI:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o-mini
```

For Anthropic:

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key
ANTHROPIC_MODEL=claude-3-5-haiku-latest
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Cloud Sync (Supabase)

Cloud sync is **optional**. If configured, you can sign in with an email link and your notes will sync across devices.

### 1) Create Supabase project

- Create a project at [Supabase](https://supabase.com/)
- Copy **Project URL** and **anon key** from **Project Settings → API**

Add to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2) Create database tables + RLS

Run this SQL in Supabase SQL Editor:

```sql
-- Folders
create table if not exists public.folders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Notes
create table if not exists public.notes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  tags text[] not null default '{}',
  folder_id text,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updated_at triggers
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_folders on public.folders;
create trigger set_updated_at_folders
before update on public.folders
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_notes on public.notes;
create trigger set_updated_at_notes
before update on public.notes
for each row execute function public.set_updated_at();

-- RLS
alter table public.folders enable row level security;
alter table public.notes enable row level security;

create policy "folders_select_own" on public.folders
for select using (auth.uid() = user_id);
create policy "folders_upsert_own" on public.folders
for insert with check (auth.uid() = user_id);
create policy "folders_update_own" on public.folders
for update using (auth.uid() = user_id);
create policy "folders_delete_own" on public.folders
for delete using (auth.uid() = user_id);

create policy "notes_select_own" on public.notes
for select using (auth.uid() = user_id);
create policy "notes_upsert_own" on public.notes
for insert with check (auth.uid() = user_id);
create policy "notes_update_own" on public.notes
for update using (auth.uid() = user_id);
create policy "notes_delete_own" on public.notes
for delete using (auth.uid() = user_id);
```

### 3) Use it in the app

Restart `npm run dev`. In the left sidebar you’ll see **Cloud Sync**.

- Enter your email → **Sign in (email link)**
- After you click the email link, your notes will pull from the cloud and auto-sync.

## Project Structure

```
src/
├── app/
│   ├── api/ai/          # categorize, insights, search routes
│   ├── globals.css      # Glass design tokens & utilities
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ai/AIPanel.tsx
│   ├── editor/NoteEditor.tsx
│   ├── layout/AppShell.tsx
│   ├── sidebar/Sidebar.tsx
│   └── ui/GlassPanel.tsx
├── lib/
│   ├── ai.ts            # OpenAI / Anthropic client
│   └── types.ts
└── store/
    └── notesStore.ts    # Zustand + persist
public/
└── backgrounds/
    └── app-background.png
```

## Custom Background

Replace `public/backgrounds/app-background.png` with your own image. The background is fixed, full-screen, and uses `background-size: cover`.
