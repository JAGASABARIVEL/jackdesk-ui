// ============================================================================
// WEB details page TS
// ============================================================================


import { CommonModule } from '@angular/common';
import { 
  AfterViewInit, 
  ChangeDetectorRef, 
  Component, 
  ElementRef, 
  EventEmitter, 
  Input, 
  OnDestroy,
  Output, 
  ViewChild 
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, take, takeUntil } from 'rxjs';

// PrimeNG Imports
import { AvatarModule } from 'primeng/avatar';
import { SidebarModule } from 'primeng/sidebar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ContextMenuModule } from 'primeng/contextmenu';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TextareaModule } from 'primeng/textarea';
import { FileUploadModule } from 'primeng/fileupload';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { BadgeModule } from 'primeng/badge';
import { MessageModule } from 'primeng/message';
import { PanelModule } from 'primeng/panel';
import { MenuModule } from 'primeng/menu';
import { DividerModule } from 'primeng/divider';
import { ConfirmationService, MessageService, MenuItem } from 'primeng/api';

// Services (imports remain the same as original)
import { PlatformManagerService } from '../../../../shared/services/platform-manager.service';
import { ChatManagerService } from '../../../../shared/services/chat-manager.service';
import { ContactManagerService } from '../../../../shared/services/contact-manager.service';
import { UserManagerService } from '../../../../shared/services/user-manager.service';
import { LayoutService } from '../../../../layout/service/app.layout.service';

// Components & Pipes
import { AdditionalDetailChatWindowComponent } from '../additional-detail-chat-window/additional-detail-chat-window.component';
import { MessagePreviewComponent } from '../../../campaign/message-preview/message-preview.component';
import { SafeUrlPipe } from '../../../../shared/pipes/safe-url.pipe';
import { ContactModel } from '../../../contacts/contact/contacts.model';

// Types
interface ConversationStatus {
  isNew: boolean;
  isOrgNew: boolean;
  isActive: boolean;
  isClosed: boolean;
  isZombie: boolean;
  isAssignedToMe: boolean;
  isAssignedToOther: boolean;
  canStartConversation: boolean;
  canSendMessage: boolean;
  canSendTemplate: boolean;
}

interface MediaAttachment {
  url: string;
  filename: string;
  type: string;
  size?: number;
}

@Component({
  selector: 'app-detail-chat-window',
  standalone: true,
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
    FileUploadModule,
    CheckboxModule,
    ChipModule,
    BadgeModule,
    MessageModule,
    PanelModule,
    MenuModule,
    DividerModule,
    SafeUrlPipe,
    AdditionalDetailChatWindowComponent,
    MessagePreviewComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './detail-chat-window.component.html',
  styleUrl: './detail-chat-window.component.scss'
})
export class DetailChatWindowComponent implements AfterViewInit, OnDestroy {
  
  
  // ============================================================================
  // OUTPUTS & VIEW CHILDREN
  // ============================================================================
  
  @Output() chatDetailsPageLoaded = new EventEmitter<boolean>();
  @Output() conversationClosedEvent = new EventEmitter<any>();
  @Output() messageSentEvent = new EventEmitter<any>();
  @Output() ownThisConversationEvent = new EventEmitter<any>();
  @Output() reassignThisConversationEvent = new EventEmitter<any>();
  
  @ViewChild('scrollMe') private myScrollContainer: ElementRef;
  @ViewChild('menu') menu: any;
  @ViewChild('messageInput') messageInputRef: ElementRef<HTMLTextAreaElement>;
  @ViewChild('captionTextarea') captionTextareaRef: ElementRef<HTMLTextAreaElement>;
  
  // ============================================================================
  // STATE PROPERTIES
  // ============================================================================
  
  private _selectedConversation: any;
  private _profile: any;
  private destroy$ = new Subject<void>();
  
  conversationStatus: ConversationStatus = this.getDefaultStatus();
  
  selectedContact: ContactModel;
  users: any[] = [];
  _employees: any[] = [];
  contextMenuItems: MenuItem[] = [];
  menuItems: MenuItem[] = [];
  
  // UI State
  chatdetaildrawerVisible = false;
  showInternalNotes = false;
  editContactDialogVisible = false;
  submitted = false;
  
  // 🆕 PDF Password Dialog
  pdfPasswordDialogVisible = false;
  currentPdfUrl: string = '';
  pdfPassword: string = '';
  pdfPasswordError: string = '';
  
  // 🆕 File Preview Dialog
  filePreviewDialogVisible = false;
  previewFileUrl: string = '';
  previewFileName: string = '';
  previewFileType: string = '';

  // Input state
  textareaHeight: number = 42; // Initial height in pixels
  showFormattingHint: boolean = false;
  private inputFocusTimeout: any;
  
  // ============================================================================
  // MESSAGE INPUT STATE
  // ============================================================================
  
  messageText: string = '';
  attachedFile: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;
  isDragging: boolean = false;
  
  // ============================================================================
  // TEMPLATE STATE (keeping existing code)
  // ============================================================================
  
  avaliable_templates: any[] = [];
  selectedTemplate: any = null;
  selected_platform: any = null;
  registeredPlatforms: any[] = [];
  
  dynamicFields: string[] = [];
  fieldValues: { [key: string]: string } = {};
  templateAttachedFile: File | null = null;
  templateMediaPreviewUrl: string | null = null;
  // Location data for LOCATION header type
templateLocationData: {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
} = { name: '', address: '', latitude: '', longitude: '' };
  
  sendTemplateDialogVisible = false;
  activeConvSelectedTemplate: any = null;
  activeConvDynamicFields: string[] = [];
  activeConvFieldValues: { [key: string]: string } = {};
  activeConvAttachedFile: File | null = null;
  activeConvMediaPreviewUrl: string | null = null;   // replaces activeConvPdfPreviewUrl
  activeConvLocationData: {
  name: string; address: string; latitude: string; longitude: string;
} = { name: '', address: '', latitude: '', longitude: '' };
  
  // ============================================================================
  // NEW CONVERSATION STATE (keeping existing code)
  // ============================================================================
  
  openConversationWhatsappVisible = false;
  openConversationGmailVisible = false;
  newConversationGmailAttachment: File | null = null;
  newConversationGmailMessageBody: string = '';
  newConversationSubjectForGmail: string = 'Enquiry request';
  newConversationGmailCC: string[] = [];
  newConversationGmailCCInput: string = '';
  
  // ============================================================================
  // REASSIGNMENT & CLOSE STATE (keeping existing code)
  // ============================================================================
  
  isAssignmentDropdownVisible = false;
  selectedUserForAssignment: any = null;
  closeConversationVisible = false;
  closeSubmitted = false;
  closedReason = '';
  blockForm = {
    platform: null,
    contact_value: '',
    contact_type: '',
    reason: '',
    should_block: false
  };
  
  // ============================================================================
  // CC MANAGEMENT (keeping existing code)
  // ============================================================================
  
  customerCCRecipients: string[] = [];
  agentCCRecipients: string[] = [];
  newAgentCCEmail: string = '';
  private originalAgentCC: string[] = [];

  // ================
  // Calls management
  // ================
  /** Passed down from chat-window — reflects the current call state globally */
  @Input() activeCallStatus: 'ringing' | 'connecting' | 'active' | 'ended' | null = null;

  @Input() activeCallIsTransfer: any = null;
   
  /**
   * The phone number that has granted call permission.
   * If it matches this conversation's contact phone, enable the call button.
   * Passed down from chat-window which receives the 'permission_reply' event.
   */
  @Input() callPermissionGrantedFor: string | null = null;
  /** Fires when agent clicks "Request Permission" — chat-window makes the API call */
  @Output() requestCallPermissionEvent = new EventEmitter<{ phoneNumberId: string; to: string }>();
   
  /** Fires when agent clicks "Call" — chat-window makes the API call + owns state */
  @Output() initiateCallEvent = new EventEmitter<{ platform_id: string; to: string }>();
  @Output() transferCallEvent = new EventEmitter<{ targetUserId: number }>();
  @Output() callPermissionRestoredEvent = new EventEmitter<string>(); 

  isNoteMode     = false;
  taggedEmployee : any = null;
 
  
  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================
  
  constructor(
    private cdr: ChangeDetectorRef,
    private router: Router,
    private sanitizer: DomSanitizer,
    private messageService: MessageService,
    private contactService: ContactManagerService,
    private layoutService: LayoutService,
    private platformService: PlatformManagerService,
    private conversationService: ChatManagerService,
    private userManagerService: UserManagerService
  ) {}
  
  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================
  
  ngAfterViewInit(): void {
    this.scrollToBottom();
    this.chatDetailsPageLoaded.emit(true);
    this.setupPasteListener();

    if (this.messageInputRef?.nativeElement) {
    this.adjustTextareaHeight(this.messageInputRef.nativeElement);
  }
  }

  
  
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.removePasteListener();
    clearTimeout(this.inputFocusTimeout);
  }
  
  // ============================================================================
  // 🆕 EXCEL PASTE SUPPORT
  // ============================================================================
  
  private pasteListener: ((e: ClipboardEvent) => void) | null = null;
  
  private setupPasteListener(): void {
    this.pasteListener = (e: ClipboardEvent) => this.handlePaste(e);
    document.addEventListener('paste', this.pasteListener);
  }
  
  private removePasteListener(): void {
    if (this.pasteListener) {
      document.removeEventListener('paste', this.pasteListener);
    }
  }
  
  private handlePaste(event: ClipboardEvent): void {
    // Only process if focused on message input
    const target = event.target as HTMLElement;
    if (!target || !target.closest('.message-input-container')) {
      console.warn("Target is none while pasting", target)
      return
    }
    
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;
    
    // Check for Excel/table data
    const htmlData = clipboardData.getData('text/html');
    const plainText = clipboardData.getData('text/plain');
    
    if (htmlData && (htmlData.includes('<table') || htmlData.includes('SourceURL:file:///.*\.xlsx'))) {
      event.preventDefault();
      this.processExcelPaste(htmlData, plainText);
    }
  }
  
  private processExcelPaste(htmlData: string, plainText: string): void {
    try {
      // Parse HTML table
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlData, 'text/html');
      const table = doc.querySelector('table');
      
      const text = table
      ? this.convertTableToFormattedText(table)
      : plainText;

    this.insertTextAtCursor(text);

    // 🔴 FORCE AUTOGROW AFTER DOCUMENT-PASTE
    setTimeout(() => {
      const textarea = this.messageInputRef?.nativeElement;
      if (textarea) {
        this.adjustTextareaHeight(textarea);
      }
    });
      
      this.messageService.add({
        severity: 'success',
        summary: 'Pasted',
        detail: 'Table data pasted with formatting'
      });
    } catch (error) {
      console.error('Paste processing error:', error);
      this.insertFormattedTextToInput(plainText);
    }
  }
  
  //private convertTableToFormattedText(table: HTMLTableElement): string {
  //  const rows: string[] = [];
  //  const tableRows = Array.from(table.querySelectorAll('tr'));
  //  
  //  tableRows.forEach(tr => {
  //    const cells = Array.from(tr.querySelectorAll('td, th'));
  //    const cellTexts = cells.map(cell => cell.textContent?.trim() || '');
  //    rows.push(cellTexts.join('\t')); // Use tabs to separate columns
  //  });
  //  
  //  return rows.join('\n');
  //}

  /**
 * Convert HTML table to tab-separated text
 */
private convertTableToFormattedText(table: HTMLTableElement): string {
  const rows: string[] = [];
  const tableRows = Array.from(table.querySelectorAll('tr'));
  
  tableRows.forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('td, th'));
    const cellTexts = cells.map(cell => {
      let text = cell.textContent?.trim() || '';
      
      // Handle merged cells
      const colspan = cell.getAttribute('colspan');
      if (colspan && parseInt(colspan) > 1) {
        text += '\t'.repeat(parseInt(colspan) - 1);
      }
      
      return text;
    });
    
    rows.push(cellTexts.join('\t'));
  });
  
  return rows.join('\n');
}
  
  private insertFormattedTextToInput(text: string): void {
    if (this.messageText) {
      this.messageText += '\n\n' + text;
    } else {
      this.messageText = text;
    }
  }
  
  // ============================================================================
  // 🆕 ATTACHMENT PREVIEW & DOWNLOAD
  // ============================================================================
  
  openFilePreview(url: string, filename: string, type: string): void {
    this.previewFileUrl = url;
    this.previewFileName = filename;
    this.previewFileType = type;
    
    // For PDFs, check if password protected
    if (type.includes('pdf')) {
      this.checkPdfPassword(url);
    } else {
      this.filePreviewDialogVisible = true;
    }
  }
  
  private checkPdfPassword(url: string): void {
    // Try loading PDF to check if password protected
    fetch(url)
      .then(response => response.arrayBuffer())
      .then(buffer => {
        // Simple check: look for encryption dictionary in PDF
        const uint8 = new Uint8Array(buffer);
        const text = new TextDecoder().decode(uint8.slice(0, 1024));
        
        if (text.includes('/Encrypt')) {
          // Likely password protected
          this.currentPdfUrl = url;
          this.pdfPassword = '';
          this.pdfPasswordError = '';
          this.pdfPasswordDialogVisible = true;
        } else {
          // Not password protected, show normally
          this.filePreviewDialogVisible = true;
        }
      })
      .catch(() => {
        // On error, try to show anyway
        this.filePreviewDialogVisible = true;
      });
  }
  
  submitPdfPassword(): void {
    if (!this.pdfPassword.trim()) {
      this.pdfPasswordError = 'Please enter a password';
      return;
    }
    
    // Close password dialog and show preview with password hint
    this.pdfPasswordDialogVisible = false;
    this.filePreviewDialogVisible = true;
    
    this.messageService.add({
      severity: 'info',
      summary: 'PDF Password',
      detail: 'Please enter the password in the PDF viewer when prompted'
    });
  }
  
  downloadFile(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.messageService.add({
      severity: 'success',
      summary: 'Download Started',
      detail: `Downloading ${filename}`
    });
  }
  
  closeFilePreview(): void {
    this.filePreviewDialogVisible = false;
    this.previewFileUrl = '';
    this.previewFileName = '';
    this.previewFileType = '';
  }
  
  closePdfPasswordDialog(): void {
    this.pdfPasswordDialogVisible = false;
    this.currentPdfUrl = '';
    this.pdfPassword = '';
    this.pdfPasswordError = '';
  }
  
  getFileIcon(type: string): string {
    if (type.includes('pdf')) return 'pi-file-pdf';
    if (type.includes('word') || type.includes('document')) return 'pi-file-word';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'pi-file-excel';
    if (type.includes('image')) return 'pi-image';
    if (type.includes('video')) return 'pi-video';
    if (type.includes('audio')) return 'pi-volume-up';
    if (type.includes('zip') || type.includes('compressed')) return 'pi-folder';
    return 'pi-file';
  }
  
  getFileColor(type: string): string {
    if (type.includes('pdf')) return '#DC2626';
    if (type.includes('word')) return '#2563EB';
    if (type.includes('excel')) return '#16A34A';
    if (type.includes('image')) return '#7C3AED';
    if (type.includes('video')) return '#EA580C';
    return '#6B7280';
  }
  
  // ============================================================================
  // INPUTS WITH SETTERS
  // ============================================================================
  
  @Input()
  set selectedConversation(value: any) {
    if (!value) {
      this._selectedConversation = null;
      this.conversationStatus = this.getDefaultStatus();
      return;
    }
    
    this._selectedConversation = value;
    this.selectedContact = value?.contact;
    this.conversationStatus = this.computeConversationStatus(value);
    this.convertToCommonDateTime();
    // Check persisted call permission for this contact
  if (value?.contact?.platform_id && value?.contact?.phone &&
      value?.contact?.platform_name === 'whatsapp') {
    this.checkPersistedCallPermission(
      value.contact.platform_id.toString(),
      value.contact.phone
    );
  }
    
    if (this._profile) {
      this.buildMenuItems();
    }
    
    this.scrollToBottom();
    this.loadUsers();
  }
  
  get selectedConversation(): any {
    return this._selectedConversation;
  }
  
  @Input()
  set profile(value: any) {
    this._profile = value;
    if (this._selectedConversation) {
      this.conversationStatus = this.computeConversationStatus(this._selectedConversation);
      this.buildMenuItems();
    }
  }
  
  get profile(): any {
    return this._profile;
  }
  
  @Input()
  set employees(value: any[]) {
    this._employees = value.map(emp => ({
      ...emp,
      color: this.getUniqueRandomColor()
    }));
  }

  get employees() {
    return this._employees;
  }
  
  @Input()
  set reassignmentProcessSuccess(value: boolean) {
    if (value === true && this._selectedConversation) {
      this.loadUsers();
    }
  }
  
  // ============================================================================
  // CONVERSATION STATUS COMPUTATION
  // ============================================================================
  
  private getDefaultStatus(): ConversationStatus {
    return {
      isNew: false,
      isOrgNew: false,
      isActive: false,
      isClosed: false,
      isZombie: false,
      isAssignedToMe: false,
      isAssignedToOther: false,
      canStartConversation: false,
      canSendMessage: false,
      canSendTemplate: false
    };
  }
  
  private computeConversationStatus(conversation: any): ConversationStatus {
    if (!conversation || !this._profile) {
      return this.getDefaultStatus();
    }
    
    const userId = this._profile.user?.id;
    const status = conversation.status;
    const assignedId = conversation.assigned?.id;
    const isContactOnly = conversation.id === -1;
    const platform = conversation.contact?.platform_name;
    
    const isNew = isContactOnly;
    const isOrgNew = status === 'org_new';
    const isActive = status === 'active';
    const isClosed = status === 'closed';
    const isZombie = status === 'zombie';
    const isAssignedToMe = assignedId === userId;
    const isAssignedToOther = assignedId && assignedId !== userId && assignedId >= 0;
    
    // Can start conversation if:
    // - It's a contact without conversation (id === -1)
    // - Or it's org_new (unassigned)
    // - Or it's Gmail (can always start new thread)
    const canStartConversation = isNew || isClosed || isOrgNew || platform === 'gmail';
    
    // Can send message if:
    // - Conversation is active AND assigned to current user AND not closed
    const canSendMessage = isActive && isAssignedToMe && !isClosed;
    
    // Can send template if:
    // - Can send message AND platform is WhatsApp
    const canSendTemplate = (isZombie && platform === 'whatsapp' && isAssignedToMe && !isClosed) || (canSendMessage && platform === 'whatsapp');
    
    return {
      isNew,
      isOrgNew,
      isActive,
      isClosed,
      isZombie,
      isAssignedToMe,
      isAssignedToOther,
      canStartConversation,
      canSendMessage,
      canSendTemplate
    };
  }

  /** True if the currently open conversation has an active/connecting call */
get isCallActive(): boolean {
  return this.activeCallStatus === 'active' || this.activeCallStatus === 'connecting';
}
 
/**
 * True if the current conversation's contact has granted call permission.
 * Used to enable/disable the "Call" button.
 */
get canInitiateCall(): boolean {
  const phone = this._selectedConversation?.contact?.phone;
  return !!phone && this.callPermissionGrantedFor === phone;
}
 
/** Emit up — chat-window handles the API call */
requestCallPermission(): void {
  const phone = this._selectedConversation?.contact?.phone;
  const pid   = this._selectedConversation?.contact?.platform_id?.toString();
  if (!phone || !pid) return;
  this.requestCallPermissionEvent.emit({ phoneNumberId: pid, to: phone });
}
 
/** Emit up — chat-window handles the API call and owns call state */
initiateOutboundCall(): void {
  const phone = this._selectedConversation?.contact?.phone;
  const pid   = this._selectedConversation?.contact?.platform_id?.toString();
  if (!phone || !pid) return;
  this.initiateCallEvent.emit({ platform_id: pid, to: phone });
}
  
  // ============================================================================
  // MENU BUILDING
  // ============================================================================
  
  buildMenuItems(): void {
    if (!this._selectedConversation || !this._profile) {
      this.menuItems = [];
      return;
    }
    
    const status = this.conversationStatus;
    const platform = this._selectedConversation.contact?.platform_name;
    
    this.menuItems = [];
    
    // Send Template (WhatsApp active conversations only)
    if (status.canSendTemplate) {
      this.menuItems.push({
        label: 'Send Template',
        icon: 'pi pi-file',
        command: () => this.openSendTemplateDialog()
      });
    }
    
    // Contact Info
    this.menuItems.push({
      label: 'Contact Info',
      icon: 'pi pi-info-circle',
      command: () => { this.chatdetaildrawerVisible = true; }
    });
    
    // Historical Conversations (not Gmail)
    if (platform !== 'gmail' && !status.isNew) {
      this.menuItems.push({
        label: 'View History',
        icon: 'pi pi-history',
        command: () => this.loadHistoricalConversation()
      });
    }
    
    // Separator
    if (!status.isClosed && !status.isNew) {
      this.menuItems.push({ separator: true });
    }
    
    // Reassign (if not org_new and not closed)
    if (!status.isOrgNew && !status.isClosed && !status.isNew) {
      this.menuItems.push({
        label: 'Reassign',
        icon: 'pi pi-user-edit',
        command: () => this.openReassignmentDialog()
      });
    }
    
    // Close Conversation (if assigned to me and active)
    if ((status.isZombie || status.isActive) && status.isAssignedToMe && !status.isClosed) {
      this.menuItems.push({
        label: 'Close',
        icon: 'pi pi-lock',
        command: () => this.closeConversation()
      });
    }
    
    // Start New Conversation (if needed)
    if (status.canStartConversation && !status.isActive) {
      this.menuItems.push({
        label: 'Start Conversation',
        icon: 'pi pi-comments',
        command: () => this.newConversation()
      });
    }
  }
  
  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================
  
  loadUsers(): void {
    if (!this._selectedConversation) {
      console.warn('Cannot load users: no conversation selected');
      return;
    }
    
    this.userManagerService.list_users()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const assignedId = this._selectedConversation?.assigned?.id;
          this.users = assignedId 
            ? data.filter(usr => usr.user !== assignedId)
            : data;
        },
        error: (err) => {
          console.error('Failed to load users:', err);
          this.users = [];
        }
      });
  }

  // Show zombie warning banner in template
  getZombieWarningMessage(): string | null {
    let warningMessage = "Unknown platform. Please engage engineering";
    switch(this.selectedConversation.contact.platform_name) {
      case 'whatsapp':
        warningMessage = "This conversation requires re-engagement. Please send a template message to continue.";
        break;
      case 'gmail':
        warningMessage = "This conversation needs gmail account to be active. Please ask admin to activate it.";
        break;
      default:
        break;
    }
    return warningMessage;
  }

  isMessageInputDisabled() {
    if (this.conversationStatus.isZombie) {
      return true;
    }
    if (this.conversationStatus.isZombie) {
    return true;
  }
    return false;
  }

  /**
 * Get badge configuration for conversation status
 */
getConversationStatusBadge(): {
  severity: 'success' | 'info' | 'warn' | 'danger' | 'secondary';
  label: string;
  icon: string;
  tooltip: string;
} {
  const badges = {
    'new': {
      severity: 'info' as const,
      label: 'New',
      icon: 'pi pi-inbox',
      tooltip: 'New unassigned conversation'
    },
    'active': {
      severity: 'success' as const,
      label: 'Active',
      icon: 'pi pi-check-circle',
      tooltip: 'Active conversation'
    },
    'zombie': {
      severity: 'warn' as const,
      label: this.selectedConversation.contact.platform_name === 'whatsapp'? 'Re-engagement Required':'Channel needs activation',
      icon: 'pi pi-exclamation-triangle',
      tooltip: 'This conversation requires a template message to continue'
    },
    'closed': {
      severity: 'secondary' as const,
      label: 'Closed',
      icon: 'pi pi-lock',
      tooltip: 'Conversation is closed'
    }
  };
  
  return badges[this.selectedConversation.status] || badges['new'];
}
  
  getEmployeeNameFromId(id: number): any {
    const employee = this.employees.find(emp => emp.user === id);
    return employee || { 
      details: { username: 'Unknown' }, 
      color: '#999999' 
    };
  }
  
  // ============================================================================
  // COLOR GENERATION
  // ============================================================================
  
  private usedColors = new Set<string>();
  
  private getRandomColor(): string {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }
  
  private getUniqueRandomColor(): string {
    let color;
    do {
      color = this.getRandomColor();
    } while (this.usedColors.has(color));
    this.usedColors.add(color);
    return color;
  }
  
  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================
  
  //sendMessage(): void {
  //  if (!this.messageText && !this.attachedFile) return;
  //  if (!this.conversationStatus.canSendMessage) {
  //    this.messageService.add({
  //      severity: 'warn',
  //      summary: 'Cannot Send',
  //      detail: 'You cannot send messages in this conversation state'
  //    });
  //    return;
  //  }
  //  
  //  const messagePayload: any = {
  //    conversation_id: this._selectedConversation.id,
  //    user_id: this._profile.user.id,
  //    message_type: this.attachedFile ? 'media' : 'text',
  //    message_body: this.messageText || ''
  //  };
  //  
  //  if (this.attachedFile) {
  //    messagePayload.file = this.attachedFile;
  //  }
  //  
  //  // Optimistic update
  //  this._selectedConversation.messages.push({
  //    message_body: messagePayload.message_body,
  //    message_type: messagePayload.message_type,
  //    sender: this._profile.user.id,
  //    sent_time: new Date(),
  //    status: 'sending',
  //    type: 'org'
  //  });
  //  
  //  this.conversationService.respond_to_message(
  //    'chat',
  //    messagePayload.conversation_id,
  //    messagePayload
  //  ).pipe(takeUntil(this.destroy$))
  //    .subscribe({
  //      next: () => {
  //        this.reloadActiveConversation();
  //        this.resetInput();
  //      },
  //      error: (err) => {
  //        console.error('Message failed:', err);
  //        this.messageService.add({
  //          severity: 'error',
  //          summary: 'Failed',
  //          detail: 'Could not send message'
  //        });
  //        this.reloadActiveConversation();
  //      }
  //    });
  //}

  sendMessage(): void {
  if (!this.messageText?.trim()) return;

  // ── Guard: internal notes bypass the zombie/canSend check ────────────
  const canSend = this.isNoteMode
    ? (this._selectedConversation?.id > 0)          // just need a real conversation
    : this.canSendCurrentMessage();

  if (!canSend) {
    if (this.conversationStatus.isZombie && !this.isNoteMode) {
      this.messageService.add({
        severity: 'error',
        summary : 'Cannot Send',
        detail  : 'Re-engagement required. Please send a template message first.',
        life    : 5000,
      });
    }
    return;
  }

  const payload: any = {
    conversation_id : this._selectedConversation.id,
    user_id         : this._profile.user.id,
    message_body    : this.messageText.trim(),
    message_type    : this.attachedFile ? 'media' : 'text',
    is_internal     : this.isNoteMode,            // ← key flag
  };

  if (this.isNoteMode && this.taggedEmployee) {
    payload.tagged_user_id  = this.taggedEmployee.user;
    payload.phone_number_id = this._selectedConversation?.contact?.platform_id?.toString();
    payload.customer_phone  = this._selectedConversation?.contact?.phone;
  }

  if (this.attachedFile) {
    payload.file = this.attachedFile;
  }

  // Optimistic update — show note with distinct style
  this._selectedConversation.messages.push({
    message_body : payload.message_body,
    message_type : payload.message_type,
    sender       : this._profile.user.id,
    sent_time    : new Date(),
    status       : 'sending',
    type         : 'org',
    is_internal  : this.isNoteMode,   // used by template to render yellow note bubble
  });

  this.conversationService.respond_to_message(
    'chat',
    payload.conversation_id,
    payload
  ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: any) => {
        if (response.conversation_status === 'zombie') {
          this._selectedConversation.status = 'zombie';
          this.conversationStatus = this.computeConversationStatus(this._selectedConversation);
          this.buildMenuItems();
          this.messageService.add({
            severity: 'error',
            summary : 'Re-engagement Required',
            detail  : 'Message failed. This conversation now requires a template message.',
            life    : 8000,
          });
        }
        this.reloadActiveConversation();
        this.resetInput();
        this.resetTextareaHeight();
      },
      error: (err) => {
        console.error('Message failed:', err);
        const errorBody = err.error || {};
        if (errorBody.requires_template || errorBody.conversation_status === 'zombie') {
          this._selectedConversation.status = 'zombie';
          this.conversationStatus = this.computeConversationStatus(this._selectedConversation);
          this.buildMenuItems();
          this.messageService.add({
            severity: 'error',
            summary : 'Re-engagement Required',
            detail  : errorBody.details || 'Please send a template message to continue.',
            life    : 8000,
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary : 'Failed',
            detail  : errorBody.details || 'Could not send message',
          });
        }
        this.reloadActiveConversation();
      }
    });
}
  
  resetInput(): void {
    this.messageText = '';
    this.attachedFile = null;
    this.previewUrl = null;
    this.isNoteMode    = false;
    this.taggedEmployee = null;
    this.resetTextareaHeight();
    
    // Focus back on input
    setTimeout(() => {
      this.messageInputRef?.nativeElement?.focus();
    }, 100);
  }
  
  // ============================================================================
  // FILE HANDLING
  // ============================================================================
  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.setAttachment(input.files[0]);
    }
  }
  
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }
  
  onDragLeave(event: DragEvent): void {
    this.isDragging = false;
  }
  
  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    
    if (event.dataTransfer?.files.length) {
      this.setAttachment(event.dataTransfer.files[0]);
    }
  }
  
  setAttachment(file: File): void {
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
  
  removeAttachment(): void {
    this.attachedFile = null;
    this.previewUrl = null;
  }
  
  isImage(file: File): boolean {
    return file.type.startsWith('image/');
  }
  
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
  
  resetFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = '';
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
  
  // ============================================================================
  // CONVERSATION ACTIONS
  // ============================================================================
  
  ownThisConversation(): void {
    if (!this._profile?.user?.id) return;
    
    this.conversationService.assign_conversation(
      'chat',
      this._selectedConversation.id,
      this._profile.user.id
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this._selectedConversation.assigned = {
            id: this._profile.user.id,
            name: this._profile.user.username
          };
          this._selectedConversation.status = 'active';
          this.conversationStatus = this.computeConversationStatus(this._selectedConversation);
          this.buildMenuItems();
          
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Conversation assigned to you'
          });
          
          this.ownThisConversationEvent.emit(this._selectedConversation);
        },
        error: (err) => {
          console.error('Failed to own conversation:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to assign conversation'
          });
        }
      });
  }
  
  openReassignmentDialog(): void {
    this.isAssignmentDropdownVisible = true;
  }
  
  assignTask(): void {
    if (!this.selectedUserForAssignment) return;
    
    this.conversationService.assign_conversation(
      'chat',
      this._selectedConversation.id,
      this.selectedUserForAssignment.user
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Assigned to ${this.selectedUserForAssignment.details.username}`
          });
          
          this.refreshUnrespondedConversationNotifications();
          this.cancelAssignment();
          
          this.reassignThisConversationEvent.emit({
            selected_conversation: this._selectedConversation,
            current_user_id: this._profile.user.id
          });
        },
        error: (err) => {
          console.error('Failed to reassign:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to reassign conversation'
          });
        }
      });
  }
  
  cancelAssignment(): void {
    this.isAssignmentDropdownVisible = false;
    this.selectedUserForAssignment = null;
  }
  
  closeConversation(): void {
    this.closeConversationVisible = true;
  }
  
  onClosedReasonSave(): void {
    this.closeSubmitted = true;
    this.conversationService.close_conversation(
      'chat',
      this._selectedConversation.id,
      {
        closed_by: this._profile.user.id,
        closed_reason: this.closedReason
      }
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.conversationClosedEvent.emit(this._selectedConversation);
          this.closeConversationVisible = false;
          this.closeSubmitted = false;
          
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Conversation closed'
          });
          
          if (this.blockForm.should_block) {
            this.submitBlockContact();
          }
        },
        error: (err) => {
          console.error('Failed to close conversation:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to close conversation'
          });
        }
      });
  }
  
  submitBlockContact(): void {
    this.platformService.list_platforms_by_type(
      this._selectedConversation.contact.platform_name
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (platforms: any[]) => {
          const payload = {
            contact_value: this._selectedConversation.contact.phone,
            contact_type: this._selectedConversation.contact.platform_name,
            reason: this.closedReason,
            platform_ids: platforms.map(p => p.id)
          };
          
          this.platformService.blockContactBulk(payload)
            .subscribe({
              next: () => {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Blocked',
                  detail: 'Contact blocked successfully'
                });
                this.blockForm = {
                  should_block: false,
                  platform: null,
                  contact_value: '',
                  contact_type: '',
                  reason: ''
                };
              },
              error: (err) => {
                console.error('Block contact failed:', err);
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'Failed to block contact'
                });
              }
            });
        },
        error: (err) => {
          console.error('Failed to get platforms:', err);
        }
      });
  }
  
  // ============================================================================
  // NEW CONVERSATION
  // ============================================================================
  
  newConversation(): void {
    this.loadRegisteredPlatforms();
    
    const platform = this._selectedConversation.contact?.platform_name;
    
    if (platform === 'whatsapp') {
      this.openConversationWhatsappVisible = true;
    } else if (platform === 'gmail') {
      this.resetNewGmailMessageObjects();
      this.openConversationGmailVisible = true;
    }
  }
  
  loadRegisteredPlatforms(): void {
    this.platformService.list_platforms_by_type(
      this._selectedConversation.contact.platform_name
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.registeredPlatforms = data.map(platform => ({
            ...platform,
            image_type: this.getPlatformImageType(platform.platform_name)
          }));
        },
        error: (err) => {
          console.error('Failed to load platforms:', err);
        }
      });
  }
  
  private getPlatformImageType(platformName: string): string {
    return platformName === 'whatsapp' ? 'svg' : 'png';
  }
  
  onPlatformSelected(): void {
    this.avaliable_templates = [];
    
    if (this.selected_platform?.id) {
      this.platformService.get_templates(this.selected_platform.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (templates) => {
            this.avaliable_templates = templates['whatsapp'] || [];
          },
          error: () => {
            console.error('Could not get templates');
          }
        });
    }
  }
  
  // WhatsApp Template Handling
  onSelectTemplate(): void {
    if (this.selectedTemplate) {
      this.addField();
    } else {
      this.dynamicFields = [];
      this.fieldValues = {};
    }
  }
  
  /**
 * Attempts to extract lat/lng from a Google Maps URL pasted by the user.
 * Handles formats like:
 *   https://maps.google.com/?q=12.9716,77.5946
 *   https://www.google.com/maps/@12.9716,77.5946,15z
 *   https://maps.app.goo.gl/... (short URLs — user must expand first)
 */
tryParseGoogleMapsUrl(): void {
  const raw = prompt('Paste a Google Maps URL:');
  if (!raw) return;

  // ?q=lat,lng
  let match = raw.match(/[?&]q=([-\d.]+),([-\d.]+)/);
  if (!match) {
    // /@lat,lng,zoom
    match = raw.match('\/@([-\\d.]+),([-\\d.]+)');
  }
  if (!match) {
    // ll=lat,lng
    match = raw.match(/[?&]ll=([-\d.]+),([-\d.]+)/);
  }

  if (match) {
    this.templateLocationData.latitude  = match[1];
    this.templateLocationData.longitude = match[2];
    this.messageService.add({
      severity: 'success',
      summary: 'Coordinates extracted',
      detail: `Lat ${match[1]}, Lng ${match[2]}`
    });
  } else {
    this.messageService.add({
      severity: 'warn',
      summary: 'Could not parse',
      detail: 'Try a full Google Maps URL with visible coordinates'
    });
  }
}

  addField(): void {
  this.dynamicFields = [];
  this.fieldValues = {};
  // Reset media from a prior template selection
  this.removeTemplateFile();
  this.resetTemplateLocation();

  const params: string[] = [];
  for (const section of this.selectedTemplate.components) {
    if (section.text) {
      params.push(...this.extractParameterVariables(section.text));
    }
  }
  params.forEach(param => {
    this.dynamicFields.push(param);
    this.fieldValues[param] = '';
  });
}
  
  extractParameterVariables(text: string): string[] {
    const regex = /{{(.*?)}}/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push(match[1].trim());
    }
    return matches;
  }
  
  /**
 * Returns the HEADER format of the currently selected template,
 * or null if no media header exists.
 */
getHeaderMediaType(): 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'LOCATION' | null {
  if (!this.selectedTemplate?.components) return null;
  const header = this.selectedTemplate.components.find(
    (c: any) => c.type === 'HEADER'
  );
  if (!header) return null;
  const fmt = header.format?.toUpperCase();
  if (['DOCUMENT', 'IMAGE', 'VIDEO', 'LOCATION'].includes(fmt)) return fmt;
  return null;
}

/** Kept for backward compatibility where called as boolean */
isDocumentHeader(): boolean {
  const t = this.getHeaderMediaType();
  return t === 'DOCUMENT' || t === 'IMAGE' || t === 'VIDEO';
}
  
  
  
  onTemplateFileSelected(event: Event): void {
  const fileInput = event.target as HTMLInputElement;
  if (!fileInput.files || fileInput.files.length === 0) return;
  const file = fileInput.files[0];
  this.applyTemplateFile(file);
}

private applyTemplateFile(file: File): void {
  const mediaType = this.getHeaderMediaType();

  const allowedByType: Record<string, string[]> = {
    DOCUMENT: ['application/pdf'],
    IMAGE:    ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    VIDEO:    ['video/mp4', 'video/webm', 'video/quicktime'],
  };

  const allowed = allowedByType[mediaType ?? ''] ?? [];

  if (allowed.length && !allowed.includes(file.type)) {
    const labels: Record<string, string> = {
      DOCUMENT: 'PDF files only',
      IMAGE: 'JPG, PNG, WEBP or GIF images only',
      VIDEO: 'MP4, WEBM or MOV videos only',
    };
    this.messageService.add({
      severity: 'warn',
      summary: 'Invalid File',
      detail: labels[mediaType ?? ''] ?? 'Unsupported file type'
    });
    return;
  }

  this.templateAttachedFile = file;
  this.templateMediaPreviewUrl = URL.createObjectURL(file);
}

onTemplateDrop(event: DragEvent): void {
  event.preventDefault();
  if (!event.dataTransfer?.files?.length) return;
  this.applyTemplateFile(event.dataTransfer.files[0]);
}
  
  onTemplateDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  // ============================================================================
// LOCATION HELPERS
// ============================================================================

get isLocationValid(): boolean {
  const loc = this.templateLocationData;
  const lat = parseFloat(loc.latitude);
  const lng = parseFloat(loc.longitude);
  return (
    !!loc.name.trim() &&
    !isNaN(lat) && lat >= -90  && lat <= 90 &&
    !isNaN(lng) && lng >= -180 && lng <= 180
  );
}

resetTemplateLocation(): void {
  this.templateLocationData = { name: '', address: '', latitude: '', longitude: '' };
}

// ============================================================================
// REPLACE isFieldValuesValid getter — also gates on location/media
// ============================================================================

//get isFieldValuesValid(): boolean {
//  const allFilled = !Object.values(this.fieldValues).some(v => v === '');
//  const mediaType = this.getHeaderMediaType();
//
//  if (mediaType === 'LOCATION') {
//    return allFilled && this.isLocationValid;
//  } else if (mediaType) {
//    return allFilled && !!this.templateAttachedFile;
//  }
//  return allFilled;
//}

get isFieldValuesValid(): boolean {
  // Trim every field — reject spaces-only entries
  const allFilled = Object.keys(this.fieldValues).length === 0
    ? true
    : !Object.values(this.fieldValues).some(v => !v || !v.trim());
 
  const mediaType = this.getHeaderMediaType();
 
  if (mediaType === 'LOCATION') {
    return allFilled && this.isLocationValid;
  }
  if (mediaType === 'IMAGE' || mediaType === 'VIDEO' || mediaType === 'DOCUMENT') {
    return allFilled && !!this.templateAttachedFile;
  }
  return allFilled;
}

  // ============================================================================
// CONTINUATION OF DetailChatWindowComponent
// ============================================================================
  
  removeTemplateFile(): void {
  this.templateAttachedFile = null;
  this.templateMediaPreviewUrl = null;
}
  
  startNewConversationOnWhatsapp(): void {
  this.openConversationWhatsappVisible = false;

  const payload = new FormData();
  payload.append('organization_id', this._profile.organization);
  payload.append('platform_id', this.selected_platform.id);
  payload.append('contact_id', this._selectedConversation.contact.id);
  payload.append('user_id', this._profile.user.id);
  payload.append('template', JSON.stringify(this.selectedTemplate));
  payload.append('template_parameters', JSON.stringify(this.fieldValues));
  const trimmedFieldVals: { [key: string]: string } = {};
  Object.entries(this.fieldValues).forEach(([key, val]) => {
    trimmedFieldVals[key] = val ? val.trim() : '';
  });
  payload.append('template_parameters', JSON.stringify(trimmedFieldVals));

  const mediaType = this.getHeaderMediaType();

  if (mediaType === 'LOCATION') {
    payload.append('location_data', JSON.stringify({
      name:      this.templateLocationData.name.trim(),
      address:   this.templateLocationData.address.trim(),
      latitude:  parseFloat(this.templateLocationData.latitude),
      longitude: parseFloat(this.templateLocationData.longitude),
    }));
  } else if (this.templateAttachedFile) {
    payload.append('file', this.templateAttachedFile);
  }

  this.conversationService.start_new_conversation('chat', payload)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data: any) => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Conversation started' });

        this._selectedConversation.assigned = {
          id: this._profile.user.id,
          name: this._profile.user.username
        };
        this._selectedConversation.status   = 'active';
        this._selectedConversation.id       = data.data[0]?.id;
        this._selectedConversation.messages = data.data[0]?.messages;
        this._selectedConversation.contact  = data.data[0]?.contact;

        // Reset media state
        this.removeTemplateFile();
        this.resetTemplateLocation();

        this.conversationStatus = this.computeConversationStatus(this._selectedConversation);
        this.buildMenuItems();
        this.ownThisConversationEvent.emit(this._selectedConversation);
      },
      error: (err) => {
        console.error('Failed to start conversation:', err);
        this.messageService.add({ severity: 'error', summary: 'Failed', detail: 'Could not start conversation' });
      }
    });
}
  
  // ============================================================================
  // GMAIL NEW CONVERSATION
  // ============================================================================
  
  resetNewGmailMessageObjects(): void {
    this.newConversationGmailAttachment = null;
    this.newConversationGmailMessageBody = '';
    this.newConversationSubjectForGmail = 'Enquiry request';
    this.newConversationGmailCC = [];
    this.newConversationGmailCCInput = '';
  }
  
  handleFileUploadGmail(event: any): void {
    const file = event.files?.[0];
    if (file) {
      this.newConversationGmailAttachment = file;
    }
  }
  
  addNewConversationCC(): void {
    const email = this.newConversationGmailCCInput.trim();
    
    if (!this.isValidEmail(email)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid',
        detail: 'Please enter valid email'
      });
      return;
    }
    
    const emailLower = email.toLowerCase();
    
    if (this._selectedConversation.contact.phone.toLowerCase() === emailLower) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Duplicate',
        detail: 'Same as recipient'
      });
      return;
    }
    
    if (this.newConversationGmailCC.some(cc => cc.toLowerCase() === emailLower)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Duplicate',
        detail: 'Already in CC list'
      });
      return;
    }
    
    this.newConversationGmailCC.push(email);
    this.newConversationGmailCCInput = '';
    
    this.messageService.add({
      severity: 'success',
      summary: 'Added',
      detail: 'CC recipient added'
    });
  }
  
  removeNewConversationCC(index: number): void {
    const removed = this.newConversationGmailCC.splice(index, 1);
    this.messageService.add({
      severity: 'info',
      summary: 'Removed',
      detail: `${removed[0]} removed`
    });
  }
  
  isNewConversationValid(): boolean {
    return !!(
      this.selected_platform &&
      this._selectedConversation.contact.phone &&
      this.isValidEmail(this._selectedConversation.contact.phone) &&
      this.newConversationSubjectForGmail &&
      this.newConversationGmailMessageBody
    );
  }
  
  cancelNewGmailConversation(): void {
    if (this.newConversationGmailMessageBody || this.newConversationGmailCC.length > 0) {
      if (confirm('Discard this email?')) {
        this.openConversationGmailVisible = false;
        this.resetNewGmailMessageObjects();
      }
    } else {
      this.openConversationGmailVisible = false;
      this.resetNewGmailMessageObjects();
    }
  }
  
  startNewConversationOnGmail(): void {
    this.openConversationGmailVisible = false;
    
    const payload = new FormData();
    payload.append('organization_id', this._profile.organization);
    payload.append('platform_id', this.selected_platform.id);
    payload.append('contact_id', this._selectedConversation.contact.id);
    payload.append('user_id', this._profile.user.id);
    payload.append('subject', this.newConversationSubjectForGmail);
    payload.append('message_body', this.newConversationGmailMessageBody);
    
    if (this.newConversationGmailCC.length > 0) {
      payload.append('cc_recipients', JSON.stringify(this.newConversationGmailCC));
    }
    
    if (this.newConversationGmailAttachment) {
      payload.append('file', this.newConversationGmailAttachment);
    }
    
    this.conversationService.start_new_conversation('chat', payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Email sent'
          });
          
          const newConv = {
            ...this._selectedConversation,
            assigned: { id: this._profile.user.id, name: this._profile.user.username },
            status: 'active',
            subject: this.newConversationSubjectForGmail,
            id: data.data[0]?.id,
            messages: data.data[0]?.messages
          };
          
          this.conversationStatus = this.computeConversationStatus(newConv);
          this.buildMenuItems();
          
          this.ownThisConversationEvent.emit(newConv);
        },
        error: (err) => {
          console.error('Failed to send email:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Failed',
            detail: 'Could not send email'
          });
        }
      });
  }
  
  // ============================================================================
  // TEMPLATE IN ACTIVE CONVERSATION
  // ============================================================================
  
  openSendTemplateDialog(): void {
    if (!this._selectedConversation?.contact?.platform_id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Platform',
        detail: 'Platform info unavailable'
      });
      return;
    }
    
    this.platformService.get_templates(this._selectedConversation.contact.platform_id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (templates) => {
          this.avaliable_templates = templates['whatsapp'] || [];
          this.sendTemplateDialogVisible = true;
        },
        error: (err) => {
          console.error('Failed to load templates:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Could not load templates'
          });
        }
      });
  }
  
  onActiveConvTemplateSelect(): void {
    if (this.activeConvSelectedTemplate) {
      this.extractActiveConvTemplateFields();
    } else {
      this.clearActiveConvTemplateData();
    }
  }
  
  extractActiveConvTemplateFields(): void {
  this.activeConvDynamicFields = [];
  this.activeConvFieldValues = {};
  // Reset media from prior selection
  this.removeActiveConvFile();
  this.activeConvLocationData = { name: '', address: '', latitude: '', longitude: '' };

  const params: string[] = [];
  for (const section of this.activeConvSelectedTemplate.components) {
    if (section.text) params.push(...this.extractParameterVariables(section.text));
  }
  params.forEach(param => {
    this.activeConvDynamicFields.push(param);
    this.activeConvFieldValues[param] = '';
  });
}

onActiveConvDragOver(event: DragEvent): void {
  event.preventDefault();
}
  
  getActiveConvHeaderMediaType(): 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'LOCATION' | null {
  if (!this.activeConvSelectedTemplate?.components) return null;
  const header = this.activeConvSelectedTemplate.components.find(
    (c: any) => c.type === 'HEADER'
  );
  if (!header) return null;
  const fmt = header.format?.toUpperCase();
  return (['DOCUMENT', 'IMAGE', 'VIDEO', 'LOCATION'].includes(fmt) ? fmt : null) as any;
}

isActiveConvDocumentHeader(): boolean {
  const t = this.getActiveConvHeaderMediaType();
  return t === 'DOCUMENT' || t === 'IMAGE' || t === 'VIDEO';
}


  
  get isActiveConvLocationValid(): boolean {
  const loc = this.activeConvLocationData;
  const lat = parseFloat(loc.latitude);
  const lng = parseFloat(loc.longitude);
  return !!loc.name.trim() &&
    !isNaN(lat) && lat >= -90 && lat <= 90 &&
    !isNaN(lng) && lng >= -180 && lng <= 180;
}

//get isActiveConvTemplateValid(): boolean {
//  if (!this.activeConvSelectedTemplate) return false;
//  const allFilled = !Object.values(this.activeConvFieldValues).some(v => v === '');
//  const mediaType = this.getActiveConvHeaderMediaType();
//  if (mediaType === 'LOCATION') return allFilled && this.isActiveConvLocationValid;
//  if (mediaType)                return allFilled && !!this.activeConvAttachedFile;
//  return allFilled;
//}

get isActiveConvTemplateValid(): boolean {
  if (!this.activeConvSelectedTemplate) return false;
 
  // Trim every field value — spaces-only must be treated as empty
  const allFilled = Object.keys(this.activeConvFieldValues).length === 0
    ? true
    : !Object.values(this.activeConvFieldValues).some(v => !v || !v.trim());
 
  const mediaType = this.getActiveConvHeaderMediaType();
 
  if (mediaType === 'LOCATION') {
    return allFilled && this.isActiveConvLocationValid;
  }
  if (mediaType === 'IMAGE' || mediaType === 'VIDEO' || mediaType === 'DOCUMENT') {
    return allFilled && !!this.activeConvAttachedFile;
  }
  return allFilled;
}
  
  // Replace onActiveConvFileSelected / onActiveConvDrop with the unified handler:
onActiveConvFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) this.applyActiveConvFile(input.files[0]);
}

onActiveConvDrop(event: DragEvent): void {
  event.preventDefault();
  if (event.dataTransfer?.files?.length) this.applyActiveConvFile(event.dataTransfer.files[0]);
}
  
  private applyActiveConvFile(file: File): void {
  const mediaType = this.getActiveConvHeaderMediaType();
  const allowed: Record<string, string[]> = {
    DOCUMENT: ['application/pdf'],
    IMAGE:    ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    VIDEO:    ['video/mp4', 'video/webm', 'video/quicktime'],
  };
  if (allowed[mediaType ?? '']?.length && !allowed[mediaType!].includes(file.type)) {
    this.messageService.add({ severity: 'warn', summary: 'Invalid File',
      detail: { DOCUMENT: 'PDF only', IMAGE: 'JPG/PNG/WEBP/GIF only', VIDEO: 'MP4/WEBM/MOV only' }[mediaType!] });
    return;
  }
  this.activeConvAttachedFile = file;
  this.activeConvMediaPreviewUrl = URL.createObjectURL(file);
}

  
  removeActiveConvFile(): void {
  this.activeConvAttachedFile = null;
  this.activeConvMediaPreviewUrl = null;
}
  
  //sendTemplateMessageInActiveConversation(): void {
  //  if (!this.isActiveConvTemplateValid) {
  //    this.messageService.add({
  //      severity: 'warn',
  //      summary: 'Incomplete',
  //      detail: 'Fill all required fields'
  //    });
  //    return;
  //  }
  //  
  //  let payload: any;
  //  
  //  if (this.activeConvAttachedFile) {
  //    payload = new FormData();
  //    payload.append('conversation_id', this._selectedConversation.id);
  //    payload.append('user_id', this._profile.user.id);
  //    payload.append('message_type', 'template');
  //    payload.append('template', JSON.stringify(this.activeConvSelectedTemplate));
  //    payload.append('template_parameters', JSON.stringify(this.activeConvFieldValues));
  //    payload.append('file', this.activeConvAttachedFile);
  //  } else {
  //    payload = {
  //      conversation_id: this._selectedConversation.id,
  //      user_id: this._profile.user.id,
  //      message_type: 'template',
  //      template: JSON.stringify(this.activeConvSelectedTemplate),
  //      template_parameters: JSON.stringify(this.activeConvFieldValues)
  //    };
  //  }
  //  
  //  // Optimistic update
  //  this._selectedConversation.messages.push({
  //    message_body: '',
  //    message_type: 'template',
  //    template: this.activeConvSelectedTemplate,
  //    media_url: this.activeConvPdfPreviewUrl,
  //    sender: this._profile.user.id,
  //    sent_time: new Date(),
  //    status: 'sending',
  //    type: 'org'
  //  });
  //  
  //  this.conversationService.respond_to_message(
  //    'chat',
  //    this._selectedConversation.id,
  //    payload
  //  ).pipe(takeUntil(this.destroy$))
  //    .subscribe({
  //      next: () => {
  //        this.messageService.add({
  //          severity: 'success',
  //          summary: 'Success',
  //          detail: 'Template sent'
  //        });
  //        this.closeSendTemplateDialog();
  //        this.reloadActiveConversation();
  //      },
  //      error: (err) => {
  //        console.error('Template failed:', err);
  //        this.messageService.add({
  //          severity: 'error',
  //          summary: 'Failed',
  //          detail: 'Could not send template'
  //        });
  //        this.reloadActiveConversation();
  //      }
  //    });
  //}

  sendTemplateMessageInActiveConversation(): void {
  if (!this.isActiveConvTemplateValid) {
    this.messageService.add({ severity: 'warn', summary: 'Incomplete', detail: 'Fill all required fields' });
    return;
  }

  // Always use FormData — it works for both JSON-only and file payloads,
  // and avoids the UTF-8 decode error caused by sending binary inside a JSON body.
  const payload = new FormData();
  payload.append('conversation_id', this._selectedConversation.id);
  payload.append('user_id', this._profile.user.id);
  payload.append('message_type', 'template');
  payload.append('template', JSON.stringify(this.activeConvSelectedTemplate));
  //payload.append('template_parameters', JSON.stringify(this.activeConvFieldValues));
  const trimmedFieldValues: { [key: string]: string } = {};
  Object.entries(this.activeConvFieldValues).forEach(([key, val]) => {
    trimmedFieldValues[key] = val ? val.trim() : '';
  });
  payload.append('template_parameters', JSON.stringify(trimmedFieldValues));

  const mediaType = this.getActiveConvHeaderMediaType();

  if (mediaType === 'LOCATION' && this.activeConvLocationData) {
    payload.append('location_data', JSON.stringify({
      name:      this.activeConvLocationData.name.trim(),
      address:   this.activeConvLocationData.address.trim(),
      latitude:  parseFloat(this.activeConvLocationData.latitude),
      longitude: parseFloat(this.activeConvLocationData.longitude),
    }));
  } else if (this.activeConvAttachedFile) {
    payload.append('file', this.activeConvAttachedFile);
  }

  // Optimistic update
  this._selectedConversation.messages.push({
    message_body: '',
    message_type: 'template',
    template: this.activeConvSelectedTemplate,
    media_url: this.activeConvMediaPreviewUrl ?? null,
    sender: this._profile.user.id,
    sent_time: new Date(),
    status: 'sending',
    type: 'org'
  });

  this.conversationService.respond_to_message('chat', this._selectedConversation.id, payload)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Template sent' });
        this.closeSendTemplateDialog();
        this.reloadActiveConversation();
      },
      error: (err) => {
        console.error('Template failed:', err);
        this.messageService.add({ severity: 'error', summary: 'Failed', detail: 'Could not send template' });
        this.reloadActiveConversation();
      }
    });
}
  
  clearActiveConvTemplateData(): void {
  this.activeConvSelectedTemplate = null;
  this.activeConvDynamicFields = [];
  this.activeConvFieldValues = {};
  this.activeConvAttachedFile = null;
  this.activeConvMediaPreviewUrl = null;
  this.activeConvLocationData = { name: '', address: '', latitude: '', longitude: '' };
}
  
  closeSendTemplateDialog(): void {
    this.sendTemplateDialogVisible = false;
    this.clearActiveConvTemplateData();
  }
  
  // ============================================================================
  // CONTACT EDITING & CC MANAGEMENT
  // ============================================================================
  
  onEdit(): void {
    this.selectedContact = { ...this._selectedConversation.contact };
    
    this.customerCCRecipients = [...(this._selectedConversation.customer_cc_recipients || [])];
    this.agentCCRecipients = [...(this._selectedConversation.agent_cc_recipients || [])];
    this.originalAgentCC = [...this.agentCCRecipients];
    this.newAgentCCEmail = '';
    
    this.editContactDialogVisible = true;
    this.submitted = false;
  }
  
  addAgentCC(): void {
    if (!this.isValidEmail(this.newAgentCCEmail)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid',
        detail: 'Enter valid email'
      });
      return;
    }
    
    const email = this.newAgentCCEmail.trim().toLowerCase();
    
    if (this.agentCCRecipients.some(cc => cc.toLowerCase() === email)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Duplicate',
        detail: 'Already in list'
      });
      return;
    }
    
    if (this.customerCCRecipients.some(cc => cc.toLowerCase() === email)) {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'Already in customer CC'
      });
      return;
    }
    
    this.agentCCRecipients.push(this.newAgentCCEmail.trim());
    this.newAgentCCEmail = '';
    
    this.messageService.add({
      severity: 'success',
      summary: 'Added',
      detail: 'CC added'
    });
  }
  
  removeAgentCC(index: number): void {
    const removed = this.agentCCRecipients.splice(index, 1);
    this.messageService.add({
      severity: 'info',
      summary: 'Removed',
      detail: `${removed[0]} removed`
    });
  }
  
  isValidEmail(email: string): boolean {
    if (!email) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.trim());
  }
  
  getMergedCCList(): string[] {
    const merged = [...this.customerCCRecipients];
    
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
    }
    return {
      'background-color': '#DBEAFE',
      'color': '#1E40AF'
    };
  }
  
  cancelEdit(): void {
    this.editContactDialogVisible = false;
    this.newAgentCCEmail = '';
    this.submitted = false;
    
    this.customerCCRecipients = [...(this._selectedConversation.customer_cc_recipients || [])];
    this.agentCCRecipients = [...this.originalAgentCC];
  }
  
  saveContactInConversationObject(): void {
    this.submitted = true;
    
    if (!this.selectedContact.name || !this.selectedContact.phone) {
      return;
    }
    
    const payload = { ...this.selectedContact };
    
    if (this.selectedContact.custom_fields) {
      payload['custom_fields'] = { ...this.selectedContact.custom_fields };
    }
    
    this.contactService.update_contact(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this._selectedConversation.contact = updated;
          this.selectedContact = this._selectedConversation.contact;
          
          if (this._selectedConversation.contact.platform_name === 'gmail' && 
              this.hasAgentCCChanged()) {
            this.saveAgentCC();
          } else {
            this.completeEdit();
          }
        },
        error: (err) => {
          console.error('Failed to update contact:', err);
          this.editContactDialogVisible = false;
          this.submitted = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update contact'
          });
        }
      });
  }
  
  private hasAgentCCChanged(): boolean {
    if (this.agentCCRecipients.length !== this.originalAgentCC.length) {
      return true;
    }
    
    const currentSet = new Set(this.agentCCRecipients.map(cc => cc.toLowerCase()));
    const originalSet = new Set(this.originalAgentCC.map(cc => cc.toLowerCase()));
    
    if (currentSet.size !== originalSet.size) return true;
    
    for (const email of currentSet) {
      if (!originalSet.has(email)) return true;
    }
    
    return false;
  }
  
  private saveAgentCC(): void {
    const payload = {
      conversation_id: this._selectedConversation.id,
      agent_cc_recipients: this.agentCCRecipients
    };
    
    this.conversationService.updateConversationCC(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this._selectedConversation.agent_cc_recipients = this.agentCCRecipients;
          this.originalAgentCC = [...this.agentCCRecipients];
          
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Contact and CC updated'
          });
          
          this.completeEdit();
        },
        error: (err) => {
          console.error('Failed to update CC:', err);
          this.messageService.add({
            severity: 'warn',
            summary: 'Partial Success',
            detail: 'Contact updated but CC failed'
          });
          this.completeEdit();
        }
      });
  }
  
  private completeEdit(): void {
    this.editContactDialogVisible = false;
    this.submitted = false;
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  convertToCommonDateTime(): void {
    if (!this._selectedConversation?.messages) return;
    
    this._selectedConversation.messages = this._selectedConversation.messages.map(msg => {
      const time = msg.type === 'customer' ? msg.received_time : msg.sent_time;
      return {
        ...msg,
        displayTime: this.isOlderThan24Hours(time)
          ? new Date(time).toLocaleString('en-US', { 
              dateStyle: 'medium', 
              timeStyle: 'short' 
            })
          : new Date(time).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
      };
    });
  }
  
  isOlderThan24Hours(dateString: string): boolean {
    const now = new Date();
    const date = new Date(dateString);
    return (now.getTime() - date.getTime()) > 24 * 60 * 60 * 1000;
  }
  
  //getSanitizedHtml(raw: string): SafeHtml {
  //  return this.sanitizer.bypassSecurityTrustHtml(raw);
  //}
  
  scrollToBottom(): void {
    try {
      setTimeout(() => {
        if (this.myScrollContainer) {
          this.myScrollContainer.nativeElement.scrollTop = 
            this.myScrollContainer.nativeElement.scrollHeight + 50;
        }
      }, 100);
    } catch (err) {
      console.error('Scroll error:', err);
    }
  }
  
  loadHistoricalConversation(): void {
    this.conversationService.list_historical_conversations_for_contact(
      'chat',
      this._selectedConversation.contact.id
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (convs) => {
          const messages: any[] = [];
          
          convs.forEach(conv => {
            const normalized = conv.messages.map((msg: any) => ({
              ...msg,
              timestamp: msg.sent_time
                ? new Date(msg.sent_time).getTime()
                : new Date(msg.received_time).getTime()
            }));
            
            normalized.sort((a, b) => a.timestamp - b.timestamp);
            
            const startTime = normalized[0]?.timestamp || new Date(conv.created_at).getTime();
            const endTime = normalized[normalized.length - 1]?.timestamp || startTime;
            
            messages.push({
              type: 'start_tag',
              by: conv.open_by,
              reason: conv.open_by === 'customer' ? 'Customer Query' : 'Organization Query',
              timestamp: startTime - 1
            });
            
            messages.push(...normalized);
            
            if (conv.status === 'closed') {
              messages.push({
                type: 'end_tag',
                by: this.getEmployeeNameFromId(conv.closed_by)?.details?.username || 'Unknown',
                reason: conv.closed_reason,
                timestamp: endTime + 1
              });
            }
          });
          
          messages.sort((a, b) => a.timestamp - b.timestamp);
          this._selectedConversation.messages = messages;
          this.convertToCommonDateTime();
          this.scrollToBottom();
        },
        error: (err) => {
          console.error('Failed to load history:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load history'
          });
        }
      });
  }
  
  private reloadActiveConversation(): void {
    this.conversationService.list_conversation_from_id(
      'chat',
      this._selectedConversation.id
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (conv) => {
          this._selectedConversation = conv;
          this.conversationStatus = this.computeConversationStatus(conv);
          this.buildMenuItems();
          this.scrollToBottom();
          this.messageSentEvent.emit(this._selectedConversation);
        },
        error: (err) => {
          console.error('Failed to reload conversation:', err);
        }
      });
    //this.refreshUnrespondedConversationNotifications();
  }
  
  //private refreshUnrespondedConversationNotifications(): void {
  //  this.conversationService.list_notification('chat')
  //    .pipe(takeUntil(this.destroy$))
  //    .subscribe({
  //      next: (data: any) => {
  //        this.layoutService.unrespondedConversationNotification.update(() => data);
  //      },
  //      error: (err) => {
  //        console.error('Failed to refresh notifications:', err);
  //      }
  //    });
  //}

  // Component 1 (chat)
private refreshUnrespondedConversationNotifications(): void {
    this.conversationService.list_notification('chat', 1, 20)
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
            error: (err) => console.error('Failed to refresh notifications:', err)
        });
}
  
  onRightClick(event: MouseEvent, fileId: any, contextMenu: any, mediaUrl: any): void {
    this.contextMenuItems = [
      { 
        label: 'View', 
        icon: 'pi pi-eye', 
        command: () => this.viewOrDownloadFileFromUrl(mediaUrl) 
      },
      //{ 
      //  label: 'View Directory', 
      //  icon: 'pi pi-eye', 
      //  command: () => this.viewFilePath(fileId) 
      //}
    ];
    contextMenu.show(event);
    event.preventDefault();
  }
  
  viewFilePath(id: string): void {
    this.router.navigate(['/apps/chat/fmanager'], {
      queryParams: { file: id }
    });
  }
  
  viewOrDownloadFileFromUrl(url: string): void {
    window.open(url, '_blank');
  }
  
  onTemplatePreviewReadyEvent(event: any): void {
    this.cdr.detectChanges();
  }

  // ============================================================================
// ADD THESE HELPER METHODS TO YOUR DetailChatWindowComponent CLASS
// ============================================================================

/**
 * Extract filename from URL
 */
getFileName(url: string): string {
  if (!url) return 'Unknown File';
  
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
    
    // Decode URI component to handle special characters
    return decodeURIComponent(filename) || 'document';
  } catch {
    // Fallback for invalid URLs
    const parts = url.split('/');
    return parts[parts.length - 1] || 'document';
  }
}

/**
 * Get human-readable file type label
 */
getFileTypeLabel(mimeType: string): string {
  const typeMap: { [key: string]: string } = {
    'application/pdf': 'PDF',
    'application/vnd.ms-excel': 'Excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
    'application/msword': 'Word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'application/vnd.ms-powerpoint': 'PowerPoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
    'application/zip': 'ZIP',
    'application/x-zip-compressed': 'ZIP',
    'text/plain': 'Text',
    'text/csv': 'CSV',
    'image/jpeg': 'Image',
    'image/png': 'Image',
    'image/gif': 'Image',
    'video/mp4': 'Video',
    'audio/mpeg': 'Audio'
  };
  
  // Try exact match first
  if (typeMap[mimeType]) {
    return typeMap[mimeType];
  }
  
  // Try partial matches
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Excel';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'Word';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'PowerPoint';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'ZIP';
  if (mimeType.includes('image')) return 'Image';
  if (mimeType.includes('video')) return 'Video';
  if (mimeType.includes('audio')) return 'Audio';
  if (mimeType.includes('text')) return 'Text';
  
  return 'File';
}



// ============================================================================
// AUTO-GROWING TEXTAREA LOGIC
// ============================================================================

/**
 * Handle message input changes and auto-grow textarea
 */
onMessageInput(event: Event): void {
  const textarea = event.target as HTMLTextAreaElement;
  this.adjustTextareaHeight(textarea);
}

/**
 * Handle caption input for attachments
 */
onCaptionInput(event: Event): void {
  const textarea = event.target as HTMLTextAreaElement;
  this.adjustTextareaHeight(textarea);
}

/**
 * Adjust textarea height based on content
 */
private adjustTextareaHeight(textarea: HTMLTextAreaElement): void {
  if (!textarea) return;
  
  const minHeight = 42; // Minimum height (1 line)
  const maxHeight = 200; // Maximum height before scrolling
  const lineHeight = 22; // Approximate line height
  
  // Reset height to recalculate
  textarea.style.height = 'auto';
  
  // Calculate new height
  const scrollHeight = textarea.scrollHeight;
  const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
  
  // Apply new height
  this.textareaHeight = newHeight;
  textarea.style.height = `${newHeight}px`;
  
  // Enable scrolling if max height reached
  if (scrollHeight > maxHeight) {
    textarea.style.overflowY = 'auto';
  } else {
    textarea.style.overflowY = 'hidden';
  }
}

/**
 * Reset textarea height when message is sent
 */
private resetTextareaHeight(): void {
  this.textareaHeight = 42;
  if (this.messageInputRef?.nativeElement) {
    this.messageInputRef.nativeElement.style.height = '42px';
    this.messageInputRef.nativeElement.style.overflowY = 'hidden';
  }
}

// ============================================================================
// KEYBOARD SHORTCUTS (WhatsApp-style)
// ============================================================================

/**
 * Handle keyboard events in message input
 * - Enter: Send message
 * - Ctrl+Enter / Shift+Enter: New line
 * - Escape: Clear input
 */
onMessageKeyDown(event: KeyboardEvent): void {
  const textarea = event.target as HTMLTextAreaElement;
  
  // Ctrl+Enter or Shift+Enter: Insert new line
  if ((event.ctrlKey || event.shiftKey) && event.key === 'Enter') {
    event.preventDefault();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    
    // Insert newline at cursor position
    this.messageText = value.substring(0, start) + '\n' + value.substring(end);
    
    // Restore cursor position after Angular updates
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 1;
      this.adjustTextareaHeight(textarea);
    }, 0);
    
    return;
  }
  
  // Enter alone: Send message
  if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
    event.preventDefault();
    this.sendMessage();
    return;
  }
  
  // Escape: Clear input
  if (event.key === 'Escape') {
    event.preventDefault();
    this.messageText = '';
    this.resetTextareaHeight();
    textarea.blur();
    return;
  }
  
  // Ctrl+K: Clear input (alternative)
  if (event.ctrlKey && event.key === 'k') {
    event.preventDefault();
    this.messageText = '';
    this.resetTextareaHeight();
    return;
  }
}

// ============================================================================
// ENHANCED PASTE HANDLING WITH FORMATTING
// ============================================================================

/**
 * Handle paste events - supports Excel tables and formatted text
 */
onPaste(event: ClipboardEvent): void {
  const clipboardData = event.clipboardData;
  if (!clipboardData) return;
  
  // Get both HTML and plain text
  const htmlData = clipboardData.getData('text/html');
  const plainText = clipboardData.getData('text/plain');
  
  // Check if this is an image paste
  const items = Array.from(clipboardData.items);
  const imageItem = items.find(item => item.type.startsWith('image/'));
  
  if (imageItem) {
    event.preventDefault();
    this.handleImagePaste(imageItem);
    return;
  }
  
  // Check if pasting a table (Excel/Sheets)
  if (htmlData && (htmlData.includes('<table') || htmlData.includes('SourceURL:file:///.*\\.xlsx'))) {
    event.preventDefault();
    event.stopPropagation();
    this.processTablePaste(htmlData, plainText);
    return;
  }
  
  // For regular text, let it paste normally but adjust height
  setTimeout(() => {
    if (this.messageInputRef?.nativeElement) {
      this.adjustTextareaHeight(this.messageInputRef.nativeElement);
    }
  }, 0);
}

/**
 * Handle image paste from clipboard
 */
private handleImagePaste(imageItem: DataTransferItem): void {
  const file = imageItem.getAsFile();
  if (!file) return;
  
  this.setAttachment(file);
  
  this.messageService.add({
    severity: 'success',
    summary: 'Image Pasted',
    detail: 'Image from clipboard attached',
    life: 3000
  });
}

/**
 * Process table/Excel paste with formatting preservation
 */
private processTablePaste(htmlData: string, plainText: string): void {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlData, 'text/html');
    const table = doc.querySelector('table');
    
    if (table) {
      const formattedText = this.convertTableToFormattedText(table);
      this.insertTextAtCursor(formattedText);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Table Pasted',
        detail: 'Table formatting preserved with tabs',
        life: 3000
      });
    } else {
      this.insertTextAtCursor(plainText);
    }
  } catch (error) {
    console.error('Paste processing error:', error);
    this.insertTextAtCursor(plainText);
  }
}



/**
 * Insert text at cursor position in textarea
 */
//private insertTextAtCursor(text: string): void {
//  const textarea = this.messageInputRef?.nativeElement;
//  if (!textarea) {
//    // Fallback: append to end
//    this.messageText = (this.messageText || '') + (this.messageText ? '\n\n' : '') + text;
//    return;
//  }
//  
//  const start = textarea.selectionStart;
//  const end = textarea.selectionEnd;
//  const currentValue = this.messageText || '';
//  
//  // Insert text at cursor
//  const before = currentValue.substring(0, start);
//  const after = currentValue.substring(end);
//  
//  // Add spacing if needed
//  const needsSpaceBefore = before && !before.endsWith('\n');
//  const needsSpaceAfter = after && !after.startsWith('\n');
//  
//  this.messageText = before + 
//                     (needsSpaceBefore ? '\n\n' : '') + 
//                     text + 
//                     (needsSpaceAfter ? '\n\n' : '') + 
//                     after;
//  
//  // Restore cursor position
//  setTimeout(() => {
//    const newPosition = start + (needsSpaceBefore ? 2 : 0) + text.length;
//    textarea.selectionStart = textarea.selectionEnd = newPosition;
//    this.adjustTextareaHeight(textarea);
//    textarea.focus();
//  }, 0);
//}

private insertTextAtCursor(text: string): void {
  const textarea = this.messageInputRef?.nativeElement;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(end);

  const needsSpaceBefore = before && !before.endsWith('\n');
  const needsSpaceAfter = after && !after.startsWith('\n');

  const newValue =
    before +
    (needsSpaceBefore ? '\n\n' : '') +
    text +
    (needsSpaceAfter ? '\n\n' : '') +
    after;

  // 🔴 WRITE ONLY ONCE
  textarea.value = newValue;
  this.messageText = newValue; // sync Angular AFTER

  // Restore cursor
  const newPosition = start + (needsSpaceBefore ? 2 : 0) + text.length;

  setTimeout(() => {
    textarea.selectionStart = textarea.selectionEnd = newPosition;
    this.adjustTextareaHeight(textarea);
    textarea.focus();
  });
}


// ============================================================================
// INPUT FOCUS MANAGEMENT
// ============================================================================

/**
 * Handle input focus
 */
onInputFocus(): void {
  this.showFormattingHint = true;
  
  // Hide hint after 3 seconds
  clearTimeout(this.inputFocusTimeout);
  this.inputFocusTimeout = setTimeout(() => {
    this.showFormattingHint = false;
  }, 3000);
}

/**
 * Handle input blur
 */
onInputBlur(): void {
  clearTimeout(this.inputFocusTimeout);
  this.showFormattingHint = false;
}

// ============================================================================
// SEND MESSAGE HELPERS
// ============================================================================

/**
 * Check if current message can be sent
 */
canSendCurrentMessage(): boolean {
  // Has content (text or file)
  const hasText = !!this.messageText?.trim();
  const hasFile = !!this.attachedFile;
  const attachmentValid = hasFile ? hasText : true;
  //const hasContent = (this.messageText && this.messageText.trim().length > 0);
  
  // Can send in current conversation state
  const canSend = !this.conversationStatus.isZombie && 
                  this.conversationStatus.canSendMessage;
  
  return attachmentValid && hasText && canSend;
}

/**
 * Enhanced send message with cleanup
 */





// ============================================================================
// UTILITY METHODS (if not already present)
// ============================================================================

/**
 * Get message input placeholder based on conversation state
 */
getMessageInputPlaceholder(): string {
  if (!this._selectedConversation) {
    return 'Select a conversation';
  }
  
  if (this._selectedConversation.status === 'zombie' && this._selectedConversation.contact.platform_name === 'whatsapp') {
    return 'Re-engagement required - use template button';
  }
  
  if (this._selectedConversation.status === 'closed') {
    return 'This conversation is closed';
  }
  
  if (!this.conversationStatus.canSendMessage) {
    return 'You cannot send messages in this conversation';
  }
  
  return 'Type a message';
}

// Add these methods to your DetailChatWindowComponent class

/**
 * Get sanitized HTML for email content
 * Now with minimal sanitization to preserve formatting
 */
getSanitizedHtml(raw: string): SafeHtml {
  if (!raw) {
    return this.sanitizer.bypassSecurityTrustHtml('');
  }
  
  // Angular's DomSanitizer will handle the security
  // Since we already sanitized on the backend, we can trust this content
  return this.sanitizer.bypassSecurityTrustHtml(raw);
}

/**
 * Check if message is an email type
 */
isEmailMessage(message: any): boolean {
  return message.message_type === 'email' || 
         (message.content_blocks && message.content_blocks.length > 0);
}

/**
 * Get email metadata for display
 */
getEmailMetadata(message: any): any {
  if (!this.isEmailMessage(message)) {
    return null;
  }
  
  return {
    from: message.customer_name || message.contact?.phone,
    to: this.profile?.user?.email,
    cc: message.cc_recipients || [],
    replyTo: message.reply_to,
    date: message.received_time || message.sent_time,
    subject: this.selectedConversation?.subject
  };
}

/**
 * Format email date nicely
 */
formatEmailDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  if (diffHours < 24) {
    // Today: show time
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffHours < 48) {
    // Yesterday
    return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffHours < 168) {
    // This week: show day name
    return date.toLocaleDateString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' });
  } else {
    // Older: show full date
    return date.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

/**
 * Check if HTML content has tables (for special handling)
 */
hasEmailTables(html: string): boolean {
  return html && html.includes('<table');
}

/**
 * Estimate reading time for email
 */
getEmailReadingTime(message: any): string {
  if (!message.content_blocks || message.content_blocks.length === 0) {
    return '1 min read';
  }
  
  const html = message.content_blocks[0]?.html || '';
  // Strip HTML tags for word count
  const text = html.replace(/<[^>]*>/g, ' ');
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200); // Average reading speed
  
  return minutes === 1 ? '1 min read' : `${minutes} min read`;
}

/**
 * Check if email has external images
 */
hasExternalImages(html: string): boolean {
  return html && (html.includes('<img') && html.includes('http'));
}

/**
 * Truncate long email subjects
 */
truncateSubject(subject: string, maxLength: number = 60): string {
  if (!subject || subject.length <= maxLength) {
    return subject;
  }
  return subject.substring(0, maxLength) + '...';
}

/**
 * Get email preview text (first few lines)
 */
getEmailPreview(message: any, maxLength: number = 150): string {
  if (!message.content_blocks || message.content_blocks.length === 0) {
    return '';
  }
  
  const html = message.content_blocks[0]?.html || '';
  // Strip HTML and get plain text
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength) + '...';
}

/**
 * Detect if email is likely a reply/forward
 */
isEmailReply(message: any): boolean {
  const subject = this.selectedConversation?.subject || '';
  return subject.toLowerCase().startsWith('re:') || 
         subject.toLowerCase().startsWith('fwd:');
}

/**
 * Get appropriate icon for email type
 */
getEmailIcon(message: any): string {
  if (this.isEmailReply(message)) {
    return 'pi-reply';
  }
  if (message.cc_recipients && message.cc_recipients.length > 0) {
    return 'pi-users';
  }
  return 'pi-envelope';
}

/**
 * Check if email needs special rendering (like newsletters)
 */
isNewsletterStyle(html: string): boolean {
  // Check for common newsletter indicators
  return html && (
    html.includes('unsubscribe') ||
    html.includes('newsletter') ||
    html.includes('email-wrapper') ||
    (html.match(/<table/g) || []).length > 3
  );
}

// ADD — builds PrimeNG MenuItem[] for available agents to transfer to
getTransferableAgents(): any[] {
  return this.employees
    .filter(emp => emp.user !== this.profile?.user?.id)
    .map(emp => ({
      label  : emp.details?.username || `Agent ${emp.user}`,
      icon   : 'pi pi-user',
      command: () => this.transferCall(emp.user)
    }));
}

// REPLACE the transferCall method — it only emits, touches nothing it doesn't own
transferCall(targetUserId: number): void {
  this.transferCallEvent.emit({ targetUserId });
}

toggleNoteMode(): void {
  this.isNoteMode = !this.isNoteMode;
  if (!this.isNoteMode) {
    this.taggedEmployee = null;
  }
}

sendNoteAndRequestCall(): void {
  if (!this.taggedEmployee) return;
  
  // isNoteMode must be true for this to work — enforce it
  this.isNoteMode = true;

  const agentName    = this.taggedEmployee.details?.username || 'Agent';
  const customerName = this._selectedConversation?.contact?.name
                    || this._selectedConversation?.contact?.phone;

  if (!this.messageText?.trim()) {
    this.messageText = `@${agentName} — please call ${customerName}. Customer needs assistance.`;
  }

  // sendMessage() will now see isNoteMode=true and route as internal
  this.sendMessage();
}

private checkPersistedCallPermission(platformId: string, phone: string): void {
  this.conversationService.checkCallPermission(platformId, phone)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res: any) => {
        if (res.has_permission) {
          // Pre-enable the call button — emits to parent via @Output isn't
          // applicable here, so set directly via the Input binding path.
          // We'll fire an event up to chat-window to set the signal.
          this.callPermissionGrantedFor = phone;
          this.callPermissionRestoredEvent.emit(phone);
        }
      },
      error: () => {} // silently ignore — fallback to socket-based flow
    });
}

formatCallDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

}
