import { Component, Input, OnChanges, OnInit, OnDestroy, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { interval, Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-realtime-status',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, CardModule, ButtonModule],
  template: `
    <div class="realtime-status">

      <div class="status-header">
        <div>
          <h3>Team Live Status</h3>
          <p class="subtitle">Real-time team online/offline status</p>
        </div>
        <div class="last-update">
          <i class="pi pi-calendar"></i>
          Last updated: {{ lastUpdate | date:'short' }}
          <button pButton type="button" label="Refresh" icon="pi pi-refresh" class="p-button-outlined" (click)="refresh.emit()"></button>
        </div>
      </div>
      
      

      <!-- Status Overview -->
      <div class="grid mb-4">
        <div class="col-4">
          <div class="status-card active">
            <i class="pi pi-check-circle"></i>
            <div class="status-content">
              <div class="status-count">{{ statusCounts?.active || 0 }}</div>
              <div class="status-label">Active</div>
            </div>
          </div>
        </div>
        <div class="col-4">
          <div class="status-card idle">
            <i class="pi pi-pause-circle"></i>
            <div class="status-content">
              <div class="status-count">{{ statusCounts?.idle || 0 }}</div>
              <div class="status-label">Idle</div>
            </div>
          </div>
        </div>
        <div class="col-4">
          <div class="status-card offline">
            <i class="pi pi-times-circle"></i>
            <div class="status-content">
              <div class="status-count">{{ statusCounts?.offline || 0 }}</div>
              <div class="status-label">Offline</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Team Status Table -->
      <div class="card">
        <p-table [value]="teamStatus" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Employee</th>
              <th>Status</th>
              <th>Last Activity</th>
              <th>Current App</th>
              <th>Idle Duration</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-member>
            <tr>
              <td>
                <div class="employee-cell">
                  <div class="status-dot" [class]="member.status"></div>
                  <div>
                    <div class="employee-name">{{ member.user }}</div>
                    <div class="employee-email">{{ member.email }}</div>
                  </div>
                </div>
              </td>
              <td>
                <p-tag 
                  [value]="member.status.toUpperCase()" 
                  [severity]="getStatusSeverity(member.status)"
                  [icon]="getStatusIcon(member.status)">
                </p-tag>
              </td>
              <td>{{ member.last_activity ? (member.last_activity | date:'short') : 'N/A' }}</td>
              <td>
                <span *ngIf="member.last_app" class="app-badge">{{ member.last_app }}</span>
                <span *ngIf="!member.last_app" class="text-muted">-</span>
              </td>
              <td>
                <span *ngIf="member.idle_duration_minutes" 
                      class="idle-duration"
                      [class.warning]="member.idle_duration_minutes > 30"
                      [class.critical]="member.idle_duration_minutes > 60">
                  {{ member.idle_duration_minutes.toFixed(0) }} min
                </span>
                <span *ngIf="!member.idle_duration_minutes" class="text-muted">-</span>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

    </div>
  `,
  styles: [`
    .realtime-status {
      padding: 1rem;
    }

    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .last-update {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #666;
      font-size: 0.875rem;
    }

    .status-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .status-card i {
      font-size: 2.5rem;
    }

    .status-card.active i {
      color: #4CAF50;
    }

    .status-card.idle i {
      color: #FF9800;
    }

    .status-card.offline i {
      color: #9E9E9E;
    }

    .status-count {
      font-size: 2rem;
      font-weight: bold;
      color: #333;
    }

    .status-label {
      font-size: 0.875rem;
      color: #666;
    }

    .employee-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .status-dot.active {
      background: #4CAF50;
      box-shadow: 0 0 8px #4CAF50;
    }

    .status-dot.idle {
      background: #FF9800;
      box-shadow: 0 0 8px #FF9800;
    }

    .status-dot.offline {
      background: #9E9E9E;
    }

    .employee-name {
      font-weight: bold;
      color: #333;
    }

    .employee-email {
      font-size: 0.875rem;
      color: #666;
    }

    .app-badge {
      padding: 0.25rem 0.75rem;
      background: #E3F2FD;
      color: #1976D2;
      border-radius: 12px;
      font-size: 0.875rem;
    }

    .idle-duration {
      font-weight: bold;
      color: #666;
    }

    .idle-duration.warning {
      color: #FF9800;
    }

    .idle-duration.critical {
      color: #F44336;
    }

    .text-muted {
      color: #999;
    }
  `]
})
export class RealtimeStatusComponent implements OnInit, OnDestroy, OnChanges {
  @Input() statusData: any;
  @Output() refresh = new EventEmitter<void>();

  teamStatus: any[] = [];
  statusCounts: any;
  lastUpdate: Date;
  
  private refreshSubscription?: Subscription;

  ngOnInit() {
    // Auto-refresh every 30 seconds
    this.refreshSubscription = interval(30000).subscribe(() => {
      this.refresh.emit();
    });
  }

  ngOnDestroy() {
    this.refreshSubscription?.unsubscribe();
  }

  ngOnChanges() {
    if (this.statusData) {
      this.processStatusData();
    }
  }

  processStatusData() {
    this.teamStatus = this.statusData.team_status || [];
    this.statusCounts = this.statusData.status_counts;
    this.lastUpdate = new Date(this.statusData.timestamp);
  }

  getStatusSeverity(status: string): any {
    switch (status) {
      case 'active': return 'success';
      case 'idle': return 'warn';
      case 'offline': return 'secondary';
      default: return 'info';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'active': return 'pi pi-check-circle';
      case 'idle': return 'pi pi-pause-circle';
      case 'offline': return 'pi pi-times-circle';
      default: return 'pi pi-question-circle';
    }
  }
}
