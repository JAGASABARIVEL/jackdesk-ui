// ticketing-view.component.ts
// FIX: Removed ChangeDetectionStrategy.OnPush — it was causing the "click to refresh" bug
// because HTTP callbacks from certain services run outside Angular's zone.
// Using Default CD + NgZone.run() for any edge cases is the correct pattern here.

import { Component, OnInit, OnDestroy, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { CheckboxModule } from 'primeng/checkbox';
import { ImageModule } from 'primeng/image';
import { DividerModule } from 'primeng/divider';
import { MultiSelectModule } from 'primeng/multiselect';
import { Subject, takeUntil } from 'rxjs';
import { ChatManagerService } from '../../../shared/services/chat-manager.service';
import { UserManagerService } from '../../../shared/services/user-manager.service';
import { LayoutService } from '../../../layout/service/app.layout.service';
import { SafeUrlPipe } from '../../../shared/pipes/safe-url.pipe';
import { MessagePreviewComponent } from '../../campaign/message-preview/message-preview.component';

interface TicketFilters {
  status: string;
  assignedToMe: boolean;
  dateRange: string;
  searchQuery: string;
}

@Component({
  selector: 'app-ticketing-view',
  standalone: true,
  // No changeDetection override — uses Default, which works correctly with async HTTP
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    SelectModule,
    InputTextModule,
    TooltipModule,
    DialogModule,
    AvatarModule,
    BadgeModule,
    CheckboxModule,
    ImageModule,
    DividerModule,
    MultiSelectModule,
    SafeUrlPipe,
    MessagePreviewComponent
  ],
  templateUrl: './ticketing-view.component.html',
  styleUrls: ['./ticketing-view.component.scss']
})
export class TicketingViewComponent implements OnInit, OnDestroy {
  tickets: any[] = [];
  loading = false;
  selectedTicket: any = null;
  ticketDetailVisible = false;
  loadingDetail = false;
  users: any[] = [];
  totalRecords = 0;

  // Column picker — ID, Customer, Actions are always shown and excluded from this list
  columnOptions = [
    { key: 'status',        label: 'Status' },
    { key: 'channel',       label: 'Channel' },
    { key: 'assignee',      label: 'Assignee' },
    { key: 'messages',      label: 'Messages' },
    { key: 'age',           label: 'Age' },
    { key: 'closed_reason', label: 'Closed Reason' },
  ];

  // Default visible columns (everything except closed_reason)
  visibleColumnKeys: string[] = ['status', 'channel', 'assignee', 'messages', 'age'];

  get visibleColumnCount(): number {
    // 3 fixed (ID, Customer, Actions) + toggled columns
    return 3 + this.visibleColumnKeys.length;
  }

  isColumnVisible(key: string): boolean {
    return this.visibleColumnKeys.includes(key);
  }

  onColumnToggle(): void {
    // no-op — ngModel binding on visibleColumnKeys handles reactivity automatically
  }

  @ViewChild('messageScrollContainer') messageScrollContainer!: ElementRef<HTMLDivElement>;

  filters: TicketFilters = {
    status: '',
    assignedToMe: false,
    dateRange: 'week',
    searchQuery: ''
  };

  statusOptions = [
    { label: 'All Statuses', value: '', icon: 'pi pi-list', color: '#6B7280' },
    { label: 'New', value: 'new', icon: 'pi pi-circle-fill', color: '#EF4444' },
    { label: 'Active', value: 'active', icon: 'pi pi-clock', color: '#F59E0B' },
    { label: 'Closed', value: 'closed', icon: 'pi pi-check-circle', color: '#10B981' }
  ];

  dateRangeOptions = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'All Time', value: '' }
  ];

  summary: any = {
    total_tickets: 0,
    new_tickets: 0,
    active_tickets: 0,
    closed_tickets: 0,
    overdue_tickets: 0,
    avg_response_time_hours: 0,
    assigned_tickets: 0,
    unassigned_tickets: 0
  };

  private destroy$ = new Subject<void>();

  constructor(
    private conversationService: ChatManagerService,
    private userService: UserManagerService,
    private layoutService: LayoutService,
    private ngZone: NgZone  // Ensures callbacks re-enter Angular's zone if the service runs outside it
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadTickets();
    this.loadSummary();
    this.layoutService.state.staticMenuDesktopInactive = true;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByTicketId(_index: number, ticket: any): number {
    return ticket.id;
  }

  trackByMessageId(_index: number, message: any): number {
    return message.id;
  }

  loadUsers(): void {
    this.userService.list_users()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            this.users = data;
          });
        },
        error: (err) => console.error('Error loading users:', err)
      });
  }

  loadTickets(): void {
    this.loading = true;
    const params: any = {};
    if (this.filters.status) params.status = this.filters.status;
    if (this.filters.assignedToMe) params.assigned_to_me = 'true';
    if (this.filters.dateRange) params.date_range = this.filters.dateRange;
    if (this.filters.searchQuery) params.search = this.filters.searchQuery;

    this.conversationService.list_tickets(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // ngZone.run() guarantees change detection fires even if the HTTP
          // interceptor or service runs the callback outside Angular's zone
          this.ngZone.run(() => {
            if (data.results) {
              this.tickets = this.enhanceTicketData(data.results);
              this.totalRecords = data.count || 0;
            } else {
              this.tickets = this.enhanceTicketData(data);
              this.totalRecords = data.length;
            }
            this.loading = false;
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            console.error('Error loading tickets:', err);
            this.loading = false;
          });
        }
      });
  }

  onPageChange(event: any): void {
    const page = Math.floor(event.first / event.rows) + 1;
    const params: any = { page, page_size: event.rows };

    if (this.filters.status) params.status = this.filters.status;
    if (this.filters.assignedToMe) params.assigned_to_me = 'true';
    if (this.filters.dateRange) params.date_range = this.filters.dateRange;
    if (this.filters.searchQuery) params.search = this.filters.searchQuery;

    this.loading = true;
    this.conversationService.list_tickets(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            if (data.results) {
              this.tickets = this.enhanceTicketData(data.results);
              this.totalRecords = data.count || 0;
            } else {
              this.tickets = this.enhanceTicketData(data);
              this.totalRecords = data.length;
            }
            this.loading = false;
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            console.error('Error loading tickets:', err);
            this.loading = false;
          });
        }
      });
  }

  loadSummary(): void {
    this.conversationService.get_ticket_summary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            this.summary = data;
          });
        },
        error: (err) => console.error('Error loading summary:', err)
      });
  }

  enhanceTicketData(tickets: any[]): any[] {
    return tickets.map(ticket => ({
      ...ticket,
      ticket_id: `#${String(ticket.id).padStart(5, '0')}`,
      age_display: this.getAgeDisplay(ticket.created_at),
      last_update_display: this.getAgeDisplay(ticket.updated_at),
      is_overdue: this.isOverdue(ticket),
      message_count: ticket.messages?.length || ticket.message_count || 0
    }));
  }

  isOverdue(ticket: any): boolean {
    const createdDate = new Date(ticket.created_at);
    const now = new Date();
    const hoursSinceCreated = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return ticket.status === 'new' && hoursSinceCreated > 24;
  }

  getAgeDisplay(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }

  getStatusSeverity(status: string): any {
    const map: Record<string, string> = { new: 'danger', active: 'warn', closed: 'success' };
    return map[status] || 'info';
  }

  onFilterChange(): void {
    this.loadTickets();
  }

  clearFilters(): void {
    this.filters = { status: '', assignedToMe: false, dateRange: 'week', searchQuery: '' };
    this.loadTickets();
  }

  viewTicketDetail(ticket: any): void {
    this.loadingDetail = true;
    this.ticketDetailVisible = true;
    this.selectedTicket = null;

    this.conversationService.get_ticket_detail(ticket.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            this.selectedTicket = {
              ...data,
              ticket_id: `#${String(data.id).padStart(5, '0')}`,
              age_display: this.getAgeDisplay(data.created_at),
              is_overdue: this.isOverdue(data),
              message_count: data.messages?.length || 0
            };
            this.loadingDetail = false;
            setTimeout(() => this.scrollToBottom(), 100);
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            console.error('Error loading ticket detail:', err);
            this.loadingDetail = false;
          });
        }
      });
  }

  scrollToBottom(): void {
    if (this.messageScrollContainer?.nativeElement) {
      const el = this.messageScrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  onDialogHide(): void {
    this.selectedTicket = null;
  }

  onTemplatePreviewReadyEvent(event: any): void {
    // no-op: template preview handles its own rendering
  }

  updateStatus(newStatus: string): void {
    if (!this.selectedTicket) return;
    this.conversationService.update_ticket_status(this.selectedTicket.id, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.selectedTicket = { ...this.selectedTicket, status: newStatus };
            this.loadTickets();
            this.loadSummary();
          });
        },
        error: (err) => console.error('Error updating status:', err)
      });
  }

  assignAgent(userId: number): void {
    if (!this.selectedTicket) return;
    this.conversationService.assign_ticket(this.selectedTicket.id, userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.ngZone.run(() => {
            this.selectedTicket = { ...this.selectedTicket, assigned_user: response.assigned_user };
            this.loadTickets();
          });
        },
        error: (err) => console.error('Error assigning agent:', err)
      });
  }

  exportToCSV(): void {
    const csvData = this.tickets.map(t => ({
      'Ticket ID': t.ticket_id,
      'Customer': t.contact?.name || t.contact?.phone,
      'Status': t.status,
      'Channel': t.platform?.platform_name,
      'Assignee': t.assigned_user?.username || 'Unassigned',
      'Created': new Date(t.created_at).toLocaleString(),
      'Age': t.age_display,
      'Messages': t.message_count
    }));
    const csv = this.convertToCSV(csvData);
    this.downloadCSV(csv, `tickets-${new Date().toISOString().split('T')[0]}.csv`);
  }

  private convertToCSV(data: any[]): string {
    if (!data?.length) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','));
    return [headers.join(','), ...rows].join('\n');
  }

  private downloadCSV(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  getResolutionRate(): number {
    return this.summary.total_tickets > 0
      ? Math.round((this.summary.closed_tickets / this.summary.total_tickets) * 100) : 0;
  }

  getActiveRate(): number {
    return this.summary.total_tickets > 0
      ? Math.round((this.summary.active_tickets / this.summary.total_tickets) * 100) : 0;
  }

  shouldShowDateSeparator(current: any, previous: any): boolean {
    if (!previous) return true;
    return new Date(current.created_at).toDateString() !== new Date(previous.created_at).toDateString();
  }

  isMediaMessage(message: any): boolean {
    return !!(message.media_url || message.media_urls?.length);
  }

  getMimeType(url: string): 'image' | 'video' | 'audio' | 'pdf' | 'spreadsheet' | 'zip' | 'other' {
    if (!url) return 'other';
    const u = url.toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(u) || u.includes('image')) return 'image';
    if (/\.(mp4|webm|mov)$/i.test(u) || u.includes('video')) return 'video';
    if (/\.(mp3|aac|wav|ogg)$/i.test(u) || u.includes('audio')) return 'audio';
    if (u.endsWith('.pdf') || u.includes('pdf')) return 'pdf';
    if (/\.(xlsx?|csv)$/i.test(u) || u.includes('spreadsheet')) return 'spreadsheet';
    if (u.includes('zip')) return 'zip';
    return 'other';
  }

  isImageType(message: any): boolean {
    return !!message.media_url && (this.getMimeType(message.media_url) === 'image' || !!message.media_type?.toLowerCase().includes('image'));
  }

  isVideoType(message: any): boolean {
    return !!message.media_url && (this.getMimeType(message.media_url) === 'video' || !!message.media_type?.toLowerCase().includes('video'));
  }

  isAudioType(message: any): boolean {
    return !!message.media_url && (this.getMimeType(message.media_url) === 'audio' || !!message.media_type?.toLowerCase().includes('audio'));
  }

  isPdfType(message: any): boolean {
    return !!message.media_url && (this.getMimeType(message.media_url) === 'pdf' || !!message.media_type?.toLowerCase().includes('pdf'));
  }

  isSpreadsheetType(message: any): boolean {
    return !!message.media_url && this.getMimeType(message.media_url) === 'spreadsheet';
  }

  isZipType(message: any): boolean {
    return !!message.media_url && (this.getMimeType(message.media_url) === 'zip' || !!message.media_type?.includes('zip'));
  }

  hasMultipleMediaUrls(message: any): boolean {
    return Array.isArray(message.media_urls) && message.media_urls.length > 0;
  }

  getDocIcon(message: any): string {
    if (this.isSpreadsheetType(message)) return 'assets/Icons/Schedule/ms-excel.svg';
    if (this.isZipType(message)) return 'assets/Icons/Schedule/zip-folder.png';
    return 'assets/Icons/Schedule/file.png';
  }

  getDocLabel(message: any): string {
    if (this.isSpreadsheetType(message)) return 'Spreadsheet Document';
    if (this.isZipType(message)) return 'Compressed Archive';
    return 'Document';
  }

  viewOrDownloadFile(url: string): void {
    if (url) window.open(url, '_blank');
  }
}