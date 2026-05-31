type Connectable = {
  connect(signal: string, callback: (...args: unknown[]) => void): number;
  disconnect(id: number): void;
};

/**
 * Small lifecycle helper for GNOME/GObject signal subscriptions.
 *
 * @remarks
 * Extensions are reloaded in-process during development. Centralizing signal
 * ids makes disable cleanup less error-prone and prevents callbacks from stale
 * extension instances.
 */
export class SignalStore {
  private readonly entries: Array<{ object: Connectable; id: number }> = [];

  connect(
    object: Connectable,
    signal: string,
    callback: (...args: unknown[]) => void,
  ): void {
    this.entries.push({ object, id: object.connect(signal, callback) });
  }

  /**
   * Disconnects all stored subscriptions in reverse registration order.
   */
  disconnectAll(): void {
    while (this.entries.length > 0) {
      const entry = this.entries.pop();
      if (entry) entry.object.disconnect(entry.id);
    }
  }
}
