# PixelJourney

Portfolio de fotografía móvil. Fotos tomadas con dispositivos del día a día, organizadas en álbumes. Incluye un panel de administración privado para subir y gestionar el contenido.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Astro 7 (SSR, `output: 'server'`) |
| Despliegue | Vercel (adapter + image optimization) |
| Base de datos | Supabase DB |
| Almacenamiento | Supabase Storage (bucket `photos`) |
| Autenticación | Supabase Auth (solo admin) |
| Estilos | Tailwind CSS v4 |
| Interactividad | Preact (solo Lightbox) |
| Lenguaje | TypeScript estricto |

## Estructura

```
src/
├── components/
│   ├── layout/     Header, Footer, Navigation
│   ├── photo/      PhotoCard, PhotoGrid, AlbumCard, Lightbox
│   └── ui/         Componentes primitivos sin lógica de dominio
├── layouts/        BaseLayout, GalleryLayout
├── lib/            supabase.ts, photos.ts, storage.ts, gallery.ts
├── middleware/      Guardia de autenticación para /admin/*
├── pages/          index, gallery/, photo/, admin/
├── styles/         global.css
└── types/          photo.ts
```

## Páginas

| Ruta | Tipo | Descripción |
|---|---|---|
| `/` | Estática | Landing page |
| `/gallery` | SSR | Listado de álbumes |
| `/gallery/[album]` | SSR | Fotos de un álbum |
| `/photo/[id]` | SSR | Detalle de foto |
| `/admin` | SSR + auth | Panel de administración |
| `/admin/upload` | SSR + auth | Subir fotos |
| `/admin/photos/[id]/edit` | SSR + auth | Editar metadatos |

## Comandos

```sh
npm install       # Instala dependencias
npm run dev       # Servidor local en localhost:4321
npm run build     # Build de producción en ./dist/
npm run preview   # Preview del build
```

## Variables de entorno

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   # Solo servidor — nunca exponer al cliente
PUBLIC_SITE_URL
```
