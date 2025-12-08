import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-weekly-trends',
  standalone: true,
  imports: [CommonModule, ChartModule, CardModule],
  template: `
    <div class="weekly-trends">
      
      <!-- Summary Stats -->
      <div class="weekly-summary">
        <div class="summary-item">
          <i class="pi pi-clock"></i>
          <div class="content">
            <div class="value">{{ totalWorkHours }}h</div>
            <div class="label">Total Work Hours</div>
          </div>
        </div>
        <div class="summary-item">
          <i class="pi pi-chart-line"></i>
          <div class="content">
            <div class="value">{{ avgWeeklyHours }}h</div>
            <div class="label">Avg Weekly Hours</div>
          </div>
        </div>
        <div class="summary-item">
          <i class="pi pi-bolt"></i>
          <div class="content">
            <div class="value">{{ totalOvertimeHours }}h</div>
            <div class="label">Total Overtime</div>
          </div>
        </div>
      </div>

      <!-- Stacked Bar Chart -->
      <div class="chart-container">
        <h4>Weekly Work Hours Breakdown</h4>
        <p-chart 
          type="bar" 
          [data]="stackedChartData" 
          [options]="stackedChartOptions"
          height="350px">
        </p-chart>
      </div>

      <!-- Week Cards -->
      <div class="weeks-grid">
        <div class="week-card" *ngFor="let week of weeklyData?.weekly_breakdown || []">
          <div class="week-header">
            <h5>{{ week.week }}</h5>
            <span class="date-range">{{ formatDateRange(week.week_start, week.week_end) }}</span>
          </div>
          <div class="week-stats">
            <div class="stat-item work">
              <span class="label">Work</span>
              <span class="value">{{ week.work_hours }}h</span>
            </div>
            <div class="stat-item idle">
              <span class="label">Idle</span>
              <span class="value">{{ week.idle_hours }}h</span>
            </div>
            <div class="stat-item overtime" *ngIf="week.overtime_hours > 0">
              <span class="label">Overtime</span>
              <span class="value">{{ week.overtime_hours }}h</span>
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill work" [style.width.%]="getPercentage(week.work_hours, week.total_hours)"></div>
            <div class="progress-fill idle" [style.width.%]="getPercentage(week.idle_hours, week.total_hours)"></div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .weekly-trends {
      
      .weekly-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;

        .summary-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f7fafc;
          border-radius: 8px;

          i {
            font-size: 2rem;
            color: #4299e1;
          }

          .content {
            .value {
              font-size: 1.5rem;
              font-weight: 700;
              color: #2d3748;
            }

            .label {
              font-size: 0.875rem;
              color: #718096;
            }
          }
        }
      }

      .chart-container {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        margin-bottom: 2rem;

        h4 {
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
          color: #2d3748;
        }
      }

      .weeks-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;

        .week-card {
          background: white;
          border-radius: 8px;
          padding: 1.25rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s, box-shadow 0.2s;

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          }

          .week-header {
            margin-bottom: 1rem;
            padding-bottom: 0.75rem;
            border-bottom: 2px solid #e2e8f0;

            h5 {
              margin: 0 0 0.25rem 0;
              font-size: 1.125rem;
              color: #2d3748;
              font-weight: 700;
            }

            .date-range {
              font-size: 0.75rem;
              color: #a0aec0;
            }
          }

          .week-stats {
            display: flex;
            justify-content: space-around;
            margin-bottom: 1rem;

            .stat-item {
              display: flex;
              flex-direction: column;
              align-items: center;

              .label {
                font-size: 0.75rem;
                color: #718096;
                margin-bottom: 0.25rem;
              }

              .value {
                font-size: 1.25rem;
                font-weight: 700;
              }

              &.work .value {
                color: #48bb78;
              }

              &.idle .value {
                color: #f56565;
              }

              &.overtime .value {
                color: #9f7aea;
              }
            }
          }

          .progress-bar {
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
            display: flex;

            .progress-fill {
              height: 100%;
              transition: width 0.3s;

              &.work {
                background: #48bb78;
              }

              &.idle {
                background: #f56565;
              }
            }
          }
        }
      }
    }
  `]
})
export class WeeklyTrendsComponent implements OnChanges {
  @Input() weeklyData: any;

  stackedChartData: any;
  stackedChartOptions: any;

  totalWorkHours = 0;
  totalOvertimeHours = 0;
  avgWeeklyHours = 0;

  ngOnChanges(): void {
    if (this.weeklyData) {
      this.calculateSummary();
      this.prepareChart();
    }
  }

  calculateSummary(): void {
    const weeks = this.weeklyData.weekly_breakdown || [];
    
    this.totalWorkHours = weeks.reduce((sum, week) => sum + week.work_hours, 0);
    this.totalOvertimeHours = weeks.reduce((sum, week) => sum + week.overtime_hours, 0);
    this.avgWeeklyHours = weeks.length > 0 ? this.totalWorkHours / weeks.length : 0;

    this.totalWorkHours = Math.round(this.totalWorkHours);
    this.totalOvertimeHours = Math.round(this.totalOvertimeHours);
    this.avgWeeklyHours = Math.round(this.avgWeeklyHours);
  }

  prepareChart(): void {
    const weeks = this.weeklyData.weekly_breakdown || [];

    this.stackedChartData = {
      labels: weeks.map(w => w.week),
      datasets: [
        {
          label: 'Work Hours',
          data: weeks.map(w => w.work_hours),
          backgroundColor: '#48bb78',
          stack: 'Stack 0'
        },
        {
          label: 'Idle Hours',
          data: weeks.map(w => w.idle_hours),
          backgroundColor: '#f56565',
          stack: 'Stack 0'
        },
        {
          label: 'Overtime Hours',
          data: weeks.map(w => w.overtime_hours),
          backgroundColor: '#9f7aea',
          stack: 'Stack 1'
        }
      ]
    };

    this.stackedChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: (context: any) => `${context.dataset.label}: ${context.parsed.y}h`
          }
        }
      },
      scales: {
        x: {
          stacked: true
        },
        y: {
          stacked: true,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Hours'
          }
        }
      }
    };
  }

  formatDateRange(start: string, end: string): string {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }

  getPercentage(value: number, total: number): number {
    return total > 0 ? (value / total) * 100 : 0;
  }
}