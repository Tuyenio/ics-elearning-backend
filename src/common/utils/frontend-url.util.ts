export function resolveFrontendUrl(rawUrl?: string | null): string {
  const fallbackUrl = 'http://localhost:3000';

  if (!rawUrl) {
    return fallbackUrl;
  }

  const normalized = rawUrl.trim();
  if (!normalized) {
    return fallbackUrl;
  }

  // Support accidental "urlA || urlB" or "urlA, urlB" style configs.
  const firstCandidate = normalized
    .split(/\|\||,|;/)
    .map((part) => part.trim())
    .find(Boolean);

  if (!firstCandidate) {
    return fallbackUrl;
  }

  try {
    return new URL(firstCandidate).toString().replace(/\/$/, '');
  } catch {
    return fallbackUrl;
  }
}
