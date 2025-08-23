import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { PerformJsonOpPipe } from '../../../../shared/pipes/perform-json-op.pipe';
import { BadgeModule } from 'primeng/badge';

@Component({
  selector: 'app-list-chat-window',
  imports: [
    CommonModule,

    AvatarModule,
    BadgeModule,

    PerformJsonOpPipe
  ],
  templateUrl: './list-chat-window.component.html',
  styleUrl: './list-chat-window.component.scss'
})
export class ListChatWindowComponent {

  _conversation;
  lastMessageTime;

  @Input() set conversation(value) {
    this._conversation = value;
    let lastMessage = this._conversation.messages[this._conversation.messages.length - 1];
    if (lastMessage) {
      const time = lastMessage.type === 'customer' ? lastMessage.received_time : lastMessage.sent_time;
    this.lastMessageTime = this.isOlderThan24Hours(time)
      ? new Date(time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  isOlderThan24Hours(dateString: string): boolean {
    const now = new Date();
    const messageDate = new Date(dateString);
    const diffInMs = now.getTime() - messageDate.getTime();
    return diffInMs > 24 * 60 * 60 * 1000;
  }

  get conversation() {
    return this._conversation;
  }

  get unreadCount() {
    let count = 0;
    for (let msg of this.conversation.messages) {
      if (msg.status === 'unread') {
        count++;
      }
    }
    return count;
  }

  

}