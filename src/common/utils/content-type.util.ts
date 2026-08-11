import { ContentType } from '@prisma/client';

export function normalizeContentType(rawType?: string): ContentType {
  if (!rawType) return 'MOVIE' as ContentType;
  const upper = String(rawType).toUpperCase().trim();
  if (upper === 'HISTORICAL' || upper === 'HISTORY') return 'HISTORY' as ContentType;
  if (upper === 'MOVIE' || upper === 'FILM' || upper === 'SCREENPLAY') return 'MOVIE' as ContentType;
  if (upper === 'BOOK' || upper === 'NOVEL' || upper === 'LITERATURE') return 'BOOK' as ContentType;
  if (upper === 'STORY' || upper === 'SHORT_STORY' || upper === 'FABLE') return 'STORY' as ContentType;
  if (upper === 'FOLKLORE' || upper === 'MYTH' || upper === 'LEGEND') return 'FOLKLORE' as ContentType;
  if (upper === 'USER_CONTEXT' || upper === 'PROMPT') return 'USER_CONTEXT' as ContentType;
  return 'MOVIE' as ContentType;
}
