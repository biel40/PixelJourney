import type { GalleryPhoto } from '../types/photo';

export const ALL_ALBUMS = 'all';

export interface AlbumSummary {
  slug: string;
  label: string;
  count: number;
}

export function albumLabel(slug: string): string {
  if (slug === ALL_ALBUMS) return 'Todo';
  if (slug === 'general') return 'General';

  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function countByAlbum(photos: GalleryPhoto[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const photo of photos) {
    counts.set(photo.album, (counts.get(photo.album) ?? 0) + 1);
  }
  return counts;
}

export function summarizeAlbums(photos: GalleryPhoto[]): AlbumSummary[] {
  const albums = [...countByAlbum(photos).entries()]
    .map(([slug, count]) => ({ slug, label: albumLabel(slug), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'));

  return [
    { slug: ALL_ALBUMS, label: albumLabel(ALL_ALBUMS), count: photos.length },
    ...albums,
  ];
}

export function resolveActiveAlbum(
  requested: string | null,
  albums: AlbumSummary[],
): string {
  const exists = albums.some((album) => album.slug === requested);
  return requested && exists ? requested : ALL_ALBUMS;
}

export function isInAlbum(photo: GalleryPhoto, activeAlbum: string): boolean {
  return activeAlbum === ALL_ALBUMS || photo.album === activeAlbum;
}
