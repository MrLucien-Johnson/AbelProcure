export type NotificationChannel = 'IN_APP' | 'BROWSER' | 'EMAIL' | 'TELEGRAM' | 'DISCORD';

export interface NotificationProvider {
  readonly channel: NotificationChannel;
  readonly status: 'READY' | 'CONFIGURATION_REQUIRED' | 'NOT_IMPLEMENTED';
  send(message: { title: string; body: string; url?: string; severity: 'critical' | 'opportunity' | 'info' }): Promise<void>;
}

export class InAppNotificationProvider implements NotificationProvider {
  readonly channel = 'IN_APP' as const;
  readonly status = 'READY' as const;
  readonly inbox: { title: string; body: string; at: string }[] = [];
  async send(message: { title: string; body: string }): Promise<void> {
    this.inbox.push({ title: message.title, body: message.body, at: new Date().toISOString() });
  }
}

export class UnconfiguredProvider implements NotificationProvider {
  constructor(
    readonly channel: NotificationChannel,
    readonly status: 'CONFIGURATION_REQUIRED' | 'NOT_IMPLEMENTED' = 'CONFIGURATION_REQUIRED',
  ) {}
  async send(): Promise<void> {
    throw Object.assign(new Error(`${this.channel} ${this.status}`), { code: this.status });
  }
}
