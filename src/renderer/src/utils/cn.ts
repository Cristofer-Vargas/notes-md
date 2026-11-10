import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utilitário padrão para combinar classes Tailwind de forma segura com deduplicação
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
