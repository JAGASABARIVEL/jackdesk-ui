import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-attendance-table',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule],
  template: `
    <div class="attendance-table">
      <div class="section-header">
        <h3>Daily Attendance Record</h3>
        <div class="summary-badges">
          <p-tag severity="success" [value]="'Present: ' + (attendanceData?.summary?.present_days || 0)"></p-tag>
          <p-tag severity="danger" [value]="'Absent: ' + (attendanceData?.summary?.absent_days || 0)"></p-tag>
          <p-tag severity="info" [value]="'Rate: ' + (attendanceData?.summary?.attendance_rate || 0) + '%'"></p-tag>
        </div>
      </div>

      <p-table 
        [value]="attendanceData?.daily_records || []" 
        [paginator]="true" 
        [rows]="10"
        [rowsPerPageOptions]="[10, 25, 50]"
        styleClass="p-datatable-sm p-datatable-striped">
        
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="date">
              Date <p-sortIcon field="date"></p-sortIcon>
            </th>
            <th>Day</th>
            <th pSortableColumn="status">
              Status <p-sortIcon field="status"></p-sortIcon>
            </th>
            <th>Login Time</th>
            <th>Logout Time</th>
            <th pSortableColumn="work_hours">
              Work Hours <p-sortIcon field="work_hours"></p-sortIcon>
            </th>
            <th>Idle Hours</th>
            <th>Meets Standard</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-record>
          <tr>
            <td>{{ formatDate(record.date) }}</td>
            <td>{{ record.day_name }}</td>
            <td>
              <p-tag 
                [value]="record.status.toUpperCase()"
                [severity]="getStatusSeverity(record.status)">
              </p-tag>
            </td>
            <td>
              <span [class.text-muted]="record.login_time === '-'">
                {{ record.login_time }}
              </span>
            </td>
            <td>
              <span [class.text-muted]="record.logout_time === '-'">
                {{ record.logout_time }}
              </span>
            </td>
            <td>
              <span class="work-hours-badge" [class.low-hours]="record.work_hours < 7">
                {{ record.work_hours }}h
              </span>
            </td>
            <td>
              <span class="idle-hours" [class.high-idle]="record.idle_hours > 2">
                {{ record.idle_hours }}h
              </span>
            </td>
            <td class="text-center">
              <i *ngIf="record.status === 'present' && record.meets_standard" 
                 class="pi pi-check-circle text-success"></i>
              <i *ngIf="record.status === 'present' && !record.meets_standard" 
                 class="pi pi-exclamation-triangle text-warning"></i>
              <i *ngIf="record.status === 'absent'" 
                 class="pi pi-times-circle text-danger"></i>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="8" class="text-center">No attendance data available</td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
  styles: [`
    .attendance-table {
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #e2e8f0;

        h3 {
          margin: 0;
          font-size: 1.25rem;
          color: #2d3748;
        }

        .summary-badges {
          display: flex;
          gap: 0.5rem;
        }
      }

      .work-hours-badge {
        font-weight: 600;
        color: #48bb78;

        &.low-hours {
          color: #f56565;
        }
      }

      .idle-hours {
        color: #718096;

        &.high-idle {
          color: #f56565;
          font-weight: 600;
        }
      }

      .text-muted {
        color: #a0aec0;
      }

      .text-center {
        text-align: center;
      }

      .text-success {
        color: #48bb78;
        font-size: 1.25rem;
      }

      .text-warning {
        color: #ed8936;
        font-size: 1.25rem;
      }

      .text-danger {
        color: #f56565;
        font-size: 1.25rem;
      }
    }
  `]
})
export class AttendanceTableComponent implements OnChanges {
  @Input() attendanceData: any;

  ngOnChanges(): void {
    // Component updates when input changes
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  getStatusSeverity(status: string): any {
    switch (status) {
      case 'present':
        return 'success';
      case 'absent':
        return 'danger';
      case 'half-day':
        return 'warn';
      default:
        return 'info';
    }
  }
}