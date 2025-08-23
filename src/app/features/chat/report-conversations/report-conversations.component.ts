import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { UserManagerService } from '../../../shared/services/user-manager.service';
import { ChatManagerService } from '../../../shared/services/chat-manager.service';
import { CUstomEventService } from '../../../shared/services/Events/custom-events.service';
import { ConversationModel } from '../conversation.model';
import { SelectModule } from 'primeng/select';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-report-conversations',
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
    InputGroupAddonModule
  ],
  providers: [
    MessageService, ConfirmationService
  ],
  templateUrl: './report-conversations.component.html',
  styleUrl: './report-conversations.component.scss'
})
export class ReportConversationsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('dt') globalReportDt !: Table;
  profile !: any;

  @Input() users!: any[];
  @Input() is_user_specific!: boolean;

  private _statusFilter = '';
  private tableReady = false;
  @Input()
  set status_filter(value: string) {
    this._statusFilter = value;
    // Try to apply the filter if the table is already available
    if (this.tableReady && this.globalReportDt) {
      this.globalReportDt.filterGlobal(value, 'contains');
    }
  }

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
    private assignmentEventService: CUstomEventService
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
    this.loadConversations();
  }

  ngAfterViewInit() {
    // Mark the table as ready
    this.tableReady = true;
    // Apply any stored filter once the table is initialized
    if (this._statusFilter && this.globalReportDt) {
      this.globalReportDt.filterGlobal(this._statusFilter, 'contains');
    }
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
    this.conversationService.list_all_conversations(this.is_user_specific).pipe(takeUntil(this.destroy$)).subscribe((data) => {
      data.forEach((convers) => {
        convers.sla = this.calculateDateDifference(convers.updated_at);
      })
      this.conversations = data;
      this.loading = false;
      if (!skip_notification){
        this.assignmentEventService.emitAssignmentChange("Assignment Change");
      }
    },
    (err) => {
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
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `Task "${row.conversation_id}" assigned to: ${row.assigned.name}` });
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

  cancelAssignment(row: any): void {
    row.isDropdownVisible = false; // Close dropdown without assigning
    row.assigned = null; // Clear selection
  }


}
