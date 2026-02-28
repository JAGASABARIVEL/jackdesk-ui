import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { UserManagerService } from '../../../shared/services/user-manager.service';
import { Subject, takeUntil, forkJoin } from 'rxjs';

// Import child components
import { PayrollDashboardComponent } from './payroll-dashboard/payroll-dashboard.component';
import { RealtimeStatusComponent } from './realtime-status/realtime-status.component';
import { EnhancedProductivityService } from '../../../shared/services/enhanced-productivity.service';
import { TeamComparisonComponent } from './team-comparison/team-comparison.component';
import { LayoutService } from '../../../layout/service/app.layout.service';

@Component({
  selector: 'app-productivity',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TabsModule,
    ButtonModule,
    SelectModule,
    DatePickerModule,
    PayrollDashboardComponent,
    RealtimeStatusComponent,
    TeamComparisonComponent
  ],
  template: `
    <div class="productivity-container">
      
      <!-- HEADER -->
      <div class="header-section" *ngIf="childPayroleComponentActive">
        <h2>Productivity & Payroll Analytics</h2>
        <p class="subtitle">Comprehensive work hours tracking and salary calculations</p>
      </div>

      <!-- FILTERS -->
      <div class="card filter-card" *ngIf="childPayroleComponentActive">
        <div class="filter-grid">
          
          <!-- Employee Selection -->
          <div class="filter-item">
            <label class="filter-label">Employee</label>
            <p-select
              [(ngModel)]="selected_user"
              [options]="registeredUsers"
              optionLabel="details.email"
              optionValue="details.id"
              placeholder="Select Employee"
              [filter]="true"
              [showClear]="true"
              appendTo="body"
              styleClass="w-full">
            </p-select>
          </div>

          <!-- From Date -->
          <div class="filter-item">
            <label class="filter-label">From Date</label>
            <p-datepicker
              [(ngModel)]="fromDates"
              [showIcon]="true"
              dateFormat="yy-mm-dd"
              placeholder="Start Date"
              styleClass="w-full">
            </p-datepicker>
          </div>

          <!-- To Date -->
          <div class="filter-item">
            <label class="filter-label">To Date</label>
            <p-datepicker
              [(ngModel)]="toDates"
              [showIcon]="true"
              dateFormat="yy-mm-dd"
              placeholder="End Date"
              styleClass="w-full">
            </p-datepicker>
          </div>

          <!-- Action Buttons -->
          <div class="filter-actions">
            <button
              pButton
              label="Generate Report"
              icon="pi pi-search"
              class="p-button-primary"
              [disabled]="!selected_user || !fromDates || !toDates"
              (click)="getProductivityData()">
            </button>
            <!--button
              pButton
              label="Export PDF"
              icon="pi pi-file-pdf"
              class="p-button-success"
              [disabled]="!hasData"
              (click)="exportToPDF()">
            </button-->
          </div>
        </div>
      </div>

      <!-- LOADING STATE -->
      <div *ngIf="loading" class="loading-container card">
        <i class="pi pi-spin pi-spinner loading-icon"></i>
        <p>Loading productivity data...</p>
      </div>

      <!-- MAIN CONTENT -->
      <div *ngIf="!loading && hasData">
        
        <!-- INDIVIDUAL EMPLOYEE VIEW -->
        <div *ngIf="selected_user">
          <div class="card">
            <app-payroll-dashboard
                    *ngIf="payrollData"
                    [employeeData]="payrollData"
                    [selectedUser]="selected_user"
                    (noSelectedUserEvent)='onchildPayroleComponentChange($event)'>
                  </app-payroll-dashboard>
          </div>
        </div>

        <!-- TEAM VIEW -->
        <div *ngIf="!selected_user && profile?.user?.role !== 'individual' && profile?.user?.role !== 'employee'">
          <!-- Team Overview Tabs -->
          <div class="card">
            <p-tabs [(value)]="teamTab">
              <p-tablist>
                <p-tab [value]="0">
                  <i class="pi pi-users mr-2"></i>
                  <span>Status</span>
                </p-tab>
                <p-tab [value]="1">
                  <i class="pi pi-pause-circle mr-2"></i>
                  <span>Overview</span>
                </p-tab>
              </p-tablist>

              <p-tabpanels>
                <p-tabpanel [value]="0">
                  <!-- Real-time Status -->
                    <app-realtime-status
                      *ngIf="realtimeStatusData"
                      [statusData]="realtimeStatusData"
                      (refresh)="loadRealtimeStatus()">
                    </app-realtime-status>
                </p-tabpanel>

                <p-tabpanel [value]="1">
                  <app-team-comparison
                    *ngIf="teamData"
                    [teamData]="teamData">
                  </app-team-comparison>
                </p-tabpanel>

                
              </p-tabpanels>
            </p-tabs>
          </div>
        </div>
      </div>

      <!-- EMPTY STATE -->
      <div *ngIf="!loading && !hasData" class="empty-state card">
        <i class="pi pi-chart-line empty-icon"></i>
        <h3>No Data Available</h3>
        <p>Select date range and click "Generate Report"</p>
        <p class="hint">Leave employee field blank for team overview</p>
      </div>

    </div>
  `,
  styles: [`
    .productivity-container {
      padding: 1.5rem;
      background: #f5f7fa;
      min-height: 100vh;

      .header-section {
        margin-bottom: 1.5rem;

        h2 {
          font-size: 2rem;
          font-weight: 700;
          color: #1a202c;
          margin: 0 0 0.5rem 0;
        }

        .subtitle {
          font-size: 1rem;
          color: #718096;
          margin: 0;
        }
      }

      .filter-card {
        margin-bottom: 1.5rem;

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          align-items: end;

          .filter-item {
            display: flex;
            flex-direction: column;

            .filter-label {
              font-size: 0.875rem;
              font-weight: 600;
              color: #4a5568;
              margin-bottom: 0.5rem;
            }
          }

          .filter-actions {
            display: flex;
            gap: 0.5rem;

            button {
              flex: 1;
            }
          }
        }
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;

        .loading-icon {
          font-size: 3rem;
          color: #3182ce;
          margin-bottom: 1rem;
        }

        p {
          font-size: 1.125rem;
          color: #718096;
        }
      }

      .empty-state {
        text-align: center;
        padding: 4rem 2rem;

        .empty-icon {
          font-size: 4rem;
          color: #cbd5e0;
          margin-bottom: 1rem;
        }

        h3 {
          font-size: 1.5rem;
          color: #2d3748;
          margin: 0 0 0.5rem 0;
        }

        p {
          color: #718096;
          margin: 0.5rem 0;
        }

        .hint {
          font-size: 0.875rem;
          color: #a0aec0;
          font-style: italic;
        }
      }

      .card {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

        &.mb-4 {
          margin-bottom: 1.5rem;
        }
      }

      .w-full {
        width: 100%;
      }

      .mr-2 {
        margin-right: 0.5rem;
      }

      ::ng-deep {
        .p-tablist {
          border-bottom: 2px solid #e2e8f0;

          .p-tab {
            padding: 1rem 1.5rem;
            font-weight: 600;
            color: #718096;

            &:hover {
              color: #3182ce;
              background: #ebf8ff;
            }

            &.p-tab-active {
              color: #3182ce;
              border-bottom: 3px solid #3182ce;
            }
          }
        }

        .p-tabpanels {
          padding: 1.5rem;
        }
      }
    }

    @media (max-width: 768px) {
      .productivity-container {
        padding: 1rem;

        .filter-card .filter-grid {
          grid-template-columns: 1fr;

          .filter-actions {
            flex-direction: column;

            button {
              width: 100%;
            }
          }
        }
      }
    }
  `]
})
export class ProductivityComponent implements OnInit, OnDestroy {
  profile: any;
  private destroy$ = new Subject<void>();

  registeredUsers: any[] = [];
  selected_user: number | undefined = undefined;
  fromDates: Date;
  toDates: Date;

  // Tab management
  activeTab: number = 0;
  teamTab: number = 0;

  // Data containers
  payrollData: any = null;
  teamData: any = null;
  idleAnalysisData: any = null;
  heatmapData: any = null;
  teamIdleData: any = null;
  realtimeStatusData: any = null;

  // State
  loading = false;
  hasData = false;
  childPayroleComponentActive = true;

  constructor(
    private router: Router,
    private userManagerService: UserManagerService,
    private payrollService: EnhancedProductivityService,
    private layoutService: LayoutService
  ) {}

  ngOnInit(): void {
    this.profile = JSON.parse(localStorage.getItem('profile') || '{}');
    if (!this.profile?.user) {
      this.router.navigate(['/apps/login']);
      return;
    }
    this.loadEmployees();
    this.setDefaultDateRange();
    this.layoutService.state.staticMenuDesktopInactive = true;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onchildPayroleComponentChange($event) {
    this.childPayroleComponentActive = $event;
    if (this.childPayroleComponentActive) {
      this.selected_user = null;
      this.clearData();
    }
  }

  loadEmployees(): void {
    this.userManagerService.list_users()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          if (this.profile?.user?.role !== 'individual' && this.profile?.user?.role !== 'employee') {
            this.registeredUsers = data;
          }
          else {
            this.registeredUsers = data.filter((user_record)=>user_record?.details?.id === this.profile?.user?.id)
            this.selected_user = this.registeredUsers ? this.registeredUsers[0].details.id : null;
          }
        },
        error: (err) => console.error('Failed to load employees', err)
      });
  }

  setDefaultDateRange(): void {
    this.toDates = new Date();
    this.fromDates = new Date();
    this.fromDates.setDate(this.fromDates.getDate() - 30);
  }

  getProductivityData(): void {
    if (!this.fromDates || !this.toDates) return;

    this.loading = true;
    this.clearData();

    const startDate = this.fromDates.toISOString();
    const endDate = this.toDates.toISOString();

    if (this.selected_user) {
      this.loadEmployeeData(this.selected_user, startDate, endDate);
    } else {
      this.loadTeamData(startDate, endDate);
    }
  }

  private loadEmployeeData(userId: number, startDate: string, endDate: string): void {
    forkJoin({
      attendance: this.payrollService.getAttendanceSummary(userId, startDate, endDate),
      loginLogout: this.payrollService.getLoginLogoutStats(userId, startDate, endDate),
      weekly: this.payrollService.getWeeklyBreakdown(userId, startDate, endDate),
      userDetail: this.payrollService.getUserDetail(userId, startDate, endDate),
      idleAnalysis: this.payrollService.getIdleTimeAnalysis(userId, startDate, endDate),
      heatmap: this.payrollService.getIdleTimeHeatmap(userId, startDate, endDate),
      appUsage: this.payrollService.getUserAppUsage(userId, startDate, endDate)
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.payrollData = {
            attendance: results.attendance,
            loginLogout: results.loginLogout,
            weekly: results.weekly,
            userDetail: results.userDetail,
            idleAnalysis: results.idleAnalysis,
            heatmap : results.heatmap.heatmap,
            appUsage : results.appUsage.app_usage || []
          };
          this.idleAnalysisData = results.idleAnalysis;
          this.heatmapData = results.heatmap.heatmap;
          this.hasData = true;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load employee data', err);
          this.loading = false;
        }
      });
  }

  private loadTeamData(startDate: string, endDate: string): void {
    forkJoin({
      team: this.payrollService.getTeamPayrollSummary(startDate, endDate),
      teamIdle: this.payrollService.getTeamIdleComparison(startDate, endDate),
      realtime: this.payrollService.getRealtimeStatus()
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.teamData = results.team;
          this.teamIdleData = results.teamIdle;
          this.realtimeStatusData = results.realtime;
          this.hasData = true;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load team data', err);
          this.loading = false;
        }
      });
  }

  private clearData(): void {
    this.payrollData = null;
    this.teamData = null;
    this.idleAnalysisData = null;
    this.heatmapData = null;
    this.teamIdleData = null;
    this.hasData = false;
  }

  loadRealtimeStatus(): void {
    this.payrollService.getRealtimeStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.realtimeStatusData = data;
        },
        error: (err) => console.error('Failed to refresh real-time status', err)
      });
  }

  exportToPDF(): void {
    alert('PDF export functionality to be implemented');
  }
}