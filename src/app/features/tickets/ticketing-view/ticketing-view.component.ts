// ticketing-view.component.ts - FIXED VERSION

import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { Subject, takeUntil, interval } from 'rxjs';
import { ChatManagerService } from '../../../shared/services/chat-manager.service';
import { UserManagerService } from '../../../shared/services/user-manager.service';
import { LayoutService } from '../../../layout/service/app.layout.service';
import { SafeUrlPipe } from '../../../shared/pipes/safe-url.pipe';

interface TicketFilters {
  status: string;
  assignedToMe: boolean;
  dateRange: string;
  searchQuery: string;
}

@Component({
  selector: 'app-ticketing-view',
  standalone: true,
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
    ScrollPanelModule,
    SafeUrlPipe
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
  totalRecords = 0
  
  // Filters
  filters: TicketFilters = {
    status: '',
    assignedToMe: false,
    dateRange: 'week',
    searchQuery: ''
  };
  
  // Filter options (removed priority)
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
  
  // Summary stats
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
  
  // Auto-refresh interval
  private refreshInterval$ = interval(30000); // 30 seconds
  private destroy$ = new Subject<void>();
  
  constructor(
    private conversationService: ChatManagerService,
    private userService: UserManagerService,
    private layoutService: LayoutService
  ) {}
  
  ngOnInit(): void {
    this.loadUsers();
    this.loadTickets();
    this.loadSummary();
    this.setupAutoRefresh();
    this.layoutService.state.staticMenuDesktopInactive = true;
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  setupAutoRefresh(): void {
    this.refreshInterval$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.ticketDetailVisible) {
          this.loadTickets();
          this.loadSummary();
        }
      });
  }
  
  loadUsers(): void {
    this.userService.list_users()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.users = data;
        },
        error: (err) => {
          console.error('Error loading users:', err);
        }
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
        // Check if response has pagination structure
        if (data.results) {
          this.tickets = this.enhanceTicketData(data.results);
          this.totalRecords = data.count || 0; // 👈 Add this line
        } else {
          this.tickets = this.enhanceTicketData(data);
          this.totalRecords = data.length; // 👈 Add this line
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading tickets:', err);
        this.loading = false;
      }
    });
}

  onPageChange(event: any): void {
  const page = (event.first / event.rows) + 1;
  const params: any = {
    page: page,
    page_size: event.rows
  };
  
  if (this.filters.status) params.status = this.filters.status;
  if (this.filters.assignedToMe) params.assigned_to_me = 'true';
  if (this.filters.dateRange) params.date_range = this.filters.dateRange;
  if (this.filters.searchQuery) params.search = this.filters.searchQuery;
  
  this.loading = true;
  this.conversationService.list_tickets(params)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        if (data.results) {
          this.tickets = this.enhanceTicketData(data.results);
          this.totalRecords = data.count || 0;
        } else {
          this.tickets = this.enhanceTicketData(data);
          this.totalRecords = data.length;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading tickets:', err);
        this.loading = false;
      }
    });
}
  
  loadSummary(): void {
    this.conversationService.get_ticket_summary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.summary = data;
        },
        error: (err) => {
          console.error('Error loading summary:', err);
        }
      });
  }
  
  enhanceTicketData(tickets: any[]): any[] {
    return tickets.map(ticket => ({
      ...ticket,
      ticket_id: `#${String(ticket.id).padStart(5, '0')}`,
      age_display: this.getAgeDisplay(ticket.created_at),
      last_update_display: this.getAgeDisplay(ticket.updated_at),
      is_overdue: this.isOverdue(ticket),
      message_count: ticket.messages?.length || 0
    }));
  }
  
  isOverdue(ticket: any): boolean {
    const createdDate = new Date(ticket.created_at);
    const now = new Date();
    const hoursSinceCreated = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return ticket.status === 'new' && hoursSinceCreated > 24;
  }
  
  getAgeInHours(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  }
  
  getAgeDisplay(dateString: string): string {
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
    const severities = {
      new: 'danger',
      active: 'warn',
      closed: 'success'
    };
    return severities[status] || 'info';
  }
  
  onFilterChange(): void {
    this.loadTickets();
  }
  
  clearFilters(): void {
    this.filters = {
      status: '',
      assignedToMe: false,
      dateRange: 'week',
      searchQuery: ''
    };
    this.loadTickets();
  }
  
  viewTicketDetail(ticket: any): void {
    this.loadingDetail = true;
    this.ticketDetailVisible = true;
    
    // Fetch full ticket details with messages
    this.conversationService.get_ticket_detail(ticket.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.selectedTicket = {
            ...data,
            ticket_id: `#${String(data.id).padStart(5, '0')}`,
            age_display: this.getAgeDisplay(data.created_at)
          };
          this.loadingDetail = false;
        },
        error: (err) => {
          console.error('Error loading ticket detail:', err);
          this.loadingDetail = false;
        }
      });
  }
  
  updateStatus(newStatus: string): void {
    if (!this.selectedTicket) return;
    
    this.conversationService.update_ticket_status(this.selectedTicket.id, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.selectedTicket.status = newStatus;
          this.loadTickets();
          this.loadSummary();
        },
        error: (err) => {
          console.error('Error updating status:', err);
        }
      });
  }
  
  assignAgent(userId: number): void {
    if (!this.selectedTicket) return;
    
    this.conversationService.assign_ticket(this.selectedTicket.id, userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.selectedTicket.assigned_user = response.assigned_user;
          this.loadTickets();
        },
        error: (err) => {
          console.error('Error assigning agent:', err);
        }
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
    if (!data || !data.length) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
      headers.map(header => `"${row[header] || ''}"`).join(',')
    );
    
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
    const total = this.summary.total_tickets;
    const closed = this.summary.closed_tickets;
    return total > 0 ? Math.round((closed / total) * 100) : 0;
  }
  
  getActiveRate(): number {
    const total = this.summary.total_tickets;
    const active = this.summary.active_tickets;
    return total > 0 ? Math.round((active / total) * 100) : 0;
  }
  
  isMediaMessage(message: any): boolean {
    return message.media_url || message.media_urls?.length > 0;
  }
  
  isImageMedia(message: any): boolean {
    const imageTypes = ['image', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
    return this.isMediaMessage(message) && 
           imageTypes.some(type => message.media_type?.toLowerCase().includes(type));
  }
  
  isVideoMedia(message: any): boolean {
    const videoTypes = ['video', 'mp4', 'webm', 'ogg'];
    return this.isMediaMessage(message) && 
           videoTypes.some(type => message.media_type?.toLowerCase().includes(type));
  }
  
  isAudioMedia(message: any): boolean {
    const audioTypes = ['audio', 'mp3', 'wav', 'ogg'];
    return this.isMediaMessage(message) && 
           audioTypes.some(type => message.media_type?.toLowerCase().includes(type));
  }
  
  isDocumentMedia(message: any): boolean {
    return this.isMediaMessage(message) && 
           !this.isImageMedia(message) && 
           !this.isVideoMedia(message) && 
           !this.isAudioMedia(message);
  }
  
  getMediaIcon(message: any): string {
    if (this.isImageMedia(message)) return 'pi-image';
    if (this.isVideoMedia(message)) return 'pi-video';
    if (this.isAudioMedia(message)) return 'pi-volume-up';
    if (this.isDocumentMedia(message)) return 'pi-file';
    return 'pi-paperclip';
  }

  // Add after the existing isDocumentMedia method

getMimeType(url: string): 'image' | 'video' | 'audio' | 'pdf' | 'spreadsheet' | 'zip' | 'other' {
  if (!url) return 'other';
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(url)) return 'image';
  if (urlLower.includes('video') || /\.(mp4|webm|mov)$/i.test(url)) return 'video';
  if (urlLower.includes('audio') || /\.(mp3|aac|wav|ogg)$/i.test(url)) return 'audio';
  if (urlLower.includes('pdf') || url.endsWith('.pdf')) return 'pdf';
  if (urlLower.includes('spreadsheet') || /\.(xlsx?|csv)$/i.test(url)) return 'spreadsheet';
  if (urlLower.includes('zip') || url.includes('application/x-zip-compressed')) return 'zip';
  
  return 'other';
}

isImageType(message: any): boolean {
  if (!message.media_url) return false;
  return this.getMimeType(message.media_url) === 'image' || 
         message.media_type?.toLowerCase().includes('image');
}

isVideoType(message: any): boolean {
  if (!message.media_url) return false;
  return this.getMimeType(message.media_url) === 'video' || 
         message.media_type?.toLowerCase().includes('video');
}

isAudioType(message: any): boolean {
  if (!message.media_url) return false;
  return this.getMimeType(message.media_url) === 'audio' || 
         message.media_type?.toLowerCase().includes('audio');
}

isPdfType(message: any): boolean {
  if (!message.media_url) return false;
  return this.getMimeType(message.media_url) === 'pdf' || 
         message.media_type?.toLowerCase().includes('pdf');
}

isSpreadsheetType(message: any): boolean {
  if (!message.media_url) return false;
  return this.getMimeType(message.media_url) === 'spreadsheet' || 
         message.media_type?.toLowerCase().includes('spreadsheet');
}

isZipType(message: any): boolean {
  if (!message.media_url) return false;
  return this.getMimeType(message.media_url) === 'zip' || 
         message.media_type?.includes('zip') ||
         message.media_type?.includes('application/x-zip-compressed');
}

hasMultipleMediaUrls(message: any): boolean {
  return message.media_urls && Array.isArray(message.media_urls) && message.media_urls.length > 0;
}

// For context menu (right-click)
viewOrDownloadFile(url: string): void {
  if (url) {
    window.open(url, '_blank');
  }
}
}