import { ChatSocket } from '../../core/services/chat-socket';

export class RealtimeRefresh {
  constructor(
    private readonly socket: ChatSocket,
    private readonly types: string[],
    private readonly refresh: () => void
  ) {}

  private readonly onNotification = (notification: {
    type?: string;
    relatedId?: string;
  }): void => {
    if (!notification?.type) {
      return;
    }

    if (this.types.length > 0 && !this.types.includes(notification.type)) {
      return;
    }

    this.refresh();
  };

  start(): void {
    this.socket.connect();
    this.socket.on('notification:new', this.onNotification);
  }

  stop(): void {
    this.socket.off('notification:new', this.onNotification);
  }
}