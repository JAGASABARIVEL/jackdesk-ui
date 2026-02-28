import { Component, OnInit, OnDestroy, Input, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';

// PrimeNG Imports
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';

// Services
import { UserManagerService } from '../../../../shared/services/user-manager.service';
import { EnhancedProductivityService } from '../../../../shared/services/enhanced-productivity.service';

// Child Components
import { AttendanceTableComponent } from '../attendance-table/attendance-table.component';
import { WeeklyTrendsComponent } from '../weekly-trends/weekly-trends.component';
import { TeamComparisonComponent } from '../team-comparison/team-comparison.component';
import { LoginLogoutStatsComponent } from '../login-logout-stats/login-logout-stats.component';
import { IdleTimeAnalysisComponent } from '../idle-time-analysis/idle-time-analysis.component';
import { RealtimeStatusComponent } from '../realtime-status/realtime-status.component';
import { AppUsageAnalyticsComponent } from '../app-usage-analytics/app-usage-analytics.component';
import { HoursToTimePipe } from '../../../../shared/pipes/hourstotime.pipe';


@Component({
  selector: 'app-payroll-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TabsModule,
    ButtonModule,
    SelectModule,
    DatePickerModule,
    TableModule,
    TagModule,
    CardModule,
    ChartModule,
    AttendanceTableComponent,
    WeeklyTrendsComponent,
    TeamComparisonComponent,
    LoginLogoutStatsComponent,
    IdleTimeAnalysisComponent,
    RealtimeStatusComponent,
    AppUsageAnalyticsComponent,
    HoursToTimePipe
  ],
  templateUrl: './payroll-dashboard.component.html',
  styleUrls: ['./payroll-dashboard.component.scss']
})
export class PayrollDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // User and date selection
  profile: any;
  registeredUsers: any[] = [];
  @Input() selectedUser: number | null = null;
  fromDate: Date;
  toDate: Date;
  _employeeData: any;

  @Input() set employeeData(value: any) {
    if (!value) return;
    this.noSelectedUserEvent.emit(false);
    
    this._employeeData = value;
    this.attendanceData = value.attendance;
    this.loginLogoutData = value.loginLogout;
    this.weeklyData = value.weekly;
    this.userDetailData = value.userDetail;
    this.idleAnalysisData = value.idleAnalysis;
    this.heatmapData = value.heatmap;
    this.appUsageData = value.appUsage;
    
    // Build summary from attendance data
    if (value.attendance?.summary) {
      this.buildPayrollSummary(value.attendance.summary);
    }
  }

  get employeeData() {
    return this._employeeData;
  }

  // Tab management
  activeTab: number = 0;
  
  // Data containers
  attendanceData: any = null;
  loginLogoutData: any = null;
  weeklyData: any = null;
  teamData: any = null;
  idleAnalysisData: any = null;
  heatmapData: any = null;
  realtimeStatusData: any = null;
  userDetailData: any = null;
  appUsageData: any[] = [];
  
  // Summary metrics
  payrollSummary: any = null;
  
  // Loading state
  loading = false;

  constructor(
    private payrollService: EnhancedProductivityService,
    private userManagerService: UserManagerService
  ) {}

  ngOnInit(): void {
    this.profile = JSON.parse(localStorage.getItem('profile') || '{}');
    this.loadEmployees();
    this.setDefaultDateRange();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEmployees(): void {
    this.userManagerService.list_users()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.registeredUsers = data;
        },
        error: (err) => console.error('Failed to load employees', err)
      });
  }

  setDefaultDateRange(): void {
    this.toDate = new Date();
    this.fromDate = new Date();
    this.fromDate.setDate(this.fromDate.getDate() - 30); // Default 30 days
  }

  generateReport(): void {
    if (!this.fromDate || !this.toDate) {
      alert('Please select both start and end dates');
      return;
    }

    this.loading = true;
    this.clearData();

    const startDate = this.fromDate.toISOString();
    const endDate = this.toDate.toISOString();

    if (this.selectedUser) {
      // Load individual employee data
      this.loadEmployeeData(this.selectedUser, startDate, endDate);
    } else {
      // Load team overview data
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
          this.attendanceData = results.attendance;
          this.loginLogoutData = results.loginLogout;
          this.weeklyData = results.weekly;
          this.userDetailData = results.userDetail;
          this.idleAnalysisData = results.idleAnalysis;
          this.heatmapData = results.heatmap.heatmap;
          this.appUsageData = results.appUsage.app_usage || [];
          
          // Build summary from attendance data
          this.buildPayrollSummary(results.attendance.summary);
          
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
      realtime: this.payrollService.getRealtimeStatus()
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.teamData = results.team;
          this.realtimeStatusData = results.realtime;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load team data', err);
          this.loading = false;
        }
      });
  }

  private buildPayrollSummary(summary: any): void {
    const overtimeHours = Math.max(0, summary.total_work_hours - (9 * summary.working_days));
    
    this.payrollSummary = {
      totalDays: summary.total_days,
      workingDays: summary.working_days,
      presentDays: summary.present_days,
      absentDays: summary.absent_days,
      totalWorkHours: summary.total_work_hours,
      avgWorkHours: summary.avg_work_hours,
      attendanceRate: summary.attendance_rate,
      overtimeHours: summary.total_overtime_hours,
      payrollStatus: summary.payroll_status
    };
  }

  private clearData(): void {
    this.attendanceData = null;
    this.loginLogoutData = null;
    this.weeklyData = null;
    this.teamData = null;
    this.idleAnalysisData = null;
    this.heatmapData = null;
    this.userDetailData = null;
    this.appUsageData = [];
    this.payrollSummary = null;
  }

  refreshRealtimeStatus(): void {
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
    // TODO: Implement PDF export using a library like jsPDF
    alert('PDF export functionality to be implemented');
  }

  @Output() noSelectedUserEvent: EventEmitter<boolean> = new EventEmitter();
  onUserChange(): void {
    // Auto-generate report when user changes
    if (this.selectedUser && this.fromDate && this.toDate) {
      this.noSelectedUserEvent.emit(false);
      this.generateReport();
    }
    else {
      this.noSelectedUserEvent.emit(true);
    }
  }
}