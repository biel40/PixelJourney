// TODO: restore real SUPABASE_URL after demo
// const STORAGE_BASE = `${import.meta.env.SUPABASE_URL}/storage/v1/object/public/photos`;
const STORAGE_BASE = `${import.meta.env.SUPABASE_URL ?? ''}/storage/v1/object/public/photos`;

export function thumbUrl(storagePath: string): string {
  return `${STORAGE_BASE}/${storagePath}/thumb.webp`;
}

export function largeUrl(storagePath: string): string {
  return `${STORAGE_BASE}/${storagePath}/large.webp`;
}

export function originalUrl(storagePath: string): string {
  return `${STORAGE_BASE}/${storagePath}/original.jpg`;
}
