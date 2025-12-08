import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';

@Component({
  selector: 'app-usage-analytics',
  standalone: true,
  imports: [CommonModule, ChartModule, TableModule, TagModule, CardModule, ProgressBarModule],
  template: `
    <div class="app-usage-analytics">
      
      <!-- TOP APPS SUMMARY -->
      <div class="summary-cards">
        <div class="summary-card productive">
          <div class="icon">
            <i class="pi pi-check-circle"></i>
          </div>
          <div class="content">
            <div class="label">Productive Apps</div>
            <div class="value">{{ productiveAppsCount }}</div>
            <div class="subtitle">{{ productiveHours }}h total</div>
          </div>
        </div>

        <div class="summary-card neutral">
          <div class="icon">
            <i class="pi pi-minus-circle"></i>
          </div>
          <div class="content">
            <div class="label">Neutral Apps</div>
            <div class="value">{{ neutralAppsCount }}</div>
            <div class="subtitle">{{ neutralHours }}h total</div>
          </div>
        </div>

        <div class="summary-card unproductive">
          <div class="icon">
            <i class="pi pi-times-circle"></i>
          </div>
          <div class="content">
            <div class="label">Unproductive Apps</div>
            <div class="value">{{ unproductiveAppsCount }}</div>
            <div class="subtitle">{{ unproductiveHours }}h total</div>
          </div>
        </div>

        <div class="summary-card total">
          <div class="icon">
            <i class="pi pi-desktop"></i>
          </div>
          <div class="content">
            <div class="label">Total Applications</div>
            <div class="value">{{ totalAppsCount }}</div>
            <div class="subtitle">{{ totalHours }}h tracked</div>
          </div>
        </div>
      </div>

      <!-- TOP 10 APPS VISUALIZATION -->
      <div class="card chart-card">
        <h3 class="section-title">
          <i class="pi pi-chart-bar mr-2"></i>
          Top 10 Applications by Usage Time
        </h3>
        <p-chart 
          type="bar" 
          [data]="topAppsChartData" 
          [options]="topAppsChartOptions"
          height="350px">
        </p-chart>
      </div>

      <!-- PRODUCTIVITY PIE CHART -->
      <div class="grid">
        <div class="col-6">
          <div class="card">
            <h3 class="section-title">Productivity Distribution</h3>
            <p-chart 
              type="doughnut" 
              [data]="productivityPieData" 
              [options]="pieChartOptions"
              height="300px">
            </p-chart>
          </div>
        </div>

        <!-- CATEGORY BREAKDOWN -->
        <div class="col-6">
          <div class="card">
            <h3 class="section-title">App Categories</h3>
            <div class="category-list">
              <div class="category-item" *ngFor="let category of categories">
                <div class="category-header">
                  <span class="category-name">{{ category.name }}</span>
                  <span class="category-time">{{ category.hours }}h</span>
                </div>
                <p-progressBar 
                  [value]="category.percentage" 
                  [showValue]="false"
                  [style]="{'height': '8px'}"
                  [styleClass]="'category-' + category.tag">
                </p-progressBar>
                <div class="category-apps">
                  <span *ngFor="let app of category.topApps" class="app-chip">{{ app }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- DETAILED APP TABLE -->
      <div class="card">
        <h3 class="section-title">
          <i class="pi pi-list mr-2"></i>
          Detailed Application Usage
        </h3>
        <p-table 
          [value]="appUsageData" 
          [paginator]="true" 
          [rows]="10"
          [rowsPerPageOptions]="[10, 25, 50, 100]"
          sortField="total_minutes"
          [sortOrder]="-1"
          [globalFilterFields]="['app_name', 'window_title']"
          styleClass="p-datatable-sm p-datatable-striped">
          
          <ng-template pTemplate="caption">
            <div class="flex justify-content-between align-items-center">
              <span class="table-caption">All Applications ({{ appUsageData.length }} apps)</span>
              <span class="p-input-icon-left">
                <i class="pi pi-search"></i>
                <input 
                  pInputText 
                  type="text" 
                  (input)="filterTable($event)" 
                  placeholder="Search apps..."
                  class="search-input" />
              </span>
            </div>
          </ng-template>

          <ng-template pTemplate="header">
            <tr>
              <th style="width: 3rem">#</th>
              <th pSortableColumn="app_name">
                Application <p-sortIcon field="app_name"></p-sortIcon>
              </th>
              <th pSortableColumn="window_title">
                Window Title <p-sortIcon field="window_title"></p-sortIcon>
              </th>
              <th pSortableColumn="productivity_tag">
                Category <p-sortIcon field="productivity_tag"></p-sortIcon>
              </th>
              <th pSortableColumn="total_minutes">
                Time Spent <p-sortIcon field="total_minutes"></p-sortIcon>
              </th>
              <th>Percentage</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-app let-rowIndex="rowIndex">
            <tr>
              <td>{{ rowIndex + 1 }}</td>
              <td>
                <div class="app-cell">
                  <i class="pi pi-desktop app-icon"></i>
                  <span class="app-name">{{ app.app_name }}</span>
                </div>
              </td>
              <td>
                <span class="window-title" [title]="app.window_title">
                  {{ truncateText(app.window_title, 50) }}
                </span>
              </td>
              <td>
                <p-tag 
                  [value]="app.productivity_tag.toUpperCase()"
                  [severity]="getTagSeverity(app.productivity_tag)">
                </p-tag>
              </td>
              <td>
                <div class="time-cell">
                  <span class="hours">{{ formatHours(app.total_minutes) }}</span>
                  <span class="minutes">({{ app.total_minutes.toFixed(0) }} min)</span>
                </div>
              </td>
              <td>
                <div class="percentage-cell">
                  <p-progressBar 
                    [value]="app.percentage" 
                    [showValue]="false"
                    [style]="{'height': '6px', 'width': '80px'}"
                    [styleClass]="getProgressClass(app.productivity_tag)">
                  </p-progressBar>
                  <span class="percentage-text">{{ app.percentage.toFixed(1) }}%</span>
                </div>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6" class="text-center">No application data available</td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- PRODUCTIVITY INSIGHTS -->
      <div class="card insights-card">
        <h3 class="section-title">
          <i class="pi pi-lightbulb mr-2"></i>
          Productivity Insights
        </h3>
        <div class="insights-grid">
          <div class="insight-item" *ngIf="mostUsedApp">
            <i class="pi pi-star insight-icon"></i>
            <div class="insight-content">
              <div class="insight-label">Most Used App</div>
              <div class="insight-value">{{ mostUsedApp.app_name }}</div>
              <div class="insight-detail">{{ formatHours(mostUsedApp.total_minutes) }} hours</div>
            </div>
          </div>

          <div class="insight-item" *ngIf="longestSession">
            <i class="pi pi-clock insight-icon"></i>
            <div class="insight-content">
              <div class="insight-label">Longest Session</div>
              <div class="insight-value">{{ longestSession.app_name }}</div>
              <div class="insight-detail">{{ formatHours(longestSession.total_minutes) }} hours</div>
            </div>
          </div>

          <div class="insight-item">
            <i class="pi pi-chart-pie insight-icon"></i>
            <div class="insight-content">
              <div class="insight-label">Productivity Score</div>
              <div class="insight-value">{{ productivityScore }}%</div>
              <div class="insight-detail" [class]="getScoreClass()">{{ getScoreLabel() }}</div>
            </div>
          </div>

          <div class="insight-item">
            <i class="pi pi-users insight-icon"></i>
            <div class="insight-content">
              <div class="insight-label">Focus Time</div>
              <div class="insight-value">{{ focusTimeHours }}h</div>
              <div class="insight-detail">Uninterrupted work</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .app-usage-analytics {
      padding: 1rem;

      .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;

        .summary-card {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s, box-shadow 0.2s;

          &:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .icon {
            width: 60px;
            height: 60px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;

            i {
              font-size: 2rem;
              color: white;
            }
          }

          &.productive .icon {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
          }

          &.neutral .icon {
            background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%);
          }

          &.unproductive .icon {
            background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
          }

          &.total .icon {
            background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
          }

          .content {
            flex: 1;

            .label {
              font-size: 0.875rem;
              color: #718096;
              margin-bottom: 0.25rem;
            }

            .value {
              font-size: 2rem;
              font-weight: 700;
              color: #2d3748;
              line-height: 1;
            }

            .subtitle {
              font-size: 0.875rem;
              color: #a0aec0;
              margin-top: 0.25rem;
            }
          }
        }
      }

      .section-title {
        display: flex;
        align-items: center;
        margin-bottom: 1.5rem;
        font-size: 1.25rem;
        color: #2d3748;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 0.75rem;
      }

      .chart-card {
        margin-bottom: 2rem;
      }

      .category-list {
        .category-item {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #e2e8f0;

          &:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }

          .category-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;

            .category-name {
              font-weight: 600;
              color: #2d3748;
            }

            .category-time {
              font-weight: 700;
              color: #4299e1;
              font-size: 1.125rem;
            }
          }

          .category-apps {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 0.75rem;

            .app-chip {
              padding: 0.25rem 0.75rem;
              background: #edf2f7;
              color: #4a5568;
              border-radius: 12px;
              font-size: 0.75rem;
              font-weight: 500;
            }
          }
        }
      }

      .app-cell {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .app-icon {
          color: #4299e1;
          font-size: 1.25rem;
        }

        .app-name {
          font-weight: 600;
          color: #2d3748;
        }
      }

      .window-title {
        color: #718096;
        font-size: 0.875rem;
      }

      .time-cell {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;

        .hours {
          font-weight: 700;
          color: #2d3748;
          font-size: 1rem;
        }

        .minutes {
          font-size: 0.75rem;
          color: #a0aec0;
        }
      }

      .percentage-cell {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        .percentage-text {
          font-weight: 600;
          color: #4a5568;
          min-width: 45px;
        }
      }

      .insights-card {
        .insights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;

          .insight-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1.5rem;
            background: #f7fafc;
            border-radius: 8px;
            border-left: 4px solid #4299e1;

            .insight-icon {
              font-size: 2rem;
              color: #4299e1;
            }

            .insight-content {
              .insight-label {
                font-size: 0.75rem;
                color: #718096;
                margin-bottom: 0.25rem;
              }

              .insight-value {
                font-size: 1.25rem;
                font-weight: 700;
                color: #2d3748;
                margin-bottom: 0.25rem;
              }

              .insight-detail {
                font-size: 0.875rem;
                color: #a0aec0;

                &.excellent { color: #48bb78; }
                &.good { color: #4299e1; }
                &.average { color: #ed8936; }
                &.poor { color: #f56565; }
              }
            }
          }
        }
      }

      .table-caption {
        font-weight: 600;
        color: #2d3748;
        font-size: 1rem;
      }

      .search-input {
        padding: 0.5rem 1rem 0.5rem 2.5rem;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        width: 300px;
      }

      .text-center {
        text-align: center;
      }

      .mr-2 {
        margin-right: 0.5rem;
      }

      ::ng-deep {
        .category-productive .p-progressbar-value {
          background: #48bb78;
        }

        .category-neutral .p-progressbar-value {
          background: #ed8936;
        }

        .category-unproductive .p-progressbar-value {
          background: #f56565;
        }

        .p-datatable {
          .p-datatable-tbody > tr:hover {
            background: #f7fafc;
          }
        }
      }
    }
  `]
})
export class AppUsageAnalyticsComponent implements OnChanges {
  @Input() appUsageData: any[] = [];

  // Summary stats
  productiveAppsCount = 0;
  neutralAppsCount = 0;
  unproductiveAppsCount = 0;
  totalAppsCount = 0;
  productiveHours = 0;
  neutralHours = 0;
  unproductiveHours = 0;
  totalHours = 0;

  // Charts
  topAppsChartData: any;
  topAppsChartOptions: any;
  productivityPieData: any;
  pieChartOptions: any;

  // Categories
  categories: any[] = [];

  // Insights
  mostUsedApp: any;
  longestSession: any;
  productivityScore = 0;
  focusTimeHours = 0;

  private filteredData: any[] = [];

  ngOnChanges(): void {
    if (this.appUsageData && this.appUsageData.length > 0) {
      this.filteredData = [...this.appUsageData];
      this.processData();
      this.prepareCharts();
      this.calculateInsights();
    }
  }

  processData(): void {
    // Calculate total minutes for percentage
    const totalMinutes = this.appUsageData.reduce((sum, app) => sum + app.total_minutes, 0);

    // Add percentage to each app
    this.appUsageData = this.appUsageData.map(app => ({
      ...app,
      percentage: totalMinutes > 0 ? (app.total_minutes / totalMinutes) * 100 : 0
    }));

    // Calculate summary stats
    this.totalAppsCount = this.appUsageData.length;
    this.totalHours = totalMinutes / 60;

    const productive = this.appUsageData.filter(a => a.productivity_tag === 'productive');
    const neutral = this.appUsageData.filter(a => a.productivity_tag === 'neutral');
    const unproductive = this.appUsageData.filter(a => a.productivity_tag === 'unproductive');

    this.productiveAppsCount = productive.length;
    this.neutralAppsCount = neutral.length;
    this.unproductiveAppsCount = unproductive.length;

    this.productiveHours = Math.round(productive.reduce((sum, a) => sum + a.total_minutes, 0) / 60);
    this.neutralHours = Math.round(neutral.reduce((sum, a) => sum + a.total_minutes, 0) / 60);
    this.unproductiveHours = Math.round(unproductive.reduce((sum, a) => sum + a.total_minutes, 0) / 60);

    // Build categories
    this.categories = [
      {
        name: 'Productive Applications',
        tag: 'productive',
        hours: this.productiveHours,
        percentage: totalMinutes > 0 ? (this.productiveHours * 60 / totalMinutes) * 100 : 0,
        topApps: productive.slice(0, 5).map(a => a.app_name)
      },
      {
        name: 'Neutral Applications',
        tag: 'neutral',
        hours: this.neutralHours,
        percentage: totalMinutes > 0 ? (this.neutralHours * 60 / totalMinutes) * 100 : 0,
        topApps: neutral.slice(0, 5).map(a => a.app_name)
      },
      {
        name: 'Unproductive Applications',
        tag: 'unproductive',
        hours: this.unproductiveHours,
        percentage: totalMinutes > 0 ? (this.unproductiveHours * 60 / totalMinutes) * 100 : 0,
        topApps: unproductive.slice(0, 5).map(a => a.app_name)
      }
    ];
  }

  prepareCharts(): void {
    // Top 10 Apps Bar Chart
    const top10 = [...this.appUsageData]
      .sort((a, b) => b.total_minutes - a.total_minutes)
      .slice(0, 10);

    this.topAppsChartData = {
      labels: top10.map(a => this.truncateText(a.app_name, 20)),
      datasets: [{
        label: 'Hours',
        data: top10.map(a => (a.total_minutes / 60).toFixed(2)),
        backgroundColor: top10.map(a => this.getBarColor(a.productivity_tag)),
        borderColor: top10.map(a => this.getBarBorderColor(a.productivity_tag)),
        borderWidth: 2
      }]
    };

    this.topAppsChartOptions = {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context: any) => `${context.parsed.x.toFixed(2)} hours`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          title: { display: true, text: 'Hours' }
        }
      }
    };

    // Productivity Pie Chart
    this.productivityPieData = {
      labels: ['Productive', 'Neutral', 'Unproductive'],
      datasets: [{
        data: [this.productiveHours, this.neutralHours, this.unproductiveHours],
        backgroundColor: ['#48bb78', '#ed8936', '#f56565'],
        borderColor: ['#38a169', '#dd6b20', '#e53e3e'],
        borderWidth: 2
      }]
    };

    this.pieChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            font: { size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: ${value}h (${percentage}%)`;
            }
          }
        }
      }
    };
  }

  calculateInsights(): void {
    // Most used app
    this.mostUsedApp = [...this.appUsageData]
      .sort((a, b) => b.total_minutes - a.total_minutes)[0];

    // Longest session (assuming it's the same as most used for simplicity)
    this.longestSession = this.mostUsedApp;

    // Productivity score
    const totalTime = this.productiveHours + this.neutralHours + this.unproductiveHours;
    this.productivityScore = totalTime > 0 
      ? Math.round(((this.productiveHours + this.neutralHours * 0.5) / totalTime) * 100)
      : 0;

    // Focus time (productive hours)
    this.focusTimeHours = this.productiveHours;
  }

  getTagSeverity(tag: string): any {
    switch (tag) {
      case 'productive': return 'success';
      case 'neutral': return 'warn';
      case 'unproductive': return 'danger';
      default: return 'info';
    }
  }

  getProgressClass(tag: string): string {
    return `category-${tag}`;
  }

  getBarColor(tag: string): string {
    switch (tag) {
      case 'productive': return 'rgba(72, 187, 120, 0.8)';
      case 'neutral': return 'rgba(237, 137, 54, 0.8)';
      case 'unproductive': return 'rgba(245, 101, 101, 0.8)';
      default: return 'rgba(66, 153, 225, 0.8)';
    }
  }

  getBarBorderColor(tag: string): string {
    switch (tag) {
      case 'productive': return '#38a169';
      case 'neutral': return '#dd6b20';
      case 'unproductive': return '#e53e3e';
      default: return '#3182ce';
    }
  }

  formatHours(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  getScoreClass(): string {
    if (this.productivityScore >= 80) return 'excellent';
    if (this.productivityScore >= 60) return 'good';
    if (this.productivityScore >= 40) return 'average';
    return 'poor';
  }

  getScoreLabel(): string {
    if (this.productivityScore >= 80) return 'Excellent!';
    if (this.productivityScore >= 60) return 'Good';
    if (this.productivityScore >= 40) return 'Average';
    return 'Needs Improvement';
  }

  filterTable(event: any): void {
    const searchTerm = event.target.value.toLowerCase();
    if (!searchTerm) {
      this.appUsageData = [...this.filteredData];
    } else {
      this.appUsageData = this.filteredData.filter(app => 
        app.app_name.toLowerCase().includes(searchTerm) ||
        app.window_title.toLowerCase().includes(searchTerm)
      );
    }
  }
}