type Connectable = {
  connect(signal: string, callback: (...args: unknown[]) => void): number;
  disconnect(id: number): void;
};

export class SignalStore {
  private readonly entries: Array<{ object: Connectable; id: number }> = [];

  connect(
    object: Connectable,
    signal: string,
    callback: (...args: unknown[]) => void,
  ): void {
    this.entries.push({ object, id: object.connect(signal, callback) });
  }

  disconnectAll(): void {
    while (this.entries.length > 0) {
      const entry = this.entries.pop();
      if (entry) entry.object.disconnect(entry.id);
    }
  }
}
