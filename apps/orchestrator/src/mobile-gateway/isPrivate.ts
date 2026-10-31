export function isPrivate(address: string): boolean {
  if (
    address.startsWith('10.') ||
    address.startsWith('192.168.') ||
    address.startsWith('169.254.')
  ) {
    return true;
  }
  const match = /^172\.(\d{1,3})\./u.exec(address);
  const second = match?.[1] ? Number(match[1]) : -1;
  return second >= 16 && second <= 31;
}
