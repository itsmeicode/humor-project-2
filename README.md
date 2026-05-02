# Humor Admin

Humor Admin is an admin dashboard for managing the Humor Caption platform's staging database. Built with Next.js, Supabase, and Tailwind CSS.

## App routes

- `/` — Redirects to `/login`
- `/login` — Sign-in page (Google OAuth)
- `/auth/callback` — OAuth callback route
- `/auth/signout` — Sign-out endpoint
- `/access-denied` — Shown when user lacks superadmin access
- `/admin` — Protected overview dashboard (counts + recent captions)
- `/admin/caption-stats` — Protected caption-rating statistics dashboard
- `/admin/users` — Protected read-only profiles table
- `/admin/images` — Protected image management (CRUD + file upload)
- `/admin/captions` — Protected read-only captions
- `/admin/caption-requests` — Protected read-only caption requests
- `/admin/caption-examples` — Protected caption examples (CRUD)
- `/admin/humor-flavors` — Protected read-only humor flavors
- `/admin/humor-flavor-steps` — Protected read-only humor flavor steps
- `/admin/humor-mix` — Protected humor mix (read + update)
- `/admin/terms` — Protected terms (CRUD)
- `/admin/llm-models` — Protected LLM models (CRUD)
- `/admin/llm-providers` — Protected LLM providers (CRUD)
- `/admin/llm-prompt-chains` — Protected read-only LLM prompt chains
- `/admin/llm-responses` — Protected read-only LLM responses
- `/admin/allowed-signup-domains` — Protected allowed signup domains (CRUD)
- `/admin/whitelisted-emails` — Protected whitelisted emails (CRUD)

## Walkthrough

1. Go to `/` and sign in with Google.
2. If your profile has `is_superadmin == true`, you'll land on the `/admin` dashboard with aggregate stats: profile/image/caption counts, public vs private caption ratio chart, vote engagement metrics, and recent captions.
3. Click **Caption Stats** in the Overview group for a deeper look at what users are rating: KPI strip, top 10 captions by `like_count`, top 10 by raw vote engagement, zero-vote samples, and a per-flavor breakdown.
4. Use the sidebar to navigate between sections (Users & Content, Humor, LLM, Access).
4. On CRUD pages (e.g. Terms, Images), create new rows with the form at the top, edit inline, or delete with confirmation.
5. On the Images page, create rows by pasting a URL or uploading a file to Supabase Storage.
6. Read-only pages (e.g. Captions, Humor Flavors) display paginated data.
7. Toggle light/dark mode with the theme switcher.
8. Sign out from the sidebar.

## Core functionality

### Authentication + protection

Uses Supabase Auth (Google OAuth). All `/admin` routes redirect to `/login` if there is no active session. After sign-in, the admin layout checks `profiles.is_superadmin == true` and redirects to `/access-denied` if the check fails.

### Statistics dashboard (no DB changes)

The overview page aggregates data from multiple tables:

- Profile count, superadmin count, image count, caption count
- Public vs private caption ratio (pie chart)
- Total votes (all time) and votes (last 7 days)
- Average captions per image
- 10 most recent captions

### Caption Stats dashboard (no DB changes)

A dedicated `/admin/caption-stats` page focused on what users are rating:

- KPI strip: total captions, captions with at least one vote, captions with zero votes, total votes cast
- Top 10 captions by `like_count` (the cached score on the `captions` row)
- Top 10 most-voted captions by raw `caption_votes` engagement (separate metric — includes upvotes and downvotes)
- First 10 zero-vote captions (the "needs more eyes" pile)
- Per-flavor breakdown grouped by `humor_flavors.slug`, paginated 25 per page

Aggregations are computed client-side after fetching all rows from `captions`, `caption_votes`, and `humor_flavors` via parallel paginated `range()` queries (concurrency 50, chunks of 1000), since the shared staging database rules out custom RPC functions. A `loading.tsx` skeleton shows immediately while the fetches resolve.

### Data management (Supabase mutations)

CRUD operations use the Supabase client directly:

- **Create:** Inserts new rows with validated form data
- **Update:** Partial updates — only sends columns that changed
- **Delete:** Confirms with the user before deleting
- FK select dropdowns resolve foreign keys (e.g. term types, LLM providers)
- Audit fields (`created_by_user_id`, `modified_by_user_id`, timestamps) are read-only

### Image upload

The upload pipeline:

1. User selects a file
2. File is uploaded to Supabase Storage (`images` bucket) at `{userId}/{timestamp}-{fileName}`
3. Public URL is retrieved from Storage
4. A new row is inserted into the `images` table with the public URL and audit fields

## Getting Started

### Requirements

- Node.js + npm
- Supabase project credentials (public anon key + URL)

### Environment variables

Create `.env` with:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=images
```

### Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
```
