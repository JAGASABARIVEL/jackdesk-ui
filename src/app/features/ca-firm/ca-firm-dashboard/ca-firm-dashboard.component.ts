// src/app/features/ca-firm/ca-firm-dashboard/ca-firm-dashboard.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ProgressBarModule } from 'primeng/progressbar';
import { KnobModule } from 'primeng/knob';
import { MessageService } from 'primeng/api';
import { CAFirmService } from '../../../shared/services/ca-firm.service';
import { LayoutService } from '../../../layout/service/app.layout.service';
import { ChatManagerService } from '../../../shared/services/chat-manager.service';

interface DashboardData {
  period: {
    start_date: string;
    end_date: string;
    financial_year: string;
  };
  revenue: {
    total_revenue: number;
    total_received: number;
    customer_dues: number;
    by_product: any[];
  };
  expenses: {
    office_expenses: number;
    expenses_paid: number;
    vendor_dues: number;
    salary_cost: number;
    salary_paid: number;
    total_running_costs: number;
    by_category: any[];
  };
  profit: {
    gross_profit: number;
    profit_margin: number;
    total_revenue: number;
    total_costs: number;
  };
  dues: {
    customer_dues: number;
    vendor_dues: number;
    total_receivables: number;
    total_payables: number;
  };
  customers: {
    total_customers: number;
    customers_with_dues: number;
    top_customers: any[];
  };
  conversations: {
    total: number;
    new: number;
    active: number;
    closed: number;
  };
  salary_breakdown: any[];
  monthly_trends: any[];
}

@Component({
  selector: 'app-ca-firm-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ChartModule,
    TableModule,
    TagModule,
    ButtonModule,
    SelectModule,
    ToastModule,
    ProgressBarModule,
    KnobModule
  ],
  providers: [MessageService],
  templateUrl: './ca-firm-dashboard.component.html',
  styleUrls: ['./ca-firm-dashboard.component.scss']
})
export class CAFirmDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loading = false;
  dashboardData: DashboardData | null = null;
  
  // Financial Year Options
  financialYears = [
    { label: 'FY 2025-26', value: '2025-26' },
    { label: 'FY 2026-27', value: '2026-27' },
    { label: 'FY 2027-28', value: '2027-28' },
    { label: 'FY 2028-29', value: '2028-29' },
    { label: 'FY 2029-30', value: '2029-30' },
    { label: 'FY 2030-31', value: '2030-31' },
    { label: 'FY 2031-32', value: '2031-32' },
    { label: 'FY 2032-33', value: '2032-33' },
    { label: 'FY 2033-34', value: '2033-34' },
    { label: 'FY 2034-35', value: '2034-35' },
    { label: 'FY 2035-36', value: '2035-36' },
    { label: 'FY 2036-37', value: '2036-37' },
    { label: 'FY 2037-38', value: '2037-38' },
    { label: 'FY 2038-39', value: '2038-39' },
    { label: 'FY 2039-40', value: '2039-40' },
    { label: 'FY 2040-41', value: '2040-41' },
    { label: 'FY 2041-42', value: '2041-42' },
    { label: 'FY 2042-43', value: '2042-43' },
    { label: 'FY 2043-44', value: '2043-44' },
    { label: 'FY 2044-45', value: '2044-45' },
    { label: 'FY 2045-46', value: '2045-46' },
    { label: 'FY 2046-47', value: '2046-47' },
    { label: 'FY 2047-48', value: '2047-48' },
    { label: 'FY 2048-49', value: '2048-49' },
    { label: 'FY 2049-50', value: '2049-50' },
    { label: 'FY 2050-51', value: '2050-51' },
  ];
  selectedFinancialYear = this.getCurrentFinancialYear();

  // Chart Data
  revenueExpenseChart: any;
  profitTrendChart: any;
  categoryBreakdownChart: any;
  
  // Chart Options
  chartOptions: any;

  constructor(
    private layoutService: LayoutService,
    private caFirmService: CAFirmService,
    private conversationService: ChatManagerService,
    private messageService: MessageService
  ) {
    this.initChartOptions();
  }

  ngOnInit(): void {
    this.layoutService.state.staticMenuDesktopInactive = true;
    this.loadConversations();
    this.refreshUnrespondedConversationNotifications();
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refreshUnrespondedConversationNotifications() {
    this.conversationService.list_notification("non-chat").pipe(takeUntil(this.destroy$)).subscribe({
        next: (notificationData: any) => {
            this.layoutService.unrespondedConversationNotification.update((prev) => notificationData)
        },
        error: (err) => {console.error(`Could not get the conversation notifications ${err}`)}
    });
  }

    loadConversations() {
  this.conversationService.list_new_conversations("non-chat", 1, 15)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (result) => {
        // Normalize response
        let data: any[];
        // Always expect DRF pagination
        if (!result || !Array.isArray(result.results)) {
          console.error("Unexpected response format:", data);
          this.layoutService.totalNewMessageRecords = 0;
          return;
        }
        data = result.results;
        
        // Always assign an array
        this.layoutService.totalNewMessageRecords = result.count ?? data.length; // DRF count or fallback

        // Update messages for layout
        const newParsedMessages = data.map((unparsed) => ({
          customerName: unparsed?.contact?.name || unparsed?.contact?.phone,
          text: unparsed?.messages?.[0]?.message_body,
          total_count: result.count // TODO: Including the count in every payload until we add pagination to notification topbar
        }));
        this.layoutService.newTaskmessages.update(() => newParsedMessages);
        this.layoutService.newTaskUpdateToken.set(true);
      },
      error: (err) => {
        this.layoutService.newTaskUpdateToken.set(true);
        console.error("List conversation | Error getting conversations", err);
      }
    });
}

  loadDashboard(): void {
    this.loading = true;
    const params = { financial_year: this.selectedFinancialYear };
    
    this.caFirmService.getDashboard(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.dashboardData = data;
          this.prepareCharts();
          this.loading = false;
        },
        error: (error) => {
          this.showError('Failed to load dashboard data');
          this.loading = false;
          console.error('Error loading dashboard:', error);
        }
      });
  }

  getCurrentFinancialYear(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // Jan = 1
  
    // Financial year starts in April
    const startYear = month >= 4 ? year : year - 1;
    const endYear = startYear + 1;
  
    return `${startYear}-${endYear.toString().slice(-2)}`;
  }


  onFinancialYearChange(): void {
    this.loadDashboard();
  }

  prepareCharts(): void {
    if (!this.dashboardData) return;

    // Revenue vs Expenses Chart
    this.revenueExpenseChart = {
      labels: ['Revenue', 'Expenses', 'Profit'],
      datasets: [{
        data: [
          this.dashboardData.revenue.total_revenue,
          this.dashboardData.expenses.total_running_costs,
          this.dashboardData.profit.gross_profit
        ],
        backgroundColor: ['#10b981', '#ef4444', '#3b82f6'],
        hoverBackgroundColor: ['#059669', '#dc2626', '#2563eb']
      }]
    };

    // Monthly Trends Chart
    if (this.dashboardData.monthly_trends && this.dashboardData.monthly_trends.length > 0) {
      const labels = this.dashboardData.monthly_trends.map(t => t.month);
      const revenueData = this.dashboardData.monthly_trends.map(t => t.revenue);
      const receivedData = this.dashboardData.monthly_trends.map(t => t.received);

      this.profitTrendChart = {
        labels: labels,
        datasets: [
          {
            label: 'Revenue',
            data: revenueData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Received',
            data: receivedData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      };
    }

    // Category Breakdown Chart
    if (this.dashboardData.expenses.by_category && this.dashboardData.expenses.by_category.length > 0) {
      this.categoryBreakdownChart = {
        labels: this.dashboardData.expenses.by_category.map(c => c.category || 'Uncategorized'),
        datasets: [{
          data: this.dashboardData.expenses.by_category.map(c => c.total),
          backgroundColor: [
            '#667eea',
            '#764ba2',
            '#f093fb',
            '#4facfe',
            '#43e97b',
            '#fa709a',
            '#fee140',
            '#30cfd0'
          ]
        }]
      };
    }
  }

  initChartOptions(): void {
    this.chartOptions = {
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            color: '#495057'
          }
        }
      },
      responsive: true,
      maintainAspectRatio: false
    };
  }

  formatCurrency(amount: number | string): string {
    return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  getStatusSeverity(status: string): any {
    const severityMap: { [key: string]: string } = {
      'paid': 'success',
      'partial': 'warn',
      'pending': 'danger',
      'active': 'success',
      'closed': 'secondary'
    };
    return severityMap[status.toLowerCase()] || 'info';
  }

  getDueSeverity(dueAmount: number): any {
    if (dueAmount === 0) return 'success';
    if (dueAmount < 10000) return 'warn';
    return 'danger';
  }

  getProfitMarginColor(): string {
    if (!this.dashboardData) return '#6b7280';
    const margin = this.dashboardData.profit.profit_margin;
    if (margin >= 40) return '#10b981';
    if (margin >= 20) return '#f59e0b';
    return '#ef4444';
  }

  showSuccess(message: string): void {
    this.messageService.add({ severity: 'success', summary: 'Success', detail: message });
  }

  showError(message: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: message });
  }

  exportReport(): void {
    this.showSuccess('Report export functionality to be implemented');
  }

  refreshDashboard(): void {
    this.loadDashboard();
    this.showSuccess('Dashboard refreshed successfully');
  }
}