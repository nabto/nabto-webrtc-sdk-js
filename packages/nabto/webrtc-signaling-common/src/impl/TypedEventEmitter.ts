/* eslint-disable @typescript-eslint/no-explicit-any */
export class TypedEventEmitter<
  TEventMap extends { [K in keyof TEventMap]: (...args: any[]) => any }
> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  private events: Map<string, Set<any>> = new Map();

  // Overloaded `on` method with type safety
  on<K extends keyof TEventMap>(event: K, handler: TEventMap[K]): void {
    if (!this.events.has(event as string)) {
      this.events.set(event as string, new Set());
    }
    this.events.get(event as string)!.add(handler);
  }

  // Remove an event listener
  off<K extends keyof TEventMap>(event: K, handler: TEventMap[K]): void {
    this.events.get(event as string)?.delete(handler);
  }

  async emit<K extends keyof TEventMap>(
    event: K,
    ...args: Parameters<TEventMap[K]>
  ): Promise<number> {
    const events = this.events.get(event as string)
    let invokedHandlersCount = 0;
    if (events) {
      for (const handler of events) {
        try {
          await (handler as TEventMap[K])(...args);
        } catch (e) {
          console.error("Exception thrown in event handler, this is not supported.", e)
        }
        invokedHandlersCount++;
      }
    }
    return invokedHandlersCount;
  }

  emitSync<K extends keyof TEventMap>(
    event: K,
    ...args: Parameters<TEventMap[K]>
  ): number {
    const events = this.events.get(event as string)
    let invokedHandlersCount = 0;
    if (events) {
      for (const handler of events) {
        try {
          (handler as TEventMap[K])(...args);
        } catch (e) {
          console.error("Exception thrown in event handler, this is not supported.", e)
        }
        invokedHandlersCount++;
      }
    }
    return invokedHandlersCount;
  }


  removeAllListeners() {
    for (const [, s] of this.events) {
      s.clear();
    }
    this.events.clear();
  }
}
