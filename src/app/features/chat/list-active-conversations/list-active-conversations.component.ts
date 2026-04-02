import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { CUstomEventService } from '../../../shared/services/Events/custom-events.service';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddon } from 'primeng/inputgroupaddon';
import { DialogModule } from 'primeng/dialog';
import { ConversationModel } from '../conversation.model';
import { UserManagerService } from '../../../shared/services/user-manager.service';
import { ChatManagerService } from '../../../shared/services/chat-manager.service';
import { SelectModule } from 'primeng/select';
import { ConversationNotificationTemplate, LayoutService } from '../../../layout/service/app.layout.service';
import { PlatformManagerService } from '../../../shared/services/platform-manager.service';
import { CheckboxModule } from 'primeng/checkbox';


@Component({
  selector: 'app-list-active-conversations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    InputTextModule,
    TagModule,
    AvatarModule,
    ToastModule,
    ToolbarModule,
    ButtonModule,
    TableModule,
    ConfirmDialogModule,
    InputGroupModule,
    DialogModule,
    CheckboxModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './list-active-conversations.component.html',
  styleUrl: './list-active-conversations.component.scss'
})
export class ListActiveConversationsComponent implements OnInit, OnDestroy {
  @Output() totalActiveConversations: EventEmitter<number> = new EventEmitter();
  profile !: any;
  existingAssignee: any;
  private destroy$ = new Subject<void>();

  @Input() is_user_specific: boolean;
  @Input() heading: string = "Active Conversations";
  users!: any[];
  conversation !: any;
  conversations!: ConversationModel[];
  selectedConversations!: ConversationModel[];
  loading: boolean = false;

  constructor(
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private conversationService: ChatManagerService,
    private userManagerService: UserManagerService,
    private assignmentEventService: CUstomEventService,
    private platformManagerService: PlatformManagerService,
    private layoutService: LayoutService
  ) { }

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
      this.layoutService.state.staticMenuDesktopInactive = true;
      this.susbscribeAssignemntChangeEvent();
      this.subscribeCloseConversationEvent();
      this.loadUsers();
    }
  }

  susbscribeAssignemntChangeEvent() {
    this.assignmentEventService.assignmentEvent$.pipe(takeUntil(this.destroy$)).subscribe((convs) => {
      if (convs !== 'skip') {
        this.loadConversations(this.currentPage, this.pageSize);
      }
    });
  }

  subscribeCloseConversationEvent() {
    this.assignmentEventService.closeConversationEvent$.pipe(takeUntil(this.destroy$)).subscribe((message) => {
      if (message !== 'skip') {
        this.loadConversations(this.currentPage, this.pageSize);
      }
    })
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


    currentPage: number = 1;
pageSize: number = 10;
totalRecords: number = 0;

  onPageChange(event: any) {
  const page = event.first / event.rows + 1;  // PrimeNG gives zero-based
  const pageSize = event.rows;
  const sortField = event.sortField;
  const sortOrder = event.sortOrder; // 1 for asc, -1 for desc
  this.loadConversations(page, pageSize, undefined, sortField, sortOrder);
}

loadConversations(page: number = this.currentPage, pageSize: number = this.pageSize, search?: string, sortField?: string, sortOrder?: number) {
  this.loading = true;
  let ordering: string | undefined;
  if (sortField) {
    if (sortField.startsWith("assigned")){
      sortField = "assigned_user__username";
    }
    const df = sortField.replace(/\./g, '__'); // convert first
    ordering = sortOrder === -1 ? `-${df}` : df;
  }
  this.conversationService.list_active_conversations("non-chat", this.is_user_specific, page, pageSize, search, ordering
    ).pipe(takeUntil(this.destroy$)).subscribe((result) => {
        // Always expect DRF pagination
        if (!result || !Array.isArray(result.results)) {
          console.error("Unexpected response format:", result);
          this.conversations = [];
          this.totalRecords = 0;
          this.loading = false;
          return;
        }

        const data = result.results;
        this.conversations = data;  // ✅ always array
        this.totalRecords = result.count ?? data.length;
        this.currentPage = page;
        this.pageSize = pageSize;
        this.loading = false;
        this.totalActiveConversations.emit(data.length);
      },
      (err) => {
        console.error("Error loading conversations:", err);
        this.conversations = [];
        this.loading = false;
      }
    );
}

  //loadUsers() {
  //  this.userManagerService.list_users().subscribe((data) => {
  //    this.users = data;
  //  },
  //  (err) => {
  //  }
  //  );
  //}

  //loadConversations() {
  //  this.loading = true;
  //  this.conversationService.list_active_conversations(this.is_user_specific
  //  ).pipe(takeUntil(this.destroy$)).subscribe((data) => {
  //    this.totalActiveConversations.emit(data.length);
  //    this.conversations = data;
  //    this.loading = false;
  //  },
  //  (err) => {
  //    console.error("List conversation | Error getting conversations ", err);
  //    this.loading = false;
  //  }
  //  )
  //}

  onSearchInput(event: Event, dt: Table): void {
    const inputElement = event.target as HTMLInputElement;
    const searchValue = inputElement.value;
    this.currentPage = 1;
    this.loadConversations(this.currentPage, this.pageSize, searchValue);
  }

  getSeverity(status: string) {
    switch (status) {
        case 'new':
            return 'danger';
        case 'active':
            return 'warn';
        case 'closed':
            return 'success';
    }
    return 'danger';
  }

  toggleDropdown(row: any): void {
    row.isDropdownVisible = !row.isDropdownVisible;
    this.existingAssignee = row.assigned;
  }

  assignTask(row: any): void {
    if (row.assigned) {
      this.conversationService.assign_conversation(
        "chat",
        row.id,
        row.assigned.user
      ).pipe(takeUntil(this.destroy$)).subscribe((data) => {
        this.assignmentEventService.emitAssignmentChange('skip');
        this.loadConversations(this.currentPage, this.pageSize);
        this.refreshUnrespondedConversationNotifications();
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Task got re-assigned successfully' });
      },
      (err) => {
        console.error("List conversation | Error assigning task ", err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An error occurred while assigning task', sticky: true });
      }
      )
      row.isDropdownVisible = false; // Close dropdown after assignment
    }
  }

  cancelAssignment(row: any): void {
    row.isDropdownVisible = false; // Close dropdown without assigning
    row.assigned = this.existingAssignee; // Clear selection
  }

  //refreshUnrespondedConversationNotifications() {
  //      this.conversationService.list_notification("non-chat").pipe(takeUntil(this.destroy$)).subscribe({
  //          next: (notificationData: ConversationNotificationTemplate) => {
  //              this.layoutService.unrespondedConversationNotification.update((prev) => notificationData)
  //          },
  //          error: (err) => {console.error(`Could not get the conversation notifications ${err}`)}
  //      });
  //  }
  // Component 2 (non-chat)
refreshUnrespondedConversationNotifications(): void {
    this.conversationService.list_notification('non-chat', 1, 20)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
            next: (response: any) => {
                const data = response.results ?? response;
                const notifications = data.notifications ?? data;
                const totalCount: number = data.conversation_count ?? response.count ?? notifications.length;

                this.layoutService.unrespondedConversationNotification.set({
                    conversation_count: totalCount,
                    notifications: notifications
                });
            },
            error: (err) => console.error(`Could not get the conversation notifications: ${err}`)
        });
}

  //closeConversationVisible = false;
  //closedReason;
  //selectedConversation;
  //closePreTask(conversation) {
  //  this.closeConversationVisible = true;
  //  this.selectedConversation = conversation
  //}
  //closeTask() {
  //  this.conversationService.close_conversation(
  //    "chat",
  //    this.selectedConversation.id,
  //    {
  //      "closed_reason": this.closedReason
  //    }
  //  ).pipe(takeUntil(this.destroy$)).subscribe((data)=>{
  //    this.refreshUnrespondedConversationNotifications();
  //    this.closeConversationVisible = false;
  //    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Conversation closed successfully' });
  //    this.loadConversations(this.currentPage, this.pageSize);
  //    this.assignmentEventService.emitCloseConversation("skip");
  //  });
  //  if (this.blockForm.should_block) {
  //    this.submitBlockContact();
  //  }
  //}

  closeConversationVisible = false;
closedReason = '';
closeSubmitted = false;
selectedConversation;

onCloseConversationCancel(): void {
  this.closedReason = '';
  this.closeSubmitted = false;
  this.closeConversationVisible = false;
}

closePreTask(conversation): void {
  this.closedReason = '';
  this.closeSubmitted = false;
  this.selectedConversation = conversation;
  this.closeConversationVisible = true;
}

closeTask(): void {
  this.closeSubmitted = true;
  if (!this.closedReason?.trim()) return;

  this.conversationService.close_conversation(
    "chat",
    this.selectedConversation.id,
    { "closed_reason": this.closedReason }
  ).pipe(takeUntil(this.destroy$)).subscribe((data) => {
    this.closeConversationVisible = false;
    this.closedReason = '';
    this.closeSubmitted = false;
    this.refreshUnrespondedConversationNotifications();
    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Conversation closed successfully' });
    this.loadConversations(this.currentPage, this.pageSize);
    this.assignmentEventService.emitCloseConversation("skip");
  });

  if (this.blockForm.should_block) {
    this.submitBlockContact();
  }
}

   blockForm = {
  platform: null,
  contact_value: '',
  contact_type: '',
  reason: '',
  should_block: false
};
blockDialogVisible = false;

submitBlockContact() {
  this.platformManagerService.list_platforms_by_type(this.selectedConversation.contact.platform_name)
    .pipe(takeUntil(this.destroy$)).subscribe({
      next: (platformsToBlockTheContact: any[]) => {
        const platform_ids = platformsToBlockTheContact.map(p => p.id);
        const payload = {
          contact_value: this.selectedConversation.contact.phone,
          contact_type: this.selectedConversation.contact.platform_name,
          reason: this.closedReason,
          platform_ids: platform_ids
        };
        this.platformManagerService
          .blockContactBulk(payload)
          .subscribe({
            next: () => {
              this.blockDialogVisible = false;
              this.blockForm = { should_block: false, platform: null, contact_value: '', contact_type: '', reason: '' };
            },
            error: (err) => {
              console.error('Block contact failed', err);
              this.blockForm = { should_block: false, platform: null, contact_value: '', contact_type: '', reason: '' };
            }
          });
      },
      error: (err) => console.error("Could not get platform IDs")
    });
}
}
