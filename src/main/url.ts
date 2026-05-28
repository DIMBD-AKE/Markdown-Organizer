export function isAllowedExternalUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false
  return /^https?:\/\//i.test(url)
}
