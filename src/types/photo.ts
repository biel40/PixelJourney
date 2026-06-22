import type { ImageMetadata } from 'astro';

export interface Photo {
  id: string;
  storagePath: string;       // e.g. "uploads/abc-123" — base path, sin trailing slash
  title: string | null;
  description: string | null;
  location: string | null;
  device: string | null;     // e.g. "iPhone 15 Pro", "Pixel 8 Pro"
  takenAt: Date | null;
  album: string;             // slug del álbum, e.g. "landscapes"
  tags: string[];
  isPublic: boolean;
  width: number | null;
  height: number | null;
  createdAt: Date;
}

// Tipo de vista que consume la galería. Desacopla el render del origen de
// datos: hoy se alimenta de imágenes locales (astro:assets), mañana podrá
// mapearse desde un `Photo` de Supabase sin tocar los componentes.
export interface GalleryPhoto {
  id: string;
  src: ImageMetadata;        // resultado del import de astro:assets (local)
  alt: string;
  album: string;             // slug del álbum (nombre de la subcarpeta)
  takenAt: Date | null;
}

// Fila raw de Supabase — snake_case de la DB
export interface PhotoRow {
  id: string;
  storage_path: string;
  title: string | null;
  description: string | null;
  location: string | null;
  device: string | null;
  taken_at: string | null;
  album: string;
  tags: string[];
  is_public: boolean;
  width: number | null;
  height: number | null;
  created_at: string;
  updated_at: string;
}
