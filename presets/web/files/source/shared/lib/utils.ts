import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Two Tailwind classes for one property fight, and the last one written does
// not always win. This resolves that, so a caller can override a component.
export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}
