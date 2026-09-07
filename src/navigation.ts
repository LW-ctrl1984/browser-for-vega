const HOME_URL = 'https://www.google.com/';

export function normalizeAddress(value: string): string {
  const input = value.trim();
  if (!input) {
    return HOME_URL;
  }
  if (/^https?:\/\//i.test(input)) {
    return input;
  }
  if (
    !/\s/.test(input) &&
    (/^[\w-]+(?:\.[\w-]+)+/.test(input) || input.startsWith('localhost'))
  ) {
    return `https://${input}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
}
