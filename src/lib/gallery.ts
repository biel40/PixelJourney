import type { GalleryPhoto } from '../types/photo';

// ─────────────────────────────────────────────────────────────────────────────
// Fuente de datos de la galería — FASE LOCAL (temporal, sin Supabase)
//
// Lee las imágenes de `assets/photos/**` (raíz del proyecto) y las expone como `GalleryPhoto[]`.
// Astro las optimiza en build (resize + webp) gracias a astro:assets.
//
// Convención de álbumes: el nombre de la SUBCARPETA es el slug del álbum.
//   assets/photos/PXL_xxx.jpg            -> album "general"
//   assets/photos/street/PXL_xxx.jpg     -> album "street"
//
// MIGRACIÓN A SUPABASE: cuando la DB esté lista, este es el ÚNICO sitio a tocar.
// Basta con devolver aquí los datos de Supabase mapeados a `GalleryPhoto`
// (ver src/lib/photos.ts -> getPublicPhotos), sin cambiar la página /gallery.
// ─────────────────────────────────────────────────────────────────────────────

// import.meta.glob resuelve en build todos los imports de astro:assets.
const modules = import.meta.glob<{ default: ImageMetadata }>(
  '../../assets/photos/**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}',
  { eager: true },
);

// Extrae la fecha del nombre de archivo de Pixel: PXL_YYYYMMDD_HHMMSS...
function parseTakenAt(fileName: string): Date | null {
  const match = fileName.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  const date = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

// Deriva el slug del álbum a partir de la ruta relativa dentro de photos/.
function parseAlbum(relativePath: string): string {
  const segments = relativePath.split('/');
  // segments termina en [..., 'photos', <album?>, fichero]
  const photosIdx = segments.lastIndexOf('photos');
  const rest = segments.slice(photosIdx + 1);
  return rest.length > 1 ? rest[0] : 'general';
}

function fileNameFromPath(path: string): string {
  return path.split('/').pop() ?? path;
}

function buildAlt(album: string, takenAt: Date | null): string {
  const albumLabel = album === 'general' ? 'PixelJourney' : album;
  if (!takenAt) return `Fotografía del álbum ${albumLabel}`;
  const fecha = takenAt.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `Fotografía del álbum ${albumLabel} — ${fecha}`;
}

function getLocalGalleryPhotos(): GalleryPhoto[] {
  const photos: GalleryPhoto[] = Object.entries(modules).map(([path, mod]) => {
    const fileName = fileNameFromPath(path);
    const album = parseAlbum(path);
    const takenAt = parseTakenAt(fileName);
    return {
      id: fileName.replace(/\.[^.]+$/, ''),
      src: mod.default,
      alt: buildAlt(album, takenAt),
      album,
      takenAt,
    };
  });

  // Más recientes primero; las sin fecha al final.
  return photos.sort((a, b) => {
    const ta = a.takenAt?.getTime() ?? 0;
    const tb = b.takenAt?.getTime() ?? 0;
    return tb - ta;
  });
}

export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  // FASE LOCAL: datos del disco. Sustituir/ramificar aquí en la migración.
  return getLocalGalleryPhotos();
}
