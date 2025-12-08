import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';

@Component({
  selector: 'app-team-comparison',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, ProgressBarModule],
  template: `
    <div class="team-comparison">
      <div class="section-header">
        <div>
          <h3>Team Payroll Comparison</h3>
          <p class="subtitle">Performance-based salary recommendations</p>
        </div>
        <div class="period-info" *ngIf="teamData?.period">
          <i class="pi pi-calendar"></i>
          <span>{{ formatDate(teamData.period.start) }} - {{ formatDate(teamData.period.end) }}</span>
          <span class="badge">{{ teamData.period.total_days }} days</span>
        </div>
      </div>
      
      <!-- Team Summary -->
      <div class="team-summary">
        <div class="summary-grid">
          <div class="summary-item">
            <div class="label">Total Members</div>
            <div class="value">{{ (teamData?.team_members || []).length }}</div>
          </div>
          <div class="summary-item">
            <div class="label">Full Pay Members</div>
            <div class="value success">{{ fullPayCount }}</div>
          </div>
          <div class="summary-item">
            <div class="label">Partial Pay Members</div>
            <div class="value warning">{{ partialPayCount }}</div>
          </div>
          <div class="summary-item">
            <div class="label">Avg Efficiency</div>
            <div class="value">{{ avgEfficiency }}%</div>
          </div>
          <div class="summary-item">
            <div class="label">Total Work Hours</div>
            <div class="value">{{ totalWorkHours }}h</div>
          </div>
          <div class="summary-item">
            <div class="label">Total Overtime</div>
            <div class="value">{{ totalOvertime }}h</div>
          </div>
        </div>
      </div>
      

      <p-table 
        [value]="teamData?.team_members || []" 
        [paginator]="true" 
        [rows]="10"
        [rowsPerPageOptions]="[10, 25, 50]"
        sortField="work_hours"
        [sortOrder]="-1"
        styleClass="p-datatable-sm p-datatable-striped">
        
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="name">
              Employee <p-sortIcon field="name"></p-sortIcon>
            </th>
            <th pSortableColumn="work_hours">
              Work Hours <p-sortIcon field="work_hours"></p-sortIcon>
            </th>
            <th pSortableColumn="present_days">
              Present Days <p-sortIcon field="present_days"></p-sortIcon>
            </th>
            <th pSortableColumn="absent_days">
              Absences <p-sortIcon field="absent_days"></p-sortIcon>
            </th>
            <th pSortableColumn="overtime_hours">
              Overtime <p-sortIcon field="overtime_hours"></p-sortIcon>
            </th>
            <th pSortableColumn="efficiency">
              Efficiency <p-sortIcon field="efficiency"></p-sortIcon>
            </th>
            <th pSortableColumn="payroll_status">
              Status <p-sortIcon field="payroll_status"></p-sortIcon>
            </th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-member let-rowIndex="rowIndex">
          <tr>
            <td>
              <div class="employee-cell">
                <div class="rank-badge" [class]="getRankClass(rowIndex)">
                  #{{ rowIndex + 1 }}
                </div>
                <div class="employee-info">
                  <div class="name">{{ member.name }}</div>
                  <div class="email">{{ member.email }}</div>
                </div>
              </div>
            </td>
            <td>
              <span class="work-hours-badge">
                {{ member.work_hours }}h
              </span>
            </td>
            <td>
              <span class="present-days">{{ member.present_days }}</span>
            </td>
            <td>
              <span class="absent-days" [class.high-absence]="member.absent_days > 3">
                {{ member.absent_days }}
              </span>
            </td>
            <td>
              <span class="overtime-badge" *ngIf="member.overtime_hours > 0">
                {{ member.overtime_hours }}h
              </span>
              <span class="text-muted" *ngIf="member.overtime_hours === 0">-</span>
            </td>
            <td>
              <div class="efficiency-cell">
                <p-progressBar 
                  [value]="member.efficiency" 
                  [showValue]="false"
                  [style]="{'height': '8px'}"
                  [styleClass]="getEfficiencyClass(member.efficiency)">
                </p-progressBar>
                <span class="efficiency-value">{{ member.efficiency }}%</span>
              </div>
            </td>
            <td>
              <p-tag 
                [value]="member.payroll_status"
                [severity]="getPayrollSeverity(member.payroll_status)">
              </p-tag>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="7" class="text-center">No team data available</td>
          </tr>
        </ng-template>
      </p-table>

    </div>
  `,
  styles: [`
    .team-comparison {
      
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #e2e8f0;
        flex-wrap: wrap;
        gap: 1rem;

        h3 {
          margin: 0;
          font-size: 1.5rem;
          color: #2d3748;
        }

        .subtitle {
          margin: 0.25rem 0 0 0;
          color: #718096;
          font-size: 0.875rem;
        }

        .period-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #718096;
          font-size: 0.875rem;

          i {
            color: #4299e1;
          }

          .badge {
            background: #ebf8ff;
            color: #2b6cb0;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-weight: 600;
          }
        }
      }

      .employee-cell {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .rank-badge {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
          flex-shrink: 0;

          &.rank-1 {
            background: linear-gradient(135deg, #ffd700, #ffed4e);
            color: #744210;
            box-shadow: 0 2px 8px rgba(255, 215, 0, 0.5);
          }

          &.rank-2 {
            background: linear-gradient(135deg, #c0c0c0, #e8e8e8);
            color: #4a5568;
            box-shadow: 0 2px 8px rgba(192, 192, 192, 0.5);
          }

          &.rank-3 {
            background: linear-gradient(135deg, #cd7f32, #e09961);
            color: #744210;
            box-shadow: 0 2px 8px rgba(205, 127, 50, 0.5);
          }

          &.rank-other {
            background: #f7fafc;
            color: #718096;
          }
        }

        .employee-info {
          .name {
            font-weight: 600;
            color: #2d3748;
          }

          .email {
            font-size: 0.75rem;
            color: #a0aec0;
          }
        }
      }

      .work-hours-badge {
        font-weight: 700;
        color: #48bb78;
        background: #f0fff4;
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
      }

      .present-days {
        font-weight: 600;
        color: #2d3748;
      }

      .absent-days {
        color: #718096;

        &.high-absence {
          color: #f56565;
          font-weight: 700;
        }
      }

      .overtime-badge {
        color: #9f7aea;
        font-weight: 600;
        background: #faf5ff;
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
      }

      .efficiency-cell {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        ::ng-deep {
          .p-progressbar {
            flex: 1;

            &.efficiency-high .p-progressbar-value {
              background: #48bb78;
            }

            &.efficiency-medium .p-progressbar-value {
              background: #ed8936;
            }

            &.efficiency-low .p-progressbar-value {
              background: #f56565;
            }
          }
        }

        .efficiency-value {
          font-weight: 600;
          color: #2d3748;
          min-width: 45px;
          text-align: right;
        }
      }

      .text-muted {
        color: #cbd5e0;
      }

      .text-center {
        text-align: center;
      }

      .team-summary {
        margin-top: 2rem;
        background: #f7fafc;
        border-radius: 8px;
        padding: 1.5rem;

        h4 {
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
          color: #2d3748;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;

          .summary-item {
            background: white;
            padding: 1rem;
            border-radius: 8px;
            text-align: center;

            .label {
              font-size: 0.75rem;
              color: #718096;
              margin-bottom: 0.5rem;
            }

            .value {
              font-size: 1.5rem;
              font-weight: 700;
              color: #2d3748;

              &.success {
                color: #48bb78;
              }

              &.warning {
                color: #ed8936;
              }
            }
          }
        }
      }
    }
  `]
})
export class TeamComparisonComponent implements OnChanges {
  @Input() teamData: any;

  fullPayCount = 0;
  partialPayCount = 0;
  avgEfficiency = 0;
  totalWorkHours = 0;
  totalOvertime = 0;

  ngOnChanges(): void {
    if (this.teamData && this.teamData.team_members) {
      this.calculateSummary();
    }
  }

  calculateSummary(): void {
    const members = this.teamData.team_members;

    this.fullPayCount = members.filter(m => m.payroll_status === 'FULL_PAY').length;
    this.partialPayCount = members.filter(m => m.payroll_status === 'PARTIAL_PAY').length;

    const totalEfficiency = members.reduce((sum, m) => sum + m.efficiency, 0);
    this.avgEfficiency = members.length > 0 ? Math.round(totalEfficiency / members.length) : 0;

    this.totalWorkHours = Math.round(members.reduce((sum, m) => sum + m.work_hours, 0));
    this.totalOvertime = Math.round(members.reduce((sum, m) => sum + m.overtime_hours, 0));
  }

  getRankClass(index: number): string {
    if (index === 0) return 'rank-1';
    if (index === 1) return 'rank-2';
    if (index === 2) return 'rank-3';
    return 'rank-other';
  }

  getEfficiencyClass(efficiency: number): string {
    if (efficiency >= 90) return 'efficiency-high';
    if (efficiency >= 75) return 'efficiency-medium';
    return 'efficiency-low';
  }

  getPayrollSeverity(status: string): any {
    return status === 'FULL_PAY' ? 'success' : 'warn';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}