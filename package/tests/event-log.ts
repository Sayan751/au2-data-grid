import { ILogEvent, ISink, LogLevel, sink } from '@aurelia/kernel';

/**
 * Event log sink for testing
 */
export class EventLog implements ISink {
  public readonly log: ILogEvent[] = [];
  public handleEvent(event: ILogEvent): void {
    this.log.push(event);
  }
  public clear(): void {
    this.log.length = 0;
  }
}