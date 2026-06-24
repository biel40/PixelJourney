# PixelJourney — Copilot Instructions

Photography portfolio built with Astro 6, Supabase Storage and Supabase DB. Photos taken with mobile devices, organized in albums. Includes a private admin panel.

---

## Stack

| Concern | Tool |
|---|---|
| Framework | Astro 6 (`output: 'server'`) |
| Adapter | `@astrojs/vercel` |
| Storage | Supabase Storage — bucket `photos` (public) |
| Database | Supabase DB — table `photos` |
| Auth | Supabase Auth (admin only) |
| Styles | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Images | Vercel Image Optimization via `/_vercel/image` |
| Interactivity | Astro Islands — Preact for Lightbox only |
| Language | TypeScript (`astro/tsconfigs/strict`) |

> Do NOT add frameworks (React, Vue, Svelte). Use Astro components or plain Web APIs.

---

## Architecture

`output: 'server'` — all pages SSR by default. Static pages opt-in with `export const prerender = true`.

- `index.astro` — static (`prerender = true`)
- `gallery/index.astro` — SSR, groups public photos by album
- `gallery/[album].astro` — SSR, photos filtered by album
- `photo/[id].astro` — SSR, photo detail with `large.webp`
- `admin/*.astro` — SSR, auth-protected

**Data flow:** SSR page → `src/lib/photos.ts` → Supabase DB → derive URLs via `src/lib/storage.ts` → render.
Admin: middleware checks `supabase.auth.getUser()` on every `/admin/*` request → redirect to `/admin/login` if unauthenticated.

---

## Database Schema

```sql
CREATE TABLE photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text        NOT NULL,  -- "uploads/abc-123" (no trailing slash)
  title        text,
  description  text,
  location     text,
  device       text,
  taken_at     timestamptz,
  album        text        NOT NULL DEFAULT 'general',
  tags         text[]      NOT NULL DEFAULT '{}',
  is_public    boolean     NOT NULL DEFAULT false,
  width        int,
  height       int,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX photos_album_public_idx ON photos (album, is_public, taken_at DESC);
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public photos are viewable by everyone" ON photos FOR SELECT USING (is_public = true);
CREATE POLICY "Admin has full access" ON photos FOR ALL USING (auth.role() = 'authenticated');
```

---

## Supabase Storage

```
Bucket: photos (public)
└── uploads/{photo_id}/
    ├── thumb.webp    ← max 640px wide, q80 — always required
    ├── large.webp    ← max 1920px wide, q85 — always required
    └── original.jpg  ← optional
```

- `storage_path` = `"uploads/{photo_id}"` — no trailing slash, no filename.
- URLs derived via `thumbUrl()` / `largeUrl()` / `originalUrl()` from `src/lib/storage.ts`.
- File names are fixed. Never vary them. Upload order: thumb → large → original.

---

## Project Structure

```
src/
├── components/
│   ├── layout/   Header.astro, Footer.astro, Navigation.astro
│   ├── photo/    PhotoCard.astro, PhotoGrid.astro, AlbumCard.astro, Lightbox.tsx
│   └── ui/       Badge.astro, LoadingSpinner.astro
├── layouts/      BaseLayout.astro, GalleryLayout.astro
├── lib/          supabase.ts, photos.ts, storage.ts
├── middleware/   index.ts
├── pages/        index.astro, gallery/, photo/, admin/
├── styles/       global.css
└── types/        photo.ts
```

**Directory rules:**
- `src/lib/` — pure functions only, no Astro imports, testable in isolation
- `src/middleware/` — cross-cutting concerns only (auth guard), one file
- `src/components/photo/` — domain-aware components (know the `Photo` type)
- `src/components/ui/` — dumb primitives, no domain knowledge
- `src/layouts/` — full page shells, used from pages only, never nested
- `src/types/` — shared TypeScript interfaces, define here and import everywhere

---

## Key Conventions

### Types (`src/types/photo.ts`)
- `Photo` — camelCase domain type with `storagePath`, `takenAt`, `isPublic`, etc.
- `PhotoRow` — snake_case DB row type. Map with `rowToPhoto()` in `src/lib/photos.ts`.
- Do NOT redeclare types inline in pages or components.

### Supabase Client (`src/lib/supabase.ts`)
- `supabase` (anon key) — for all public SSR queries, respects RLS.
- `supabaseAdmin` (service role key) — admin routes only, bypasses RLS.
- Never instantiate the client outside this file. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

### Data Access (`src/lib/photos.ts`)
- ALL DB queries go here. Never write Supabase queries inline in `.astro` frontmatter.
- Available functions: `getPublicPhotos()`, `getPublicPhotosByAlbum(album)`, `getPhotoById(id)`, `getPublicAlbumSlugs()`.

### Images
- Local assets → `<Image>` from `astro:assets`.
- Storage photos → plain `<img>` with URL from `thumbUrl()` / `largeUrl()`.
- Always provide `alt`. Always set `width`/`height` or use `aspect-ratio` CSS to prevent CLS.
- Hero image: `loading="eager" fetchpriority="high"`. Everything else: `loading="lazy" decoding="async"`.

### Astro Components
- One component per file, PascalCase filename.
- Props typed via interface in the frontmatter.
- Use `class:list` for conditional classes. No inline `style` for layout.

### Styles (`src/styles/global.css` + scoped `<style>`)
- Layout/spacing/color → Tailwind utility classes in the markup. No custom CSS for what a utility already covers.
- Custom CSS goes in two places only:
  - **Shared primitives** (used on 2+ pages: animation utilities, brand gradients, reduced-motion base) → `src/styles/global.css`. These are design-system level and intentionally global.
  - **Page/component-specific styles** (decorative backgrounds, one-off keyframes) → scoped `<style>` in that `.astro` file.
- NEVER duplicate a CSS rule across pages. If a rule appears in 2+ files, promote it to `global.css`.
- Current shared primitives in `global.css`: `.reveal` (+ `@keyframes reveal`), `.title-gradient`, and the base `prefers-reduced-motion` reset for `.reveal`.
- Every page that animates MUST respect `@media (prefers-reduced-motion: reduce)` for its own scoped animations.

### Preact Islands
- Only for components that REQUIRE client-side interactivity (e.g., Lightbox).
- Use `client:visible` or `client:idle`. NEVER `client:load` unless critical.
- Pass only serializable props.

---

## Routing

| Route | Type | Notes |
|---|---|---|
| `/` | Static | `prerender = true` |
| `/gallery` | SSR | Albums listing |
| `/gallery/[album]` | SSR | Photo grid |
| `/photo/[id]` | SSR | Photo detail |
| `/admin` | SSR + auth | Dashboard |
| `/admin/login` | SSR | Login form |
| `/admin/upload` | SSR + auth | Upload |
| `/admin/photos/[id]/edit` | SSR + auth | Edit metadata |

---

## SEO

- `BaseLayout.astro` handles all `<meta>` tags. Props: `title`, `description`, `ogImage?`, `canonical?`.
- OG image via Vercel Image Optimization at 1200×630.
- `<link rel="canonical">` on every page.
- Sitemap via `@astrojs/sitemap`.

---

## Performance

- Zero JS on static pages unless an island is mounted.
- CSS-only animations for hover effects.
- Font loading: `font-display: swap`, preload primary variant only.
- No Preact component > 20 kB gzipped without splitting.
- No heavy libraries (lodash, GSAP, Three.js). Prefer native browser APIs.

---

## Environment Variables

| Variable | Scope | Description |
|---|---|---|
| `SUPABASE_URL` | server | Project URL |
| `SUPABASE_ANON_KEY` | server/client | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Bypasses RLS — NEVER expose to client |
| `PUBLIC_SITE_URL` | both | Canonical site URL |

---

## Code Style

- No `any`. Use `unknown` + type guards.
- No non-null assertions (`!`) without a prior check.
- `const` over `let`. Never `var`.
- `async/await` over `.then()`.
- Named exports in `src/lib/`. Default exports for `.astro` files and pages.
- Import order: framework → third-party → internal (types last).
- Single quotes in `.ts/.tsx`, double quotes in `.astro` attributes.
