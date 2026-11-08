/**
 * @description Derives display initials from a username, e.g. "jane.doe" / "Jane Doe"
 * -> "JD"; a single word -> its first letter.
 * @param username - Raw username or display name, or null if signed out.
 */
export function getInitials(username: string | null): string {
  if (!username) return '?';
  const parts = username.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
