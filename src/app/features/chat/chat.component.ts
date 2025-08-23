import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { ListActiveConversationsComponent } from './list-active-conversations/list-active-conversations.component';
import { UserManagerService } from '../../shared/services/user-manager.service';
import { ChatWindowComponent } from './chat-window/chat-window.component';
import { CostAnalysisComponentChat } from './cost-analysis/cost-analysis.component';
import { TabsModule } from 'primeng/tabs';
import { Subject, takeUntil } from 'rxjs';



@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    TabsModule,
    BadgeModule,

    ListActiveConversationsComponent,
    ChatWindowComponent,
    CostAnalysisComponentChat
  ],
  providers: [
    MessageService,
    ConfirmationService
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit, OnDestroy {
  total_conversations: number = 0;
  total_new_conversation_me: number = 0;
  total_active_conversations: number = 0;
  private destroy$ = new Subject<void>();

  users = [];

  constructor(
    private userManagerService: UserManagerService,
    private router: Router
  ) {}

  ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}


  profile;
  ngOnInit(): void {
    this.profile = JSON.parse(localStorage.getItem('profile'));

    if (!this.profile) {
      this.router.navigate(['/apps/login']);
      return;
    }
    if (this.profile.user.role !== 'individual') {
      this.loadUsers();
    }
  }

  loadUsers() {
    this.userManagerService.list_users().pipe(takeUntil(this.destroy$)).subscribe((data) => {
      this.users = data;
    },
    (err) => {
      console.error("List conversation | Error getting users ", err);
    }
    );
  }

  onTotalConversationsHandler(count: number) {
    this.total_conversations = count;
  }

  onTotalNewConversationsMeHandler(count: number) {
    this.total_new_conversation_me = count;
  }

  onTotalActiveConversationsHandler(count: number) {
    this.total_active_conversations = count;
  }
}
