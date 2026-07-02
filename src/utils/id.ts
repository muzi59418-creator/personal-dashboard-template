export function createId(prefix: string): string {
  const randomPart = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now().toString(36)}_${randomPart}`;
}
