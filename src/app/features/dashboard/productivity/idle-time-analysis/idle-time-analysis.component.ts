import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { TimelineModule } from 'primeng/timeline';
import { HoursToTimePipe } from '../../../../shared/pipes/hourstotime.pipe';

interface IdlePattern {
  label: string;
  count: number;
  total_minutes: number;
  avg_session_minutes: number;
}

@Component({
  selector: 'app-idle-time-analysis',
  standalone: true,
  imports: [CommonModule, ChartModule, TableModule, TagModule, CardModule, TimelineModule, HoursToTimePipe],
  template: `
    <div class="idle-analysis">
      
      <!-- STATISTICS OVERVIEW -->
      <div class="grid mb-4">
        <div class="col-3">
          <div class="stat-card idle">
            <i class="pi pi-pause-circle"></i>
            <div class="stat-content">
              <div class="stat-label">Total Idle Time</div>
              <div class="stat-value">{{ statistics?.total_idle_hours | hoursToTime }}</div>
              <div class="stat-subtitle">{{ statistics?.idle_percentage || 0 }}% of total time</div>
            </div>
          </div>
        </div>

        <div class="col-3">
          <div class="stat-card sessions">
            <i class="pi pi-list"></i>
            <div class="stat-content">
              <div class="stat-label">Idle Sessions</div>
              <div class="stat-value">{{ statistics?.total_idle_sessions || 0 }}</div>
              <div class="stat-subtitle">Avg: {{ statistics?.avg_idle_session_minutes || 0 }} min</div>
            </div>
          </div>
        </div>

        <div class="col-3">
          <div class="stat-card longest">
            <i class="pi pi-clock"></i>
            <div class="stat-content">
              <div class="stat-label">Longest Session</div>
              <div class="stat-value">{{ statistics?.longest_idle_session_minutes || 0 }} min</div>
              <div class="stat-subtitle">Maximum idle period</div>
            </div>
          </div>
        </div>

        <div class="col-3">
          <div class="stat-card active">
            <i class="pi pi-bolt"></i>
            <div class="stat-content">
              <div class="stat-label">Active Time</div>
              <div class="stat-value">{{ statistics?.total_work_hours | hoursToTime }}</div>
              <div class="stat-subtitle">{{ 100 - (statistics?.idle_percentage || 0) }}% productive</div>
            </div>
          </div>
        </div>
      </div>

      <!-- IDLE PATTERNS -->
      <div class="card mb-4">
        <h3 class="section-title">Idle Time Patterns</h3>
        <div class="patterns-grid">
          <div class="pattern-card" *ngFor="let pattern of idlePatterns | keyvalue">
            <div class="pattern-header">
              <span class="pattern-name">{{ pattern.value.label }}</span>
              <span class="pattern-count">{{ pattern.value.count }} sessions</span>
            </div>
            <div class="pattern-value">{{ pattern.value.total_minutes.toFixed(1) }} min</div>
            <div class="pattern-avg">Avg: {{ pattern.value.avg_session_minutes.toFixed(1) }} min/session</div>
          </div>
        </div>
      </div>

      <!-- CHARTS ROW -->
      <div class="grid mb-4">
        <!-- Hourly Idle Distribution -->
        <div class="col-6">
          <div class="card">
            <h3 class="section-title">Idle Time by Hour</h3>
            <p-chart type="bar" [data]="hourlyIdleChartData" [options]="hourlyIdleChartOptions" height="300px"></p-chart>
          </div>
        </div>

        <!-- Daily Idle Distribution -->
        <div class="col-6">
          <div class="card">
            <h3 class="section-title">Idle Time by Day of Week</h3>
            <p-chart type="bar" [data]="dailyIdleChartData" [options]="dailyIdleChartOptions" height="300px"></p-chart>
          </div>
        </div>
      </div>

      <!-- HEATMAP -->
      <div class="card mb-4" *ngIf="heatmapData">
        <h3 class="section-title">
          <i class="pi pi-th-large mr-2"></i>
          Idle Time Heatmap (Hour x Day)
        </h3>
        <div class="heatmap-container">
          <div class="heatmap-row" *ngFor="let dayData of heatmapData">
            <div class="heatmap-label">{{ dayData.day.substring(0, 3) }}</div>
            <div class="heatmap-cells">
              <div class="heatmap-cell" 
                   *ngFor="let hourData of dayData.hours"
                   [class.intensity-none]="hourData.idle_minutes === 0"
                   [class.intensity-low]="hourData.idle_minutes > 0 && hourData.idle_minutes <= 15"
                   [class.intensity-medium]="hourData.idle_minutes > 15 && hourData.idle_minutes <= 30"
                   [class.intensity-high]="hourData.idle_minutes > 30"
                   [title]="hourData.hour + ':00 - ' + hourData.idle_minutes.toFixed(1) + ' min idle'">
              </div>
            </div>
          </div>
          <div class="heatmap-hours">
            <span *ngFor="let h of [0,2,4,6,8,10,12,14,16,18,20,22]">{{ h }}</span>
          </div>
        </div>
        <div class="heatmap-legend">
          <span>Less Idle</span>
          <div class="legend-gradient"></div>
          <span>More Idle</span>
        </div>
      </div>

      <!-- LONG IDLE PERIODS -->
      <div class="card mb-4" *ngIf="longIdlePeriods?.length > 0">
        <h3 class="section-title text-warning">
          <i class="pi pi-exclamation-triangle mr-2"></i>
          Long Idle Periods (>30 minutes)
        </h3>
        <p-table [value]="longIdlePeriods" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Start</th>
              <th>End</th>
              <th>Duration</th>
              <th>Time of Day</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-period>
            <tr>
              <td>{{ formatDate(period.start_time) }} - {{ formatTime(period.start_time) }}</td>
              <td>{{formatDate(period.end_time)}} - {{ formatTime(period.end_time) }}</td>
              <td>
                <span class="duration-badge" 
                      [class.warning]="period.duration_minutes > 60"
                      [class.critical]="period.duration_minutes > 120">
                  {{ period.duration_minutes.toFixed(1) }} min
                </span>
              </td>
              <td>{{ getTimeOfDayLabel(period.hour_of_day) }}</td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- DAILY SUMMARY -->
      <!--div class="card mb-4">
        <h3 class="section-title">Daily Idle Summary</h3>
        <p-table [value]="dailySummary" [paginator]="true" [rows]="7" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Date</th>
              <th>Total Idle</th>
              <th>Sessions</th>
              <th>Longest Session</th>
              <th>Avg Session</th>
              <th>Status</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-day>
            <tr>
              <td>{{ day.date }}</td>
              <td>{{ day.total_idle_minutes.toFixed(1) }} min</td>
              <td>{{ day.idle_sessions_count }}</td>
              <td>{{ day.longest_idle_minutes.toFixed(1) }} min</td>
              <td>{{ day.avg_idle_minutes.toFixed(1) }} min</td>
              <td>
                <p-tag 
                  [value]="getDayStatus(day.total_idle_minutes)" 
                  [severity]="getDayStatusSeverity(day.total_idle_minutes)">
                </p-tag>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div-->

      <!-- WORK GAPS ANALYSIS -->
      <div class="card" *ngIf="workGaps">
        <h3 class="section-title">Work Activity Gaps</h3>
        <p class="card-subtitle">
          Detected {{ workGaps.total_gaps }} gaps totaling {{ workGaps.total_gap_minutes?.toFixed(1) }} minutes
        </p>
        <p-table [value]="workGaps.longest_gaps" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Time</th>
              <th>Duration</th>
              <th>Previous Activity</th>
              <th>Next Activity</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-gap>
            <tr>
              <td>{{ formatTime(gap.gap_start) }} - {{ formatTime(gap.gap_end) }}</td>
              <td>{{ gap.duration_minutes.toFixed(1) }} min</td>
              <td>{{ gap.previous_app }}</td>
              <td>{{ gap.next_app }}</td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- DETAILED IDLE SESSIONS TIMELINE -->
      <div class="card mt-4">
        <h3 class="section-title">All Idle Sessions</h3>
        <p-table [value]="idleSessions" [paginator]="true" [rows]="20" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Date</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Duration (min)</th>
              <th>Day</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-session>
            <tr>
              <td>{{ formatDate(session.start_time) }}</td>
              <td>{{ formatTime(session.start_time) }}</td>
              <td>{{ formatTime(session.end_time) }}</td>
              <td>{{ session.duration_minutes.toFixed(1) }}</td>
              <td>{{ session.day_of_week }}</td>
            </tr>
          </ng-template>
        </p-table>
      </div>

    </div>
  `,
  styles: [`
    .idle-analysis {
      padding: 1rem;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .stat-card i {
      font-size: 2.5rem;
    }

    .stat-card.idle i {
      color: #FF9800;
    }

    .stat-card.sessions i {
      color: #2196F3;
    }

    .stat-card.longest i {
      color: #F44336;
    }

    .stat-card.active i {
      color: #4CAF50;
    }

    .stat-content {
      flex: 1;
    }

    .stat-label {
      font-size: 0.875rem;
      color: #666;
      margin-bottom: 0.25rem;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: bold;
      color: #333;
    }

    .stat-subtitle {
      font-size: 0.875rem;
      color: #999;
    }

    .section-title {
      margin-bottom: 1.5rem;
      color: #333;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 0.5rem;
    }

    .patterns-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .pattern-card {
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #2196F3;
    }

    .pattern-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .pattern-name {
      font-weight: bold;
      color: #333;
    }

    .pattern-count {
      font-size: 0.875rem;
      color: #666;
    }

    .pattern-value {
      font-size: 1.5rem;
      font-weight: bold;
      color: #2196F3;
      margin: 0.5rem 0;
    }

    .pattern-avg {
      font-size: 0.875rem;
      color: #999;
    }

    .heatmap-container {
      margin: 1rem 0;
    }

    .heatmap-row {
      display: flex;
      align-items: center;
      margin-bottom: 4px;
    }

    .heatmap-label {
      width: 50px;
      font-size: 0.875rem;
      font-weight: bold;
      color: #666;
    }

    .heatmap-cells {
      display: flex;
      gap: 2px;
      flex: 1;
    }

    .heatmap-cell {
      flex: 1;
      height: 25px;
      border-radius: 2px;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .heatmap-cell:hover {
      transform: scale(1.2);
      z-index: 10;
    }

    .heatmap-cell.intensity-none {
      background: #f5f5f5;
    }

    .heatmap-cell.intensity-low {
      background: #FFF9C4;
    }

    .heatmap-cell.intensity-medium {
      background: #FFB74D;
    }

    .heatmap-cell.intensity-high {
      background: #F44336;
    }

    .heatmap-hours {
      display: flex;
      margin-left: 50px;
      margin-top: 0.5rem;
    }

    .heatmap-hours span {
      flex: 1;
      text-align: center;
      font-size: 0.75rem;
      color: #999;
    }

    .heatmap-legend {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-top: 1rem;
      font-size: 0.875rem;
      color: #666;
    }

    .legend-gradient {
      width: 200px;
      height: 20px;
      background: linear-gradient(to right, #FFF9C4, #FFB74D, #F44336);
      border-radius: 4px;
    }

    .duration-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      background: #E3F2FD;
      color: #1976D2;
      font-weight: bold;
    }

    .duration-badge.warning {
      background: #FFF3E0;
      color: #F57C00;
    }

    .duration-badge.critical {
      background: #FFEBEE;
      color: #C62828;
    }

    .text-warning {
      color: #FF9800;
    }

    .card-subtitle {
      color: #666;
      margin-bottom: 1rem;
      font-style: italic;
    }
  `]
})
export class IdleTimeAnalysisComponent implements OnChanges {
  @Input() idleData: any;
  @Input() heatmapData: any;

  statistics: any;
  idleSessions: any[] = [];
  longIdlePeriods: any[] = [];
  idlePatterns: Record<string, IdlePattern> = {};
  workGaps: any;
  dailySummary: any[] = [];
  
  hourlyIdleChartData: any;
  hourlyIdleChartOptions: any;
  dailyIdleChartData: any;
  dailyIdleChartOptions: any;

  ngOnChanges() {
    if (this.idleData) {
      this.processIdleData();
    }
  }

  processIdleData() {
    this.statistics = this.idleData.statistics;
    this.idleSessions = this.idleData.idle_sessions || [];
    this.longIdlePeriods = this.idleData.long_idle_periods || [];
    this.idlePatterns = this.idleData.idle_patterns || {};
    this.workGaps = this.idleData.work_gaps;
    this.dailySummary = this.idleData.daily_summary || [];

    this.prepareHourlyChart();
    this.prepareDailyChart();
  }

  prepareHourlyChart() {
    const hourlyData = this.idleData.hourly_idle || [];
    const labels = hourlyData.map(h => `${h.hour}:00`);
    const data = hourlyData.map(h => h.idle_minutes);

    this.hourlyIdleChartData = {
      labels,
      datasets: [{
        label: 'Idle Minutes',
        data,
        backgroundColor: '#FF9800',
        borderColor: '#F57C00',
        borderWidth: 1
      }]
    };

    this.hourlyIdleChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.parsed.y.toFixed(1)} minutes idle`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Minutes' }
        },
        x: {
          title: { display: true, text: 'Hour of Day' }
        }
      }
    };
  }

  prepareDailyChart() {
    const dailyData = this.idleData.daily_idle || [];
    const labels = dailyData.map(d => d.day.substring(0, 3));
    const data = dailyData.map(d => d.idle_minutes);

    this.dailyIdleChartData = {
      labels,
      datasets: [{
        label: 'Idle Minutes',
        data,
        backgroundColor: '#F44336',
        borderColor: '#C62828',
        borderWidth: 1
      }]
    };

    this.dailyIdleChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Minutes' }
        },
        x: {
          title: { display: true, text: 'Day of Week' }
        }
      }
    };
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getTimeOfDayLabel(hour: number): string {
    if (hour >= 6 && hour < 10) return 'Morning';
    if (hour >= 12 && hour < 14) return 'Lunch';
    if (hour >= 14 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 20) return 'Evening';
    return 'Off Hours';
  }

  getDayStatus(idleMinutes: number): string {
    if (idleMinutes < 60) return 'Excellent';
    if (idleMinutes < 120) return 'Good';
    if (idleMinutes < 180) return 'Fair';
    return 'High Idle';
  }

  getDayStatusSeverity(idleMinutes: number): any {
    if (idleMinutes < 60) return 'success';
    if (idleMinutes < 120) return 'info';
    if (idleMinutes < 180) return 'warn';
    return 'danger';
  }
}