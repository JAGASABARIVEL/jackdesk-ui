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

    AdditionalDetailChatWindowComponent,
    MessagePreviewComponent,
  ],
  providers: [
    ConfirmationService,
    MessageService
  ],
  templateUrl: './detail-chat-window.component.html',
  styleUrl: './detail-chat-window.component.scss'
})
export class DetailChatWindowComponent implements AfterViewInit {

  @Input() profile;
  @Output() chatDetailsPageLoaded: EventEmitter<boolean> = new EventEmitter();
  @Output() conversationClosedEvent: EventEmitter<any> = new EventEmitter();
  @Output() messageSentEvent: EventEmitter<any> = new EventEmitter();
  @Output() ownThisConversationEvent: EventEmitter<any> = new EventEmitter();
  _selectedConversation;
  chatdetaildrawerVisible = true
  private destroy$ = new Subject<void>();

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
    this._selectedConversation = value;
    this.selectedContact = value?.contact;
    this.convertTocommondatetime();
     this.ngZone.onStable.pipe(take(1)).subscribe(() => {
    this.scrollToBottom();
  });
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
    return this._selectedConversation.assigned?.id && this._selectedConversation.assigned?.id >= 0 && this._selectedConversation.assigned.id !== this.profile.user.id//new status; 
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
    this.conversationService.list_historical_conversations_for_contact(this.selectedConversation.contact.id).subscribe(
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

  ownThisConversation() {
    this.conversationService.assign_conversation(
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
  

  closedReason = 'N/A';
  closeConversationVisible = false;
  closeConversation() {
    this.closeConversationVisible = true;
  }
  onClosedReasonSave() {
    this.conversationService.close_conversation(
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
            else if (['webchat', 'messenger', 'gmail'].includes(_registeredPlatform.platform_name)) {
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
    this.conversationService.list_conversation_from_id(this.selectedConversation.id)
    .pipe(takeUntil(this.destroy$))
      .subscribe(conv => {
        this._selectedConversation = conv;
        this.scrollToBottom();
        this.messageSentEvent.emit(this.selectedConversation)
      });
    this.refreshUnrespondedConversationNotifications();
  }

  

  refreshUnrespondedConversationNotifications() {
    this.conversationService.list_notification()
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

  

  saveContactInConversationObject() {
  this.submitted = true;
  // Clone to separate standard & custom fields
  const payload = { ...this.selectedContact };
  // Extract custom fields if present
  if (this.selectedContact.custom_fields) {
    payload['custom_fields'] = { ...this.selectedContact.custom_fields };
  }
  this.contactService.update_contact(payload)
    .pipe(takeUntil(this.destroy$))
    .subscribe(
      (data) => {
        this.selectedConversation.contact = data;
        this.selectedContact = this.selectedConversation.contact;
        this.editContacDialogVisible = false;
        this.submitted = false;
        this.onChangeInSelectedConversationObjectFromChildren();
      },
      (err) => {
        console.error("Contacts | Error updating contact ", err);
        this.editContacDialogVisible = false;
        this.submitted = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Contact not updated', sticky: true });
      }
    );
}


}
