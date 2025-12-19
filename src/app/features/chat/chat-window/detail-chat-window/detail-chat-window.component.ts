
import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { AdditionalDetailChatWindowComponent } from '../additional-detail-chat-window/additional-detail-chat-window.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SidebarModule } from 'primeng/sidebar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ContextMenuModule } from 'primeng/contextmenu';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MessagePreviewComponent } from '../../../campaign/message-preview/message-preview.component';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { PlatformManagerService } from '../../../../shared/services/platform-manager.service';
import { ChatManagerService } from '../../../../shared/services/chat-manager.service';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConversationNotificationTemplate, LayoutService } from '../../../../layout/service/app.layout.service';
import { NgZone } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { SafeUrlPipe } from '../../../../shared/pipes/safe-url.pipe';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { ContactModel } from '../../../contacts/contact/contacts.model';
import { ContactManagerService } from '../../../../shared/services/contact-manager.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TextareaModule } from 'primeng/textarea';
import { Router } from '@angular/router';
import { FileUploadModule } from 'primeng/fileupload';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { BadgeModule } from 'primeng/badge';
import { MessageModule } from 'primeng/message';      // ✅ ADD THIS
import { PanelModule } from 'primeng/panel';          // ✅ ADD THIS
import { UserManagerService } from '../../../../shared/services/user-manager.service';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { InternalNotesComponent } from './internal-notes/internal-notes.component';



@Component({
  selector: 'app-detail-chat-window',
  imports: [
    CommonModule,
    FormsModule,

    AvatarModule,
    SidebarModule,
    ButtonModule,
    InputTextModule,
    ConfirmPopupModule,
    ContextMenuModule,
    DialogModule,
    FloatLabelModule,
    SelectModule,
    ToastModule,
    TooltipModule,
    ConfirmDialogModule,
    RadioButtonModule,
    TextareaModule,
    SafeUrlPipe,
    FileUploadModule,
    CheckboxModule,
    ChipModule,
    BadgeModule,
    DividerModule,
    MessageModule,
    PanelModule,
    MenuModule,

    AdditionalDetailChatWindowComponent,
    MessagePreviewComponent,
    InternalNotesComponent
  ],
  providers: [
    ConfirmationService,
    MessageService
  ],
  templateUrl: './detail-chat-window.component.html',
  styleUrl: './detail-chat-window.component.scss'
})
export class DetailChatWindowComponent implements AfterViewInit {

  // Add these properties
  menuItems: MenuItem[] = [];
  @ViewChild('menu') menu: any;

  @Output() chatDetailsPageLoaded: EventEmitter<boolean> = new EventEmitter();
  @Output() conversationClosedEvent: EventEmitter<any> = new EventEmitter();
  @Output() messageSentEvent: EventEmitter<any> = new EventEmitter();
  @Output() ownThisConversationEvent: EventEmitter<any> = new EventEmitter();
  @Output() reassignThisConversationEvent: EventEmitter<any> = new EventEmitter();
  _selectedConversation;
  chatdetaildrawerVisible = true
  showInternalNotes=false
  selectedUserForAssignment = null;
  users = []
  private destroy$ = new Subject<void>();

  // ✅ NEW: Gmail CC properties
  newConversationGmailCC: string[] = [];
  newConversationGmailCCInput: string = '';

  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private router: Router,
    private sanitizer: DomSanitizer,
    private messageService: MessageService,
    private contactService: ContactManagerService,
    private layoutService: LayoutService,
    private platforService: PlatformManagerService,
    private conversationService: ChatManagerService,
    private userManagerService: UserManagerService
  ) { }

  ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}


  ngAfterViewInit(): void {
    this.scrollToBottom();
    this.chatDetailsPageLoaded.emit(true);
  }

  @Input() set selectedConversation(value) {
  // ✅ Guard against null/undefined
  if (!value) {
    console.warn('selectedConversation is null or undefined');
    this._selectedConversation = null;
    return;
  }
  
  this._selectedConversation = value;
  this.selectedContact = value?.contact;
  this.convertTocommondatetime();

  // ✅ Only rebuild menu if profile is available
  if (this.profile) {
    this.buildMenuItems();
  }
  else {
    console.log("No profile available to rebuild menu");
  }
  
  this.ngZone.onStable.pipe(take(1)).subscribe(() => {
    this.scrollToBottom();
    this.loadUsers();
  });
}

  @Input() set reassignmentProcessSuccess(value) {
  // ✅ Guard against loading users when no conversation
  if (value === true && this._selectedConversation) {
    this.loadUsers();
  }
}

// 1. Add profile setter
private _profile: any;

@Input() 
set profile(value: any) {
  this._profile = value;
  // Rebuild menu when profile is set
  if (this._selectedConversation) {
    this.buildMenuItems();
  }
}

get profile() {
  return this._profile;
}

// ✅ NEW: Build menu items dynamically based on conversation state
buildMenuItems() {
  // ✅ Guard against missing conversation OR profile
  if (!this._selectedConversation || !this.profile) {
    this.menuItems = [];
    return;
  }

  this.menuItems = [];

  // Send Template Message (only for WhatsApp active conversations)
  if (this.selectedConversation.contact.platform_name === 'whatsapp' &&
      this.selectedConversation.status === 'active' &&
      this.selectedConversation.assigned?.id === this.profile.user.id) {
    this.menuItems.push({
      label: 'Send Template',
      icon: 'pi pi-file',
      command: () => {
        this.openSendTemplateDialog();
      }
    });
  }
  
  // Info Button
  this.menuItems.push({
    label: 'Contact Info',
    icon: 'pi pi-info-circle',
    command: () => {
      this.chatdetaildrawerVisible = true;
    }
  });

  // Internal Comments Button
  //this.menuItems.push({
  //  label: 'Add Comments',
  //  icon: 'pi pi-comments',
  //  command: () => {
  //    this.showInternalNotes = true;
  //  }
  //});

  // Historical Conversation (only for non-Gmail)
  if (this.selectedConversation.contact.platform_name !== 'gmail') {
    this.menuItems.push({
      label: 'View History',
      icon: 'pi pi-history',
      command: () => {
        this.loadHistoricalConversation();
      }
    });
  }
  // Separator
  this.menuItems.push({ separator: true });

  // Reassign Conversation
  if (this.selectedConversation.status !== 'org_new' && this.selectedConversation.status !== 'closed') {
  this.menuItems.push({
    label: 'Reassign Conversation',
    icon: 'pi pi-pencil',
    command: () => {
      this.openReassignmentDialog();
    }
  });
  }

  // Close Conversation (only if active and assigned to someone)
  if (!this.isWorkedBySomeone && 
      this.selectedConversation.status !== 'new' && 
      this.selectedConversation.status !== 'org_new' && 
      this.selectedConversation.status !== 'closed') {
    this.menuItems.push({
      label: 'Close Conversation',
      icon: 'pi pi-lock',
      command: () => {
        this.closeConversation();
      }
    });
  }

  // Start New Conversation (for org_new or Gmail)
  if (this.selectedConversation.status === 'org_new' || 
      this.selectedConversation.contact.platform_name === 'gmail') {
    this.menuItems.push({
      label: 'Start New Conversation',
      icon: 'pi pi-lock-open',
      command: () => {
        this.newConversation();
      }
    });
  }
}

// ✅ NEW: Open reassignment dialog
openReassignmentDialog() {
  this.isAssignmentDropdownVisible = true;
}



  loadUsers() {
  // ✅ Guard against loading when no conversation
  if (!this._selectedConversation) {
    console.warn('Cannot load users: no conversation selected');
    return;
  }
  
  this.userManagerService.list_users().pipe(takeUntil(this.destroy$)).subscribe(
    (data) => {
      // Filter out the user who is already assigned to this conversation
      if (this.selectedConversation?.assigned?.id) {
        this.users = data.filter((usr) => usr.user !== this.selectedConversation.assigned.id);
      } else {
        this.users = data;
      }
    },
    (err) => {
      console.error("List conversation | Error getting users ", err);
      this.users = []; // ✅ Set empty array on error
    }
  );
}

  public getSanitizedHtml(raw: string): SafeHtml {
  return this.sanitizer.bypassSecurityTrustHtml(raw);
}

getMimeType(url: string): 'image' | 'video' | 'audio' | 'pdf' | 'other' {
  if (!url) return 'other';
  const ext = url.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  if (['mp3', 'aac', 'wav', 'ogg'].includes(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  return 'other';
}

// ✅ NEW: Reset form
    resetNewConversationForm() {
        this.newConversationSubjectForGmail = '';
        this.newConversationGmailMessageBody = '';
        this.newConversationGmailCC = [];
        this.newConversationGmailCCInput = '';
        this.newConversationGmailAttachment = null;
        this.selected_platform = null;
    }

// ✅ NEW: Open new conversation dialog
    openNewGmailConversation() {
        this.resetNewConversationForm();
        this.openConversationGmailVisible = true;
    }

    // ✅ NEW: Add CC recipient
    addNewConversationCC() {
        const email = this.newConversationGmailCCInput.trim();

        if (!this.isValidEmail(email)) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Invalid Email',
                detail: 'Please enter a valid email address'
            });
            return;
        }

        const emailLower = email.toLowerCase();

        // Check if same as "To" email
        if (this.selectedConversation.contact.phone.toLowerCase() === emailLower) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Duplicate',
                detail: 'This email is the same as the "To" recipient'
            });
            return;
        }

        // Check if already in CC list
        if (this.newConversationGmailCC.some(cc => cc.toLowerCase() === emailLower)) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Duplicate',
                detail: 'This email is already in the CC list'
            });
            return;
        }

        // Add to CC list
        this.newConversationGmailCC.push(email);
        this.newConversationGmailCCInput = '';

        this.messageService.add({
            severity: 'success',
            summary: 'Added',
            detail: 'CC recipient added successfully'
        });
    }

    // ✅ NEW: Remove CC recipient
    removeNewConversationCC(index: number) {
        const removed = this.newConversationGmailCC.splice(index, 1);
        this.messageService.add({
            severity: 'info',
            summary: 'Removed',
            detail: `${removed[0]} removed from CC list`
        });
    }

    // ✅ NEW: Form validation
    isNewConversationValid(): boolean {
      let response = !!(this.selected_platform &&
            this.selectedConversation.contact.phone &&
            this.isValidEmail(this.selectedConversation.contact.phone) &&
            this.newConversationSubjectForGmail &&
            this.newConversationGmailMessageBody);
        return response;
    }

     // ✅ NEW: Cancel and reset
    cancelNewGmailConversation() {
        // Confirm if there's content
        if (this.newConversationGmailMessageBody || this.newConversationGmailCC.length > 0) {
            if (confirm('Are you sure you want to discard this email?')) {
                this.openConversationGmailVisible = false;
                this.resetNewConversationForm();
            }
        } else {
            this.openConversationGmailVisible = false;
            this.resetNewConversationForm();
        }
    }


  convertTocommondatetime() {
    this._selectedConversation.messages = this._selectedConversation.messages.map(msg => {
      const time = msg.type === 'customer' ? msg.received_time : msg.sent_time;
      return {
        ...msg,
        displayTime: this.isOlderThan24Hours(time)
          ? new Date(time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
          : new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    });
  }

  get selectedConversation() {
    return this._selectedConversation;
  }

  get isWorkedBySomeone() {
  if (!this._selectedConversation || !this.profile) return false;
  
  return this._selectedConversation.assigned?.id && 
         this._selectedConversation.assigned?.id >= 0 && 
         this._selectedConversation.assigned.id !== this.profile.user.id;
}

  isOlderThan24Hours(dateString: string): boolean {
    const now = new Date();
    const messageDate = new Date(dateString);
    const diffInMs = now.getTime() - messageDate.getTime();
    return diffInMs > 24 * 60 * 60 * 1000;
  }


  /** Employee Details */
  private usedColors: Set<string> = new Set();

  currentColor: string = '#FFFFFF';

  generateColor(): void {
    this.currentColor = this.getRandomColor();
  }

  getRandomColor(): string {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }

  getUniqueRandomColor(): string {
    let color;
    do {
      color = this.getRandomColor();
    } while (this.usedColors.has(color));
    this.usedColors.add(color);
    return color;
  }

  _employees = []
  @Input()
  set employees(value: any[]) {
    value.forEach(
      (emp) => {
        emp.color = this.getUniqueRandomColor();
      }
    );
    this._employees = value;
  }

  get employees(): any[] {
    return this._employees;
  }

  getEmployeeNameFromId(id) {
    const employee = this.employees.find(employee => { return employee.user === id });
    return employee || { details: { "username": "unknown" }, "color": "red" };
  }

  loadHistoricalConversation() {
    this.conversationService.list_historical_conversations_for_contact("chat", this.selectedConversation.contact.id).subscribe(
      (convs) => {
        let conv_messages: any[] = [];
        convs.forEach((conv) => {
          // Normalize and sort conversation messages by timestamp
          const normalizedMsgs = conv.messages.map((msg: any) => ({
            ...msg,
            'timestamp': msg.sent_time
              ? new Date(msg.sent_time).getTime()
              : new Date(msg.received_time).getTime()
          }));
          normalizedMsgs.sort((a, b) => a.timestamp - b.timestamp);
          // Get start and end timestamps from message data
          const startTime = normalizedMsgs[0]?.timestamp || new Date(conv.created_at).getTime();
          const endTime = normalizedMsgs.at(-1)?.timestamp || startTime;
          // Add start_tag just before the first message
          conv_messages.push({
            'type': 'start_tag',
            'by': conv.open_by,
            'reason': conv.open_by === 'customer' ? 'Customer Query' : 'Organization Query',
            'timestamp': startTime - 1
          });
          // Add all messages
          conv_messages.push(...normalizedMsgs);

          // Add end_tag just after the last message (only for closed conversations)
          if (conv.status === 'closed') {
            conv_messages.push({
              'type': 'end_tag',
              'by': this.getEmployeeNameFromId(conv.closed_by)?.details?.username || "Unknown",
              'reason': conv.closed_reason,
              'timestamp': endTime + 1
            });
          }
        });
        // Final global sort of all messages by timestamp
        conv_messages.sort((a, b) => a.timestamp - b.timestamp);
        this.selectedConversation.messages = conv_messages;
        this.convertTocommondatetime();
      },
      (err) => {
        console.error("Chat window | Error getting historical conversations ", err);
      }
    );
  }


  isAssignmentDropdownVisible = false;
  toggleDropdown(): void {
    this.isAssignmentDropdownVisible = !this.isAssignmentDropdownVisible;
  }

  ownThisConversation() {
    this.conversationService.assign_conversation(
        "chat",
        this.selectedConversation.id,
        this.profile.user.id
      ).pipe(takeUntil(this.destroy$)).subscribe((data) => {
        this.selectedConversation.assigned = {id: this.profile.user.id, name: this.profile.user.username};
        this.selectedConversation.status = 'active'
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Task assignment changed' });
        this.ownThisConversationEvent.emit(this.selectedConversation);
      },
      (err) => {
        console.error("List conversation | Error assigning task ", err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An error occurred while assigning task', sticky: true });
      }
    )
  }

  // Update assignTask to rebuild menu
assignTask(): void {
  if (this.selectedUserForAssignment) {
    this.conversationService.assign_conversation(
      "chat",
      this.selectedConversation.id,
      this.selectedUserForAssignment.user
    ).pipe(takeUntil(this.destroy$)).subscribe((data) => {
      this.messageService.add({ 
        severity: 'success', 
        summary: 'Success', 
        detail: 'Task assignment changed' 
      });
      this.refreshUnrespondedConversationNotifications();
      this.cancelAssignment();
      this.reassignThisConversationEvent.emit({
        selected_conversation: this.selectedConversation, 
        current_user_id: this.profile.user.id
      });
    },
    (err) => {
      console.error("List conversation | Error assigning task ", err);
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'An error occurred while assigning task', 
        sticky: true 
      });
    });
  }
}

  cancelAssignment(): void {
    this.isAssignmentDropdownVisible = false; // Close dropdown without assigning
    this.selectedUserForAssignment = null;
  }
  

  closedReason = 'N/A';
  closeConversationVisible = false;
  closeConversation() {
    this.closeConversationVisible = true;
  }
  onClosedReasonSave() {
    this.conversationService.close_conversation(
      "chat",
      this.selectedConversation.id,
      {
        "closed_by": this.profile.user.id,
        "closed_reason": this.closedReason
      }
    ).pipe(takeUntil(this.destroy$)).subscribe((data) => {
      //this.reloadActiveConversation();
      this.conversationClosedEvent.emit(this.selectedConversation);

      this.closeConversationVisible = false;
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Conversation closed successfully' });
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
  this.platforService.list_platforms_by_type(this.selectedConversation.contact.platform_name)
    .pipe(takeUntil(this.destroy$)).subscribe({
      next: (platformsToBlockTheContact: any[]) => {
        const platform_ids = platformsToBlockTheContact.map(p => p.id);
        const payload = {
          contact_value: this.selectedConversation.contact.phone,
          contact_type: this.selectedConversation.contact.platform_name,
          reason: this.closedReason,
          platform_ids: platform_ids
        };
        this.platforService
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



  

  openConversationWhatsappVisible = false;
  startNewConversationOnWhatsapp() {
    // TODO: Handle template payload in BE
    this.openConversationWhatsappVisible = false;
    const newConversationPayload = new FormData();
    newConversationPayload.append("organization_id", this.profile.organization)
    newConversationPayload.append("platform_id", this.selected_platform.id)
    newConversationPayload.append("contact_id", this.selectedConversation.contact.id)
    newConversationPayload.append("user_id", this.profile.user.id)
    newConversationPayload.append("template", JSON.stringify(this.selectedTemplate))
    newConversationPayload.append("template_parameters", JSON.stringify(this.fieldValues))
    if (this.temaplteattachedFile !== null) {
      newConversationPayload.append('file', this.temaplteattachedFile);
    }

    this.conversationService.start_new_conversation(
      "chat",
      newConversationPayload
    ).pipe(takeUntil(this.destroy$)).subscribe(
      (success_data: any) => {   
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'New conversation started', sticky: true });
        this.selectedConversation.assigned = {id: this.profile.user.id, name: this.profile.user.username};
        this.selectedConversation.status = 'active'
        this.selectedConversation.id = success_data.data[0]?.id
        this.selectedConversation.messages = success_data.data[0]?.messages
        this.ownThisConversationEvent.emit(this.selectedConversation);
      },
      (err) => {
        this.messageService.add({ severity: 'danger', summary: 'Failed', detail: 'New conversation can not be started', sticky: true });
      }
    );
  }


  openConversationGmailVisible = false;
  newConversationGmailAttachment = null;
  newConversationGmailMessageBody = null;
  newSelectedConversationGmail:any = {};
  newConversationSubjectForGmail = 'Enquiry request';
  resetNewGmailMessageObjects() {
    this.newConversationGmailAttachment = null;
    this.newConversationGmailMessageBody = null;
    this.newSelectedConversationGmail = {};
    this.newConversationSubjectForGmail = 'Enquiry request';
  }
  

  handleFileUploadGmail(event: any) {
  const file = event.files?.[0];
  if (file) {
    this.newConversationGmailAttachment = file;
  }
}

  startNewConversationOnGmail() {
    this.newSelectedConversationGmail = structuredClone(this.selectedConversation);
    this.newSelectedConversationGmail['id'] = -1;
    // TODO: Handle template payload in BE
    this.openConversationGmailVisible = false;
    const newConversationPayload = new FormData();
    // ✅ Add CC recipients
    if (this.newConversationGmailCC.length > 0) {
        newConversationPayload.append('cc_recipients', JSON.stringify(this.newConversationGmailCC));
    }
    newConversationPayload.append("organization_id", this.profile.organization)
    newConversationPayload.append("platform_id", this.selected_platform.id)
    newConversationPayload.append("contact_id", this.selectedConversation.contact.id)
    newConversationPayload.append("user_id", this.profile.user.id)
    newConversationPayload.append("subject", this.newConversationSubjectForGmail)
    newConversationPayload.append("message_body", this.newConversationGmailMessageBody)
    if (this.newConversationGmailAttachment !== null) {
      newConversationPayload.append('file', this.newConversationGmailAttachment);
    }
    this.conversationService.start_new_conversation(
      "chat",
      newConversationPayload
    ).pipe(takeUntil(this.destroy$)).subscribe(
      (success_data: any) => {   
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'New conversation started', sticky: true });
        this.newSelectedConversationGmail['assigned'] = {id: this.profile.user.id, name: this.profile.user.username};
        this.newSelectedConversationGmail['status'] = 'active'
        this.newSelectedConversationGmail['subject'] = this.newConversationSubjectForGmail;
        this.newSelectedConversationGmail['id'] = success_data.data[0]?.id
        this.newSelectedConversationGmail['messages'] = success_data.data[0]?.messages;
        // Assigning back to selectedConversation so that its active
        this.ownThisConversationEvent.emit(this.newSelectedConversationGmail);
        //this.selectedConversation = this.newSelectedConversationGmail;
      },
      (err) => {
        this.messageService.add({ severity: 'danger', summary: 'Failed', detail: 'New conversation can not be started', sticky: true });
      }
    );
  }

  contextMenuItems = [];
  onRightClick(event: MouseEvent, fileId: any, contextMenu: any, media_url: any) {
    this.contextMenuItems = [
      { label: 'View / Download', icon: 'pi pi-download', command: () => this.viewOrDownloadFileFromUrl(media_url) },
      { label: 'View Directory', icon: 'pi pi-eye', command: () => this.viewFilePath(fileId) }
    ]
    contextMenu.show(event); // Show context menu
    event.preventDefault(); // Prevent default right-click
  }

  // File Actions on chat window
  viewFilePath(id) {
    this.router.navigate([`/apps/chat/fmanager`], {
      queryParams: { "file": id }
    });
  }

  downloadFile(fileId) {
    //this.fileManagerService.download_file(fileId).subscribe((response: any) => {
    //  const link = document.createElement('a');
    //  link.href = response.download_url;  // Pre-signed S3 URL
    //  link.target = '_blank';  // Open in a new tab
    //  link.download = "file.pdf";
    //  document.body.appendChild(link);
    //  link.click();
    //  document.body.removeChild(link);
    //});
  }

  viewOrDownloadFileFromUrl(download_url) {
    window.open(download_url, '_blank');
  }

  /******** Template Section ********/
  avaliable_templates = [];
  selectedTemplate = null;
  selected_platform = null;
  registeredPlatforms = [];

  newConversation() {
    this.loadRegisteredPlatforms();
    if (this.selectedConversation.contact.platform_name === 'whatsapp') {
      this.openConversationWhatsappVisible = true;
    }
    else if (this.selectedConversation.contact.platform_name === 'gmail') {
      this.resetNewGmailMessageObjects();
      this.openConversationGmailVisible = true;
    }
  }

  loadRegisteredPlatforms() {
    this.platforService.list_platforms_by_type(this.selectedConversation.contact.platform_name).pipe(takeUntil(this.destroy$)).subscribe(
      (data) => {
        this.registeredPlatforms = data;
        this.registeredPlatforms = this.registeredPlatforms.map(
          (_registeredPlatform) => {
            if (_registeredPlatform.platform_name === 'whatsapp') {
              _registeredPlatform.image_type = 'svg'
            }
            else if (['webchat', 'messenger', 'gmail', 'gmessages'].includes(_registeredPlatform.platform_name)) {
              _registeredPlatform.image_type = 'png'
            }
            return _registeredPlatform;
          }
        )
      },
      (err) => {
        console.error("Compose Message | Error getting platforms ", err);
      }
    );
  }

  onPlatformSelected() {
    this.avaliable_templates = [] // This would ensure to reset on platform gets changed
    if (this.selected_platform.id) {
      this.platforService.get_templates(this.selected_platform.id).pipe(takeUntil(this.destroy$)).subscribe(
        {
          next: (templates_list) => {
            // At this moment we support only whatsapp
            this.avaliable_templates = templates_list["whatsapp"];
          },
          error: () => console.error("Could not get templates")
        }
      )
    }
  }

  onSelectTemplate() {
    if (this.selectedTemplate) {
      this.addField();
    }
    else {
      this.selectedTemplate = undefined;
    }
    this.selectedTemplate = this.selectedTemplate;
  }

  dynamicFields: string[] = [];
  fieldValues: { [key: string]: string } = {};
  addField() {
    this.dynamicFields = [];
    this.fieldValues = {};
    let parameterVariables = [];
    for (let section of this.selectedTemplate.components) {
      parameterVariables.push(...this.extractParameterVariables(section.text))
    }
    if (parameterVariables) {
      for (let param of parameterVariables) {
        this.dynamicFields.push(param);
        this.fieldValues[param] = '';
      }
    }
  }

  extractParameterVariables(text: string): string[] {
    const regex = /{{(.*?)}}/g;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push(match[1].trim()); // Extract and trim the variable name
    }
    return matches;
  }

  isDocumentHeader(): boolean {
    return this.selectedTemplate?.components?.some(
      c => c.type === 'HEADER' && c.format === 'DOCUMENT'
    );
  }
  temaplteattachedFile: File | null = null;
  temapltepdfThumbnail: string | null = null;
  temapltepdfPreviewUrl: string | null = null;
  

  onTemplateFileSelected(event: Event): void {
  const fileInput = event.target as HTMLInputElement;

  if (fileInput.files && fileInput.files.length > 0) {
    const file = fileInput.files[0];

    if (file.type === 'application/pdf') {
      this.temaplteattachedFile = file;
      this.temapltepdfPreviewUrl = URL.createObjectURL(file); // ✅ Create preview URL for iframe
    } else {
      alert('Only PDF files are allowed.');
    }
  }
}

  onTemplateDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onTemplateDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files?.length) {
      const file = event.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        this.temaplteattachedFile = file;
        this.temapltepdfPreviewUrl = URL.createObjectURL(file); // ✅ Create preview URL for iframe
      } else {
        alert('Only PDF files are allowed.');
      }
    }
  }

  removeTemaplteFile(): void {
    this.temaplteattachedFile = null;
    this.temapltepdfThumbnail = null;
  }

  // Convert PDF to thumbnail using PDF.js (basic first-page render)
  generatePDFThumbnail(file: File): void {
  const reader = new FileReader();
  reader.onload = async () => {
    const pdfjsLib = await import('pdfjs-dist/build/pdf');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    //pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const loadingTask = pdfjsLib.getDocument({ data: reader.result });
    loadingTask.promise.then(async (pdf) => {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context!, viewport }).promise;
      this.temapltepdfThumbnail = canvas.toDataURL();
    });
  };
  reader.readAsArrayBuffer(file);
}


  get isFiledValuesValid() {
    return !Object.values(this.fieldValues).some(value => value === '');
  }



  /** ******* Chat Message Section ********** */
  onTemplatePreviewReadyEvent(event) {
      this.cdr.detectChanges();
  }


  messageText: string = '';
attachedFile: File | null = null;
previewUrl: string | ArrayBuffer | null = null;
isDragging: boolean = false;

onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    this.setAttachment(input.files[0]);
  }
}


onDragOver(event: DragEvent) {
  event.preventDefault();
  this.isDragging = true;
}

onDragLeave(event: DragEvent) {
  // Optional: check if the mouse actually left the window
  this.isDragging = false;
}

onFileDrop(event: DragEvent) {
  event.preventDefault();
  this.isDragging = false;

  if (event.dataTransfer?.files.length) {
    this.setAttachment(event.dataTransfer.files[0]);
  }
}


setAttachment(file: File) {
  this.attachedFile = file;

  if (this.isImage(file)) {
    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result;
    };
    reader.readAsDataURL(file);
  } else {
    this.previewUrl = null;
  }
}

formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024,
        sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'],
        i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

isImage(file: File): boolean {
  return file.type.startsWith('image/');
}

resetFileInput(event: Event) {
  const input = event.target as HTMLInputElement;
  input.value = ''; // This happens BEFORE the user selects a file
}

removeAttachment() {
  this.attachedFile = null;
  this.previewUrl = null;
  // Do not clear messageText, as user might keep it
}

sendMessage() {
  if (!this.messageText && !this.attachedFile) return;

  let messagePayload = null;

  if (this.attachedFile) {
  messagePayload = {
          conversation_id: this.selectedConversation.id,
          message_body: this.messageText || '',
          file: this.attachedFile,
          user_id: this.profile.user.id,
          message_type: 'media'
        };
      }
    else {
      messagePayload = {
        conversation_id: this.selectedConversation.id,
        message_body: this.messageText,
        user_id: this.profile.user.id,
        message_type: 'text',
        file: null
      };
    }

    

  this.selectedConversation.messages.push({
        message_body: messagePayload.message_body,
        message_type: messagePayload.message_type,
        sender: this.profile.user.id,
        sent_time: new Date(),
        status: 'unknown',
        type: 'org'
      });

      this.conversationService.respond_to_message(
        "chat",
        messagePayload.conversation_id,
        messagePayload
      ).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.reloadActiveConversation();
          this.resetInput()
        },
        error: (err) => {
          console.error("Message failed", err);
          this.reloadActiveConversation();
        }
      })
  
}







    

    
resetInput() {
  this.messageText = '';
  this.attachedFile = null;
  this.previewUrl = null;
}

onChangeInSelectedConversationObjectFromChildren() {
  this.reloadActiveConversation();
}

private reloadActiveConversation(): void {
    this.conversationService.list_conversation_from_id("chat", this.selectedConversation.id)
    .pipe(takeUntil(this.destroy$))
      .subscribe(conv => {
        this._selectedConversation = conv;
        this.scrollToBottom();
        this.messageSentEvent.emit(this.selectedConversation)
      });
    this.refreshUnrespondedConversationNotifications();
  }

  

  refreshUnrespondedConversationNotifications() {
    this.conversationService.list_notification("chat")
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (notificationData: ConversationNotificationTemplate) => {
        this.layoutService.unrespondedConversationNotification.update((prev) => notificationData)
      },
      error: (err) => { console.error(`Could not get the conversation notifications ${err}`) }
    });
  }

  @ViewChild('scrollMe') private myScrollContainer: ElementRef;
  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight + 50;
    } catch (err) { }
  }


  /** Edit user details */
  selectedContact: ContactModel;
  editContacDialogVisible = false;
  submitted = false;

  

  //saveContactInConversationObject() {
  //this.submitted = true;
  //// Clone to separate standard & custom fields
  //const payload = { ...this.selectedContact };
  //// Extract custom fields if present
  //if (this.selectedContact.custom_fields) {
  //  payload['custom_fields'] = { ...this.selectedContact.custom_fields };
  //}
  //this.contactService.update_contact(payload)
  //  .pipe(takeUntil(this.destroy$))
  //  .subscribe(
  //    (data) => {
  //      this.selectedConversation.contact = data;
  //      this.selectedContact = this.selectedConversation.contact;
  //      this.editContacDialogVisible = false;
  //      this.submitted = false;
  //      this.onChangeInSelectedConversationObjectFromChildren();
  //    },
  //    (err) => {
  //      console.error("Contacts | Error updating contact ", err);
  //      this.editContacDialogVisible = false;
  //      this.submitted = false;
  //      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Contact not updated', sticky: true });
  //    }
  //  );
  //}
    
    // ✅ CC Management
    customerCCRecipients: string[] = [];  // Read-only from customer
    agentCCRecipients: string[] = [];     // Editable by agent
    newAgentCCEmail: string = '';
    
    // Original CC for reset
    private originalAgentCC: string[] = [];

    onEdit() {
        this.selectedContact = { ...this.selectedConversation.contact };
        
        // Reset CC to current values
        this.customerCCRecipients = [...(this.selectedConversation.customer_cc_recipients || [])];
        this.agentCCRecipients = [...(this.selectedConversation.agent_cc_recipients || [])];
        this.originalAgentCC = [...this.agentCCRecipients];
        this.newAgentCCEmail = '';
        
        this.editContacDialogVisible = true;
        this.submitted = false;
    }

    // ✅ Agent CC Management
    addAgentCC() {
        if (!this.isValidEmail(this.newAgentCCEmail)) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Invalid Email',
                detail: 'Please enter a valid email address'
            });
            return;
        }

        const email = this.newAgentCCEmail.trim().toLowerCase();
        
        // Check if already in agent's list
        if (this.agentCCRecipients.some(cc => cc.toLowerCase() === email)) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Duplicate',
                detail: 'This email is already in your CC list'
            });
            return;
        }
        
        // Check if already in customer's list
        if (this.customerCCRecipients.some(cc => cc.toLowerCase() === email)) {
            this.messageService.add({
                severity: 'info',
                summary: 'Already Included',
                detail: 'This email is already in customer\'s CC list'
            });
            return;
        }
        
        this.agentCCRecipients.push(this.newAgentCCEmail.trim());
        this.newAgentCCEmail = '';
        
        this.messageService.add({
            severity: 'success',
            summary: 'Added',
            detail: 'CC recipient added successfully'
        });
    }

    removeAgentCC(index: number) {
        const removed = this.agentCCRecipients.splice(index, 1);
        this.messageService.add({
            severity: 'info',
            summary: 'Removed',
            detail: `${removed[0]} removed from your CC list`
        });
    }

    isValidEmail(email: string): boolean {
        if (!email) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    }

    getMergedCCList(): string[] {
        const merged = [...this.customerCCRecipients];
        
        // Add agent's CC that aren't duplicates
        for (const email of this.agentCCRecipients) {
            const emailLower = email.toLowerCase();
            if (!merged.some(cc => cc.toLowerCase() === emailLower)) {
                merged.push(email);
            }
        }
        
        return merged;
    }

    getChipStyle(email: string): any {
        const emailLower = email.toLowerCase();
        
        if (this.customerCCRecipients.some(cc => cc.toLowerCase() === emailLower)) {
            return {
                'background-color': '#D1FAE5',
                'color': '#065F46'
            };
        } else {
            return {
                'background-color': '#DBEAFE',
                'color': '#1E40AF'
            };
        }
    }

    cancelEdit() {
        this.editContacDialogVisible = false;
        this.newAgentCCEmail = '';
        this.submitted = false;
        
        // Reset to original values
        this.customerCCRecipients = [...(this.selectedConversation.customer_cc_recipients || [])];
        this.agentCCRecipients = [...this.originalAgentCC];
    }

    // ✅ MODIFIED: Save contact AND CC separately
    saveContactInConversationObject() {
        this.submitted = true;

        // Validate
        if (!this.selectedContact.name || !this.selectedContact.phone) {
            return;
        }

        // 1️⃣ First, save contact information
        const contactPayload = { ...this.selectedContact };
        
        // Extract custom fields if present
        if (this.selectedContact.custom_fields) {
            contactPayload['custom_fields'] = { ...this.selectedContact.custom_fields };
        }

        this.contactService.update_contact(contactPayload)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (updatedContact) => {
                    // Update contact in conversation
                    this.selectedConversation.contact = updatedContact;
                    this.selectedContact = this.selectedConversation.contact;
                    
                    // 2️⃣ Then, save CC recipients if changed (only for Gmail)
                    if (this.selectedConversation.contact.platform_name === 'gmail' && 
                        this.hasAgentCCChanged()) {
                        this.saveAgentCC();
                    } else {
                        // No CC changes, just close dialog
                        this.completeEdit();
                    }
                },
                error: (err) => {
                    console.error("Error updating contact:", err);
                    this.editContacDialogVisible = false;
                    this.submitted = false;
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Contact not updated',
                        sticky: true
                    });
                }
            });
    }

    // ✅ NEW: Check if agent CC changed
    private hasAgentCCChanged(): boolean {
        if (this.agentCCRecipients.length !== this.originalAgentCC.length) {
            return true;
        }
        
        // Check if all emails match (case-insensitive)
        const currentSet = new Set(this.agentCCRecipients.map(cc => cc.toLowerCase()));
        const originalSet = new Set(this.originalAgentCC.map(cc => cc.toLowerCase()));
        
        if (currentSet.size !== originalSet.size) {
            return true;
        }
        
        for (const email of currentSet) {
            if (!originalSet.has(email)) {
                return true;
            }
        }
        
        return false;
    }

    // ✅ NEW: Save agent CC separately
    private saveAgentCC() {
        const ccPayload = {
            conversation_id: this.selectedConversation.id,
            agent_cc_recipients: this.agentCCRecipients
        };

        this.conversationService.updateConversationCC(ccPayload)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    // Update conversation with new CC
                    this.selectedConversation.agent_cc_recipients = this.agentCCRecipients;
                    this.originalAgentCC = [...this.agentCCRecipients];
                    
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Contact and CC recipients updated successfully'
                    });
                    
                    this.completeEdit();
                },
                error: (err) => {
                    console.error("Error updating CC recipients:", err);
                    
                    // Contact was saved, but CC failed
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Partial Success',
                        detail: 'Contact updated, but CC recipients failed to save'
                    });
                    
                    this.completeEdit();
                }
            });
    }

    // ✅ NEW: Complete edit and emit changes
    private completeEdit() {
        this.editContacDialogVisible = false;
        this.submitted = false;
    }

    // ============================================================================
    // STEP 1: Add New Properties to DetailChatWindowComponent
    // ============================================================================
    
    // Template messaging in active conversation
    sendTemplateDialogVisible = false;
    activeConvSelectedTemplate = null;
    activeConvDynamicFields: string[] = [];
    activeConvFieldValues: { [key: string]: string } = {};
    activeConvAttachedFile: File | null = null;
    activeConvPdfPreviewUrl: string | null = null;

    // ============================================================================
    // STEP 2: Add Method to Open Template Dialog for Active Conversation
    // ============================================================================
    
    openSendTemplateDialog() {
      // Load available templates for the current platform
      if (this.selectedConversation?.contact?.platform_id) {
        this.platforService.get_templates(this.selectedConversation.contact.platform_id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (templates_list) => {
              this.avaliable_templates = templates_list["whatsapp"] || [];
              this.sendTemplateDialogVisible = true;
            },
            error: (err) => {
              let error_detail = err?.error;
              console.error("Could not get templates", error_detail);
              
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: `Could not load templates ${error_detail}`
              });
            }
          });
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'No Platform',
          detail: 'Platform information not available'
        });
      }
    }

    // ============================================================================
    // STEP 3: Handle Template Selection for Active Conversation
    // ============================================================================
    
    onActiveConvTemplateSelect() {
      if (this.activeConvSelectedTemplate) {
        this.extractActiveConvTemplateFields();
      } else {
        this.clearActiveConvTemplateData();
      }
    }

    extractActiveConvTemplateFields() {
      this.activeConvDynamicFields = [];
      this.activeConvFieldValues = {};
      let parameterVariables = [];
      
      for (let section of this.activeConvSelectedTemplate.components) {
        if (section.text) {
          parameterVariables.push(...this.extractParameterVariables(section.text));
        }
      }
      
      if (parameterVariables.length > 0) {
        for (let param of parameterVariables) {
          this.activeConvDynamicFields.push(param);
          this.activeConvFieldValues[param] = '';
        }
      }
    }

    // ============================================================================
    // STEP 4: Handle File Upload for Active Conversation Template
    // ============================================================================
    
    onActiveConvFileSelected(event: Event): void {
      const fileInput = event.target as HTMLInputElement;
    
      if (fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];
    
        if (file.type === 'application/pdf') {
          this.activeConvAttachedFile = file;
          this.activeConvPdfPreviewUrl = URL.createObjectURL(file);
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Invalid File',
            detail: 'Only PDF files are allowed for document templates'
          });
        }
      }
    }

    onActiveConvDragOver(event: DragEvent): void {
      event.preventDefault();
      event.stopPropagation();
    }

    onActiveConvDrop(event: DragEvent): void {
      event.preventDefault();
      if (event.dataTransfer?.files?.length) {
        const file = event.dataTransfer.files[0];
        if (file.type === 'application/pdf') {
          this.activeConvAttachedFile = file;
          this.activeConvPdfPreviewUrl = URL.createObjectURL(file);
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Invalid File',
            detail: 'Only PDF files are allowed'
          });
        }
      }
    }

    removeActiveConvFile(): void {
      this.activeConvAttachedFile = null;
      this.activeConvPdfPreviewUrl = null;
    }

    // ============================================================================
    // STEP 5: Check if Template has Document Header
    // ============================================================================
    
    isActiveConvDocumentHeader(): boolean {
      return this.activeConvSelectedTemplate?.components?.some(
        c => c.type === 'HEADER' && c.format === 'DOCUMENT'
      );
    }

    // ============================================================================
    // STEP 6: Validate Active Conversation Template Form
    // ============================================================================
    
    get isActiveConvTemplateValid(): boolean {
      // Check if template is selected
      if (!this.activeConvSelectedTemplate) return false;
      
      // Check if all dynamic fields are filled
      const allFieldsFilled = !Object.values(this.activeConvFieldValues)
        .some(value => value === '');
      
      // Check if document header requires file
      if (this.isActiveConvDocumentHeader() && !this.activeConvAttachedFile) {
        return false;
      }
      
      return allFieldsFilled;
    }

     // ============================================================================
     // STEP 7: Send Template Message in Active Conversation
     // ============================================================================
     
     sendTemplateMessageInActiveConversation() {
       if (!this.isActiveConvTemplateValid) {
         this.messageService.add({
           severity: 'warn',
           summary: 'Incomplete',
           detail: 'Please fill all required fields'
         });
         return;
       }
     
       const messagePayload = new FormData();
       messagePayload.append("conversation_id", this.selectedConversation.id);
       messagePayload.append("user_id", this.profile.user.id);
       messagePayload.append("message_type", "template");
       messagePayload.append("template", JSON.stringify(this.activeConvSelectedTemplate));
       messagePayload.append("template_parameters", JSON.stringify(this.activeConvFieldValues));
       
       if (this.activeConvAttachedFile) {
         messagePayload.append('file', this.activeConvAttachedFile);
       }
     
       // Add optimistic message to UI
       this.selectedConversation.messages.push({
         message_body: '',
         message_type: 'template',
         template: this.activeConvSelectedTemplate,
         media_url: this.activeConvPdfPreviewUrl,
         sender: this.profile.user.id,
         sent_time: new Date(),
         status: 'sending',
         type: 'org'
       });
     
       this.conversationService.respond_to_message(
         "chat",
         this.selectedConversation.id,
         messagePayload
       ).pipe(takeUntil(this.destroy$)).subscribe({
         next: (response) => {
           this.messageService.add({
             severity: 'success',
             summary: 'Success',
             detail: 'Template message sent successfully'
           });
           this.closeSendTemplateDialog();
           this.reloadActiveConversation();
         },
         error: (err) => {
           console.error("Template message failed", err);
           this.messageService.add({
             severity: 'error',
             summary: 'Failed',
             detail: 'Could not send template message'
           });
           this.reloadActiveConversation();
         }
       });
     }
     
     // ============================================================================
     // STEP 8: Clear and Close Template Dialog
     // ============================================================================
     
     clearActiveConvTemplateData() {
       this.activeConvSelectedTemplate = null;
       this.activeConvDynamicFields = [];
       this.activeConvFieldValues = {};
       this.activeConvAttachedFile = null;
       this.activeConvPdfPreviewUrl = null;
     }
     
    closeSendTemplateDialog() {
      this.sendTemplateDialogVisible = false;
      this.clearActiveConvTemplateData();
    }

}