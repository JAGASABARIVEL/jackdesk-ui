import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';

@Component({
  selector: 'app-login-logout-stats',
  standalone: true,
  imports: [CommonModule, CardModule, ChartModule],
  template: `
    <div class="login-logout-stats">
      
      <!-- Summary Cards -->
      <div class="stats-grid">
        <!-- Login Stats Card -->
        <div class="stat-card login-card">
          <div class="card-header">
            <i class="pi pi-sign-in"></i>
            <h4>Login Times</h4>
          </div>
          <div class="stat-row">
            <span class="label">Average Login:</span>
            <span class="value">{{ loginLogoutData?.login_stats?.avg_login_time || 'N/A' }}</span>
          </div>
          <div class="stat-row">
            <span class="label">Earliest Login:</span>
            <span class="value earliest">{{ loginLogoutData?.login_stats?.earliest_login || 'N/A' }}</span>
          </div>
          <div class="stat-row">
            <span class="label">Latest Login:</span>
            <span class="value latest">{{ loginLogoutData?.login_stats?.latest_login || 'N/A' }}</span>
          </div>
          <div class="stat-row">
            <span class="label">Login Days:</span>
            <span class="value">{{ loginLogoutData?.login_stats?.total_login_days || 0 }}</span>
          </div>
        </div>

        <!-- Logout Stats Card -->
        <div class="stat-card logout-card">
          <div class="card-header">
            <i class="pi pi-sign-out"></i>
            <h4>Logout Times</h4>
          </div>
          <div class="stat-row">
            <span class="label">Average Logout:</span>
            <span class="value">{{ loginLogoutData?.logout_stats?.avg_logout_time || 'N/A' }}</span>
          </div>
          <div class="stat-row">
            <span class="label">Earliest Logout:</span>
            <span class="value earliest">{{ loginLogoutData?.logout_stats?.earliest_logout || 'N/A' }}</span>
          </div>
          <div class="stat-row">
            <span class="label">Latest Logout:</span>
            <span class="value latest">{{ loginLogoutData?.logout_stats?.latest_logout || 'N/A' }}</span>
          </div>
          <div class="stat-row">
            <span class="label">Logout Days:</span>
            <span class="value">{{ loginLogoutData?.logout_stats?.total_logout_days || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-grid">
        <!-- Login Time Distribution -->
        <div class="chart-card">
          <h4>Login Time Distribution</h4>
          <p-chart 
            type="line" 
            [data]="loginChartData" 
            [options]="chartOptions"
            height="300px">
          </p-chart>
        </div>

        <!-- Logout Time Distribution -->
        <div class="chart-card">
          <h4>Logout Time Distribution</h4>
          <p-chart 
            type="line" 
            [data]="logoutChartData" 
            [options]="chartOptions"
            height="300px">
          </p-chart>
        </div>
      </div>

      <!-- Punctuality Analysis -->
      <div class="punctuality-card">
        <h4>Punctuality Analysis</h4>
        <div class="punctuality-grid">
          <div class="punctuality-item on-time">
            <i class="pi pi-check-circle"></i>
            <div class="content">
              <div class="count">{{ onTimeCount }}</div>
              <div class="label">On-Time Logins</div>
              <div class="subtitle">Before 9:30 AM</div>
            </div>
          </div>
          <div class="punctuality-item late">
            <i class="pi pi-exclamation-triangle"></i>
            <div class="content">
              <div class="count">{{ lateCount }}</div>
              <div class="label">Late Logins</div>
              <div class="subtitle">After 9:30 AM</div>
            </div>
          </div>
          <div class="punctuality-item early-leave">
            <i class="pi pi-clock"></i>
            <div class="content">
              <div class="count">{{ earlyLeaveCount }}</div>
              <div class="label">Early Departures</div>
              <div class="subtitle">Before 5:30 PM</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .login-logout-stats {
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;

        .stat-card {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

          .card-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #e2e8f0;

            i {
              font-size: 1.5rem;
            }

            h4 {
              margin: 0;
              font-size: 1.125rem;
              color: #2d3748;
            }
          }

          &.login-card {
            .card-header i {
              color: #48bb78;
            }
          }

          &.logout-card {
            .card-header i {
              color: #ed8936;
            }
          }

          .stat-row {
            display: flex;
            justify-content: space-between;
            padding: 0.75rem 0;
            border-bottom: 1px solid #f7fafc;

            &:last-child {
              border-bottom: none;
            }

            .label {
              color: #718096;
              font-size: 0.875rem;
            }

            .value {
              font-weight: 600;
              color: #2d3748;
              font-size: 1rem;

              &.earliest {
                color: #48bb78;
              }

              &.latest {
                color: #ed8936;
              }
            }
          }
        }
      }

      .charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;

        .chart-card {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

          h4 {
            margin: 0 0 1rem 0;
            font-size: 1.125rem;
            color: #2d3748;
          }
        }
      }

      .punctuality-card {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

        h4 {
          margin: 0 0 1.5rem 0;
          font-size: 1.125rem;
          color: #2d3748;
        }

        .punctuality-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;

          .punctuality-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            border-radius: 8px;

            i {
              font-size: 2rem;
            }

            .content {
              .count {
                font-size: 1.5rem;
                font-weight: 700;
                line-height: 1;
                margin-bottom: 0.25rem;
              }

              .label {
                font-size: 0.875rem;
                font-weight: 600;
                color: #4a5568;
              }

              .subtitle {
                font-size: 0.75rem;
                color: #a0aec0;
              }
            }

            &.on-time {
              background: #f0fff4;
              i { color: #48bb78; }
              .count { color: #48bb78; }
            }

            &.late {
              background: #fffaf0;
              i { color: #ed8936; }
              .count { color: #ed8936; }
            }

            &.early-leave {
              background: #ebf8ff;
              i { color: #4299e1; }
              .count { color: #4299e1; }
            }
          }
        }
      }
    }
  `]
})
export class LoginLogoutStatsComponent implements OnChanges {
  @Input() loginLogoutData: any;

  loginChartData: any;
  logoutChartData: any;
  chartOptions: any;

  onTimeCount = 0;
  lateCount = 0;
  earlyLeaveCount = 0;

  ngOnChanges(): void {
    if (this.loginLogoutData) {
      this.prepareCharts();
      this.analyzePunctuality();
    }
  }

  prepareCharts(): void {
    const loginTimes = this.loginLogoutData.login_times || [];
    const logoutTimes = this.loginLogoutData.logout_times || [];

    // Login chart
    this.loginChartData = {
      labels: loginTimes.map(l => new Date(l.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Login Time (24h format)',
        data: loginTimes.map(l => l.hour + (l.minute / 60)),
        borderColor: '#48bb78',
        backgroundColor: 'rgba(72, 187, 120, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };

    // Logout chart
    this.logoutChartData = {
      labels: logoutTimes.map(l => new Date(l.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Logout Time (24h format)',
        data: logoutTimes.map(l => l.hour + (l.minute / 60)),
        borderColor: '#ed8936',
        backgroundColor: 'rgba(237, 137, 54, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const value = context.parsed.y;
              const hours = Math.floor(value);
              const minutes = Math.round((value - hours) * 60);
              return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 6,
          max: 22,
          ticks: {
            callback: (value: any) => `${Math.floor(value)}:00`
          }
        }
      }
    };
  }

  analyzePunctuality(): void {
    const loginTimes = this.loginLogoutData.login_times || [];
    const logoutTimes = this.loginLogoutData.logout_times || [];

    // Count on-time and late logins (9:30 AM threshold)
    this.onTimeCount = loginTimes.filter(l => {
      const timeInMinutes = l.hour * 60 + l.minute;
      return timeInMinutes <= (9 * 60 + 30); // 9:30 AM
    }).length;

    this.lateCount = loginTimes.length - this.onTimeCount;

    // Count early departures (before 5:30 PM)
    this.earlyLeaveCount = logoutTimes.filter(l => {
      const timeInMinutes = l.hour * 60 + l.minute;
      return timeInMinutes < (17 * 60 + 30); // 5:30 PM
    }).length;
  }
}