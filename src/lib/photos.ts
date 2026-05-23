import { supabase } from './supabase';
import type { Photo, PhotoRow } from '../types/photo';

function rowToPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    storagePath: row.storage_path,
    title: row.title,
    description: row.description,
    location: row.location,
    device: row.device,
    takenAt: row.taken_at ? new Date(row.taken_at) : null,
    album: row.album,
    tags: row.tags,
    isPublic: row.is_public,
    width: row.width,
    height: row.height,
    createdAt: new Date(row.created_at),
  };
}

export async function getPublicPhotos(): Promise<Photo[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('is_public', true)
    .order('taken_at', { ascending: false });

  if (error) throw error;
  return (data as PhotoRow[]).map(rowToPhoto);
}

export async function getPublicPhotosByAlbum(album: string): Promise<Photo[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('is_public', true)
    .eq('album', album)
    .order('taken_at', { ascending: false });

  if (error) throw error;
  return (data as PhotoRow[]).map(rowToPhoto);
}

export async function getPhotoById(id: string): Promise<Photo | null> {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('id', id)
    .eq('is_public', true)
    .single();

  if (error) return null;
  return rowToPhoto(data as PhotoRow);
}

export async function getPublicAlbumSlugs(): Promise<string[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('album')
    .eq('is_public', true);

  if (error) throw error;
  return [...new Set((data as { album: string }[]).map((r) => r.album))];
}
