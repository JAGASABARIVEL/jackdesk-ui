import { Component, OnDestroy, OnInit } from '@angular/core';
import { SocketService } from '../../../shared/services/socketio.service'
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserManagerService } from '../../../shared/services/user-manager.service';
import { WEBSITE_OWNING_ORG } from '../../../../environment';
import { AvatarModule } from 'primeng/avatar';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-chat-widget',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        AvatarModule
    ],
    templateUrl: './chat-widget.component.html',
    styleUrls: ['./chat-widget.component.scss']
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
    isOpen = false;
    message = '';
    messages: { text: string, sender: 'user' | 'agent' }[] = [];
    private destroy$ = new Subject<void>();


    constructor(private socketService: SocketService, private userManagerService: UserManagerService) { }

    ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}

    ngOnInit(): void {
        localStorage.clear();
        this.getGuestTokenAndConnectToWebsocket();
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
    }

    getGuestTokenAndConnectToWebsocket() {
        this.userManagerService.guest_token({"organization": WEBSITE_OWNING_ORG}).pipe(takeUntil(this.destroy$)).subscribe(
            {
                next: (profile: any) => { this.connectToWebSocketServer(profile); },
                error: (err) => console.error("Can not get the guest token")
            }
        )
    }

    connectToWebSocketServer(profile) {
        this.socketService.initSocket(profile).then(() => {
            this.connectWebSocket();
        })
            .catch((err) => {
                console.error("Socket connection failed", err);
            });
    }

    connectWebSocket() {
        this.socketService.getWebsiteChatWidgetMessages().pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
            if (data?.message) {
                this.messages.push({ text: data?.message, sender: 'agent' });
                this.playNewMessageNotificationSound();
            }
        });
    }

    sendMessage() {
        if (!this.message.trim()) return;
        this.socketService.sendMessage(this.message);
        this.messages.push({ text: this.message, sender: 'user' });
        this.message = '';
    }

    playNewMessageNotificationSound() {
  const audio = new Audio("../../../../assets/media/new_message.mp3");
  audio.play();
}
}
