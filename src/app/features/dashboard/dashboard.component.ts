import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ConversationDashboardComponent } from './conversation-dashboard/conversation-dashboard.component';
import { KeyloggerDashboardComponent } from './keylogger-dashboard/keylogger-dashboard.component';
import { Router } from '@angular/router';
import { TabsModule } from 'primeng/tabs';
import { ChatManagerService } from '../../shared/services/chat-manager.service';
import { ConversationNotificationTemplate, LayoutService } from '../../layout/service/app.layout.service';
import { Subject, takeUntil } from 'rxjs';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ConversationDashboardComponent,

    TabsModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  profile;
  private destroy$ = new Subject<void>();


  constructor(private router: Router, private conversationService: ChatManagerService, private layoutService: LayoutService) {}

  ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}

  ngOnInit(): void {
    this.profile = JSON.parse(localStorage.getItem('profile'));
    if (!this.profile) {
      this.router.navigate(['/apps/login']);
      return;
    }
    else {
      this.refreshUnrespondedConversationNotifications();
    }
  }

  refreshUnrespondedConversationNotifications() {
        this.conversationService.list_notification("non-chat").pipe(takeUntil(this.destroy$)).subscribe({
            next: (notificationData: ConversationNotificationTemplate) => {
                this.layoutService.unrespondedConversationNotification.update((prev) => notificationData)
            },
            error: (err) => {console.error(`Could not get the conversation notifications ${err}`)}
        });
    }

}
