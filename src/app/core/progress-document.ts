export interface ProgressStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; }
/** Refuse to replace unreadable data or a newer value written by another tab. */
export class ProgressDocument {
  private expected: string | null | undefined;
  constructor(private readonly storage: () => ProgressStorage, private readonly key: string) {}
  load<T>(parse: (raw: string | null) => T): T {
    this.expected = undefined;
    const raw = this.storage().getItem(this.key);
    const value = parse(raw);
    this.expected = raw;
    return value;
  }
  save(value: unknown): void {
    const storage = this.storage();
    const current = storage.getItem(this.key);
    if (this.expected === undefined ? current !== null : current !== this.expected) throw new Error('Saved progress changed or could not be read');
    const next = JSON.stringify(value);
    storage.setItem(this.key, next);
    this.expected = next;
  }
}
