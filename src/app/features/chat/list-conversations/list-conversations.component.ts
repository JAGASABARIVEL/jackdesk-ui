import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
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
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { UserManagerService } from '../../../shared/services/user-manager.service';
import { ChatManagerService } from '../../../shared/services/chat-manager.service';
import { CUstomEventService } from '../../../shared/services/Events/custom-events.service';
import { ConversationModel } from '../conversation.model';
import { SelectModule } from 'primeng/select';
import { SocketService } from '../../../shared/services/socketio.service';
import { ConversationNotificationTemplate, LayoutService } from '../../../layout/service/app.layout.service';
import { DialogModule } from 'primeng/dialog';
import { PlatformManagerService } from '../../../shared/services/platform-manager.service';
import { CheckboxModule } from 'primeng/checkbox';



@Component({
  selector: 'app-list-conversations',
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
    InputGroupAddonModule,
    CheckboxModule
  ],
  providers: [
    MessageService, ConfirmationService
  ],
  templateUrl: './list-conversations.component.html',
  styleUrl: './list-conversations.component.scss'
})
export class ListNewConversationsComponent implements OnInit, OnDestroy {
  profile !: any;

  @Input() users!: any[];
  @Input() heading : string = "New";

  conversation !: ConversationModel;
  conversations!: ConversationModel[];
  selectedConversations!: ConversationModel[];
  loading: boolean = false;
  private destroy$ = new Subject<void>();


  constructor(
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private userManagerService: UserManagerService,
    private conversationService: ChatManagerService,
    private platformManagerService: PlatformManagerService,
    private assignmentEventService: CUstomEventService,
    private socketService: SocketService,
    private layoutService: LayoutService,
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

    if (this.socketService.isSocketConnected) {
      this.subscribeToWebSocketChatMessages();
    }
    else{
      console.error("Socket connection not available for new conversations subscription");
      this.layoutService.addNotification(
          {'severity': 'error', 'app': 'Dashboard', 'text': 'Socket connection not available for new notification'}
      )
    }
    
    this.loadConversations();
  }

  subscribeToWebSocketChatMessages(): void {
    this.socketService.getMessages().pipe(takeUntil(this.destroy$)).subscribe((message) => {
      if (message.msg_from_type === "CUSTOMER") {
        if (message.is_conversation_new) {
          this.playNotificationSound();
          if (this.layoutService.newTaskUpdateToken()) {
            this.layoutService.newTaskUpdateToken.set(false);
            this.loadConversations();
          }
        }
      }
    });
  }

  playNotificationSound() {
  const audio = new Audio("../../../../assets/media/new_conversation_notofication.mp3");
  audio.play();
}

  calculateDateDifference(dateString: string): number {
    // Parse the date string into a Date object
    const receivedDate = new Date(dateString);
    // Get today's date (ignoring time)
    const today = new Date();
    //today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate day comparison
    // Calculate the difference in time (milliseconds)
    const timeDifference = today.getTime() - receivedDate.getTime();
    // Convert time difference to days
    const dayDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    return dayDifference;
  }

  loadConversations(skip_notification=true) {
    this.loading = true;
    this.conversationService.list_new_conversations().pipe(takeUntil(this.destroy$)).subscribe((data) => {
      data.forEach((convers) => {
        convers.sla = this.calculateDateDifference(convers.created_at);
      })
      this.conversations = data;
      let new_parsed_messages = [].concat(...data.map((unparsed_data) => {
        return {
            'customerName': unparsed_data?.contact?.name === ''? unparsed_data?.contact?.phone : unparsed_data?.contact?.name,
            'text': unparsed_data?.messages[0].message_body
        }
      }))
      this.layoutService.newTaskmessages.update(() => new_parsed_messages);
      this.layoutService.newTaskUpdateToken.set(true);
      this.loading = false;
      if (!skip_notification){
        this.assignmentEventService.emitAssignmentChange("Assignment Change");
      }
    },
    (err) => {
      this.layoutService.newTaskUpdateToken.set(true);
      console.error("List conversation | Error getting conversations ", err);
      this.loading = false;
    }
    )
  }

  onSearchInput(event: Event, dt: Table): void {
    const inputElement = event.target as HTMLInputElement;
    const searchValue = inputElement.value;
    dt.filterGlobal(searchValue, 'contains');
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
  }

  assignTask(row: any): void {
    if (row.assigned) {
      this.conversationService.assign_conversation(
        row.id,
        row.assigned.user
      ).pipe(takeUntil(this.destroy$)).subscribe((data) => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Task assignment changed' });
        this.refreshUnrespondedConversationNotifications();
        this.loadConversations(false);
      },
      (err) => {
        console.error("List conversation | Error assigning task ", err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An error occurred while assigning task', sticky: true });
      }
      )
      row.isDropdownVisible = false; // Close dropdown after assignment
    }
  }

  refreshUnrespondedConversationNotifications() {
        this.conversationService.list_notification().pipe(takeUntil(this.destroy$)).subscribe({
            next: (notificationData: ConversationNotificationTemplate) => {
                this.layoutService.unrespondedConversationNotification.update((prev) => notificationData)
            },
            error: (err) => {console.error(`Could not get the conversation notifications ${err}`)}
        });
    }

  cancelAssignment(row: any): void {
    row.isDropdownVisible = false; // Close dropdown without assigning
    row.assigned = null; // Clear selection
  }

  closeConversationVisible = false;
  closedReason;
  selectedConversation;
  closePreTask(conversation) {
    this.closeConversationVisible = true;
    this.selectedConversation = conversation
  }
  closeTask() {
    this.conversationService.close_conversation(
      this.selectedConversation.id,
      {
        "reason": this.closedReason
      }
    ).pipe(takeUntil(this.destroy$)).subscribe((data)=>{
      this.refreshUnrespondedConversationNotifications();
      this.closeConversationVisible = false;
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Conversation closed successfully' });
      this.loadConversations();
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
