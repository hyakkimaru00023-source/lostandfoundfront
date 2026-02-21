import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getImageUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;

  // Handle paths that might already have 'uploads/' or not
  const cleanPath = path.replace(/^\/+/, '');
  // Return relative path from root, browser will resolve against current origin
  return `/uploads/${cleanPath.replace(/^uploads\//, '')}`;
}
