export const normalizeForMatch = (value: string | null | undefined): string => {
  if (!value) return '';

  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const buildTrackKey = (data: {
  isrc?: string | null;
  titre: string;
  artiste: string;
}): string => {
  const isrc = normalizeForMatch(data.isrc);
  if (isrc) return `isrc:${isrc}`;

  return `track:${normalizeForMatch(data.titre)}|${normalizeForMatch(data.artiste)}`;
};
