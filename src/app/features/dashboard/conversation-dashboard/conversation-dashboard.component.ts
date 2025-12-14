// conversation-dashboard.component.ts - IMPROVED VERSION
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { Subject, takeUntil, interval } from 'rxjs';
import { FloatLabelModule } from 'primeng/floatlabel';
import { BadgeModule } from 'primeng/badge';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { TabsModule } from 'primeng/tabs';
import { SkeletonModule } from 'primeng/skeleton';

import { CUstomEventService } from '../../../shared/services/Events/custom-events.service';
import { UserManagerService } from '../../../shared/services/user-manager.service';
import { ChatManagerService } from '../../../shared/services/chat-manager.service';
import { ListNewConversationsComponent } from '../../chat/list-conversations/list-conversations.component';
import { ListActiveConversationsComponent } from '../../chat/list-active-conversations/list-active-conversations.component';
import { ReportConversationsComponent } from '../../chat/report-conversations/report-conversations.component';
import { LayoutService } from '../../../layout/service/app.layout.service';

interface QuickStat {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  bgColor: string;
  subtitle?: string;
  clickable?: boolean;
  filter?: string;
  trend?: number;
  trendDirection?: 'up' | 'down';
}

@Component({
  selector: 'app-conversation-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    BadgeModule,
    ChartModule,
    SelectModule,
    AvatarModule,
    TableModule,
    ButtonModule,
    DatePickerModule,
    FloatLabelModule,
    DialogModule,
    CardModule,
    TagModule,
    ProgressBarModule,
    TooltipModule,
    TabsModule,
    SkeletonModule,
    ListNewConversationsComponent,
    ListActiveConversationsComponent,
    ReportConversationsComponent,
  ],
  templateUrl: './conversation-dashboard.component.html',
  styleUrl: './conversation-dashboard.component.scss'
})
export class ConversationDashboardComponent implements OnInit, OnDestroy {
  profile!: any;
  loading = false;
  loadingStats = false;
  loadingCharts = false;
  Math = Math;
  
  // Quick Stats
  quickStats: QuickStat[] = [];
  
  // Periods
  periods: any[] = [];
  selectedConversationMainPeriod: any;
  selectedOrgConversationPerformerPeriod: any;
  selectedConversationPerformerPeriod: any;
  
  // Date Range
  select_global_duration: Date[] = [];
  
  // Data
  employees: any[] = [];
  select_employee_metric: any;
  reportAllConversationVisible = false;
  filter_status_report!: string;
  
  // Performance Data
  organizationConversationPerformance: any = {
    new: 0,
    active: 0,
    closed: 0,
    resolutionrate: 0,
    resolutiontime: 0,
    responsetime: 0
  };
  
  myStats: any = null;
  
  // Chart Data
  org_metrics_data: any;
  emp_metrics_data: any;
  conversationOrgProductivityChartData: any;
  conversationEmployeeProductivityChartData: any;
  conversationChartOptions: any;
  
  // Auto refresh
  private refreshInterval$ = interval(60000); // 1 minute
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private conversationService: ChatManagerService,
    private conversationEventService: CUstomEventService,
    private userManagerService: UserManagerService,
    private layoutService: LayoutService
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.loadProfile();
    this.initializePeriods();
    this.initializeDateRange();
    this.setChartOptions();
    this.setupAutoRefresh();
  }

  setupAutoRefresh(): void {
    this.refreshInterval$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.reportAllConversationVisible) {
          this.loadConversationStats();
        }
      });
  }

  initializePeriods(): void {
    this.periods = [
      { name: 'Daily', value: 'daily', code: '1 day' },
      { name: 'Weekly', value: 'weekly', code: '1 week' },
      { name: 'Monthly', value: 'monthly', code: '1 month' },
      { name: 'Quarterly', value: 'quarterly', code: '1 quarter' },
      { name: 'Half-yearly', value: 'half-yearly', code: 'half-year' },
      { name: 'Yearly', value: 'yearly', code: '1 year' }
    ];
    
    this.selectedConversationMainPeriod = this.periods[2]; // Monthly
    this.selectedOrgConversationPerformerPeriod = this.periods[2];
    this.selectedConversationPerformerPeriod = this.periods[2];
  }

  initializeDateRange(): void {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    this.select_global_duration = [thirtyDaysAgo, today];
  }

  loadProfile(): void {
    this.profile = JSON.parse(localStorage.getItem('profile') || '{}');
    if (!this.profile || !this.profile.user) {
      this.router.navigate(['/apps/login']);
      return;
    }
    this.loadUsers();
    this.subscribeForNewConversations();
  }

  loadUsers(): void {
    this.userManagerService.list_users()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.employees = data.map(emp => ({
            ...emp,
            color: this.getUniqueRandomColor(),
            active: 0,
            closed: 0,
            resolutiontime: 0,
            responsetime: 0,
            closeRate: 0
          }));
          this.loadConversationStats();
        },
        error: (err) => {
          console.error('Error loading users:', err);
        }
      });
  }

  subscribeForNewConversations(): void {
    this.conversationEventService.newConversationEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadConversationStats();
      });
  }

  loadConversationStats(): void {
    this.loadingStats = true;
    const globalformattedDates = this.select_global_duration.map(this.formatDateToYYYYMMDD);
    
    this.conversationService.stats(
      this.selectedConversationMainPeriod.value,
      globalformattedDates[0],
      globalformattedDates[1]
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.parseConversationStats(data);
          this.buildQuickStats();
          this.loadingStats = false;
        },
        error: (err) => {
          console.error('Error loading stats:', err);
          this.loadingStats = false;
        }
      });
  }

  parseConversationStats(data: any): void {
    // Organization Performance
    this.organizationConversationPerformance = {
      new: data.total_new || 0,
      active: data.total_active || 0,
      closed: data.total_closed || 0,
      resolutionrate: (data.user_performance_stats_avg?.average_resolution_rate || 0),
      resolutiontime: this.convertSecondsToHours(data.user_performance_stats_avg?.average_resolution_time || 0),
      responsetime: this.convertSecondsToHours(data.user_performance_stats_avg?.average_response_time || 0),
      sla_compliance_rate: data.user_performance_stats_avg?.sla_compliance_rate || 0
    };

    // Employee Performance
    if (data.user_performance_stats && this.employees) {
      data.user_performance_stats.forEach((user_stat: any) => {
        const foundIndex = this.employees.findIndex(
          (employee) => employee.details.id === user_stat.assigned_user_id
        );
        if (foundIndex !== -1) {
          this.employees[foundIndex].active = user_stat.total_active || 0;
          this.employees[foundIndex].closed = user_stat.total_closed || 0;
          this.employees[foundIndex].closeRate = user_stat.total_assigned > 0
            ? Math.round((user_stat.total_closed / user_stat.total_assigned) * 100)
            : 0;
        }
      });

      // Resolution Time
      data.user_performance_stats_avg?.resolution_time_per_employee?.forEach((user_stat: any) => {
        const foundIndex = this.employees.findIndex(
          (employee) => employee.details.id === user_stat.assigned_user_id
        );
        if (foundIndex !== -1) {
          this.employees[foundIndex].resolutiontime = this.convertSecondsToHours(user_stat.avg || 0);
        }
      });

      // Response Time
      data.user_performance_stats_avg?.response_time_per_employee?.forEach((user_stat: any) => {
        const foundIndex = this.employees.findIndex(
          (employee) => employee.details.id === user_stat.assigned_user_id
        );
        if (foundIndex !== -1) {
          this.employees[foundIndex].responsetime = this.convertSecondsToHours(user_stat.avg || 0);
        }
      });
    }

    this.loadMyStats();
  }

  loadMyStats(): void {
    this.myStats = this.employees.find(
      (emp) => emp.details.id === this.profile.user.id
    ) || { active: 0, closed: 0, resolutiontime: 0, responsetime: 0, closeRate: 0 };
  }

  buildQuickStats(): void {
    const isOwner = this.profile.user.role === 'owner';
    const totalConversations = isOwner 
      ? (this.organizationConversationPerformance.new)
      : (this.myStats?.active + this.myStats?.closed);

    this.quickStats = [
      {
        label: 'Total Conversations',
        value: totalConversations,
        icon: 'pi-comment',
        color: '#3B82F6',
        bgColor: '#DBEAFE',
        subtitle: isOwner 
          ? `${this.organizationConversationPerformance.new - (this.organizationConversationPerformance.active + this.organizationConversationPerformance.closed)} new`
          : `${this.myStats?.active} active`,
        clickable: true,
        filter: ''
      },
      {
        label: 'Active',
        value: isOwner 
          ? this.organizationConversationPerformance.active 
          : this.myStats?.active,
        icon: 'pi-clock',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        subtitle: 'In progress',
        clickable: true,
        filter: 'active'
      },
      {
        label: 'Resolved',
        value: isOwner 
          ? this.organizationConversationPerformance.closed 
          : this.myStats?.closed,
        icon: 'pi-check-circle',
        color: '#10B981',
        bgColor: '#D1FAE5',
        subtitle: 'Completed',
        clickable: true,
        filter: 'closed'
      },
      //{
      //  label: isOwner ? 'Avg Resolution Rate' : 'My Close Rate',
      //  value: isOwner 
      //    ? `${this.organizationConversationPerformance.resolutionrate.toFixed(1)}%`
      //    : `${this.myStats?.closeRate || 0}%`,
      //  icon: 'pi-verified',
      //  color: '#8B5CF6',
      //  bgColor: '#EDE9FE',
      //  subtitle: 'Success rate',
      //  trend: isOwner 
      //    ? this.organizationConversationPerformance.resolutionrate - 75
      //    : this.myStats?.closeRate - 75,
      //  trendDirection: (isOwner 
      //    ? this.organizationConversationPerformance.resolutionrate 
      //    : this.myStats?.closeRate) > 75 ? 'up' : 'down'
      //},
      //{
      //  label: 'Avg Response Time',
      //  value: isOwner 
      //    ? `${this.organizationConversationPerformance.responsetime.toFixed(1)}h`
      //    : `${(this.myStats?.responsetime || 0).toFixed(1)}h`,
      //  icon: 'pi-clock',
      //  color: '#EC4899',
      //  bgColor: '#FCE7F3',
      //  subtitle: 'First response'
      //},
      //{
      //  label: 'SLA Compliance',
      //  value: `${this.organizationConversationPerformance.sla_compliance_rate}%`,
      //  icon: 'pi-shield',
      //  color: '#8B5CF6',
      //  bgColor: '#EDE9FE',
      //  subtitle: 'On-time responses',
      //}
    ];
  }

  loadConversationOrgMetrics(): void {
    this.loadingCharts = true;
    const globalformattedDates = this.select_global_duration.map(this.formatDateToYYYYMMDD);
    
    this.conversationService.org_metrics(
      this.selectedOrgConversationPerformerPeriod.value,
      globalformattedDates[0],
      globalformattedDates[1]
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.reset_org_metrics_data();
          this.parseOrgMetricsData(data);
          this.updateOrgMetricsChartData();
          this.loadingCharts = false;
        },
        error: (err) => {
          console.error('Error loading org metrics:', err);
          this.loadingCharts = false;
        }
      });
  }

  reset_org_metrics_data(): void {
    this.org_metrics_data = {
      labels: [],
      total: [],
      active: [],
      closed: []
    };
  }

  parseOrgMetricsData(data: any): void {
    const existingLabels = new Set(this.org_metrics_data.labels);

    data.org_performance_stats?.forEach((org_metric: any) => {
      if (!existingLabels.has(org_metric.label)) {
        this.org_metrics_data.labels.push(org_metric.label);
        this.org_metrics_data.total.push(org_metric.total_assigned || 0);
        this.org_metrics_data.active.push(org_metric.total_active || 0);
        this.org_metrics_data.closed.push(org_metric.total_closed || 0);
        existingLabels.add(org_metric.label);
      }
    });
  }

  updateOrgMetricsChartData(): void {
    const data = this.org_metrics_data;
    this.conversationOrgProductivityChartData = {
      labels: data.labels,
      datasets: [
        {
          label: 'Total Assigned',
          data: data.total,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: '#3B82F6',
          borderWidth: 2
        },
        {
          label: 'Active',
          data: data.active,
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
          borderColor: '#F59E0B',
          borderWidth: 2
        },
        {
          label: 'Closed',
          data: data.closed,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: '#10B981',
          borderWidth: 2
        }
      ]
    };
  }

  loadConversationEmploeeMetrics(): void {
    if (!this.select_employee_metric) return;
    
    this.loadingCharts = true;
    const globalformattedDates = this.select_global_duration.map(this.formatDateToYYYYMMDD);
    
    this.conversationService.employee_metrics(
      this.selectedConversationPerformerPeriod?.value,
      globalformattedDates[0],
      globalformattedDates[1],
      this.select_employee_metric.details.id
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.reset_emp_metrics_data();
          this.parseEmployeeMetricsData(data);
          this.updateEmploeeMetricsChartData();
          this.loadingCharts = false;
        },
        error: (err) => {
          console.error('Error loading employee metrics:', err);
          this.loadingCharts = false;
        }
      });
  }

  reset_emp_metrics_data(): void {
    this.emp_metrics_data = {
      labels: [],
      total: [],
      active: [],
      closed: []
    };
  }

  parseEmployeeMetricsData(data: any): void {
    const existingLabels = new Set(this.emp_metrics_data.labels);

    data.user_performance_stats?.forEach((user_metric: any) => {
      if (this.select_employee_metric.details.id === user_metric.assigned_user_id &&
          !existingLabels.has(user_metric.label)) {
        this.emp_metrics_data.labels.push(user_metric.label);
        this.emp_metrics_data.total.push(user_metric.total_assigned || 0);
        this.emp_metrics_data.active.push(user_metric.total_active || 0);
        this.emp_metrics_data.closed.push(user_metric.total_closed || 0);
        existingLabels.add(user_metric.label);
      }
    });
  }

  updateEmploeeMetricsChartData(): void {
    const data = this.emp_metrics_data;
    this.conversationEmployeeProductivityChartData = {
      labels: data.labels,
      datasets: [
        {
          label: 'Total Assigned',
          data: data.total,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: '#3B82F6',
          borderWidth: 2
        },
        {
          label: 'Active',
          data: data.active,
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
          borderColor: '#F59E0B',
          borderWidth: 2
        },
        {
          label: 'Closed',
          data: data.closed,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: '#10B981',
          borderWidth: 2
        }
      ]
    };
  }

  onSelectedConversationMainIntervalChange(): void {
    if (this.select_global_duration && 
        this.select_global_duration[0] && 
        this.select_global_duration[1]) {
      this.loadUsers();
    }
  }

  setChartOptions(): void {
    const textColor = '#374151';
    const gridColor = '#E5E7EB';

    this.conversationChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: textColor,
            font: {
              size: 12,
              weight: '500'
            }
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 13
          }
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Time Period',
            color: textColor,
            font: {
              size: 12,
              weight: '600'
            }
          },
          ticks: {
            color: textColor,
            font: {
              size: 11
            }
          },
          grid: {
            color: gridColor
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'Count',
            color: textColor,
            font: {
              size: 12,
              weight: '600'
            }
          },
          ticks: {
            color: textColor,
            font: {
              size: 11
            }
          },
          grid: {
            color: gridColor
          }
        }
      }
    };
  }

  // Utility Methods
  formatDateToYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  convertSecondsToHours(seconds: number): number {
    return seconds ? Math.round((seconds / 3600) * 10) / 10 : 0;
  }

  getUniqueRandomColor(): string {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }

  getSeverity(status: string): string {
    const severities: any = {
      new: 'danger',
      active: 'warn',
      closed: 'success'
    };
    return severities[status] || 'info';
  }

  countSeverity(value: number): any {
    if (value < 5) return 'danger';
    if (value >= 5 && value < 10) return 'warn';
    return 'success';
  }

  getPerformanceColor(rate: number): string {
    if (rate >= 90) return '#10B981';
    if (rate >= 70) return '#F59E0B';
    return '#EF4444';
  }

  onStatClick(stat: QuickStat): void {
    if (stat.clickable) {
      this.filter_status_report = stat.filter || '';
      this.reportAllConversationVisible = true;
    }
  }

  refreshDashboard(): void {
    this.loadConversationStats();
    if (this.selectedOrgConversationPerformerPeriod) {
      this.loadConversationOrgMetrics();
    }
    if (this.select_employee_metric) {
      this.loadConversationEmploeeMetrics();
    }
  }
}