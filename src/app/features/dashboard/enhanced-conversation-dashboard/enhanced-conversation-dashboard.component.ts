// enhanced-conversation-dashboard.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { Subject, takeUntil, interval } from 'rxjs';
import { BadgeModule } from 'primeng/badge';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { AvatarModule } from 'primeng/avatar';

import { ChatManagerService } from '../../../shared/services/chat-manager.service';
import { UserManagerService } from '../../../shared/services/user-manager.service';

interface MetricCard {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  bgColor: string;
  subtitle?: string;
  trend?: number;
  trendDirection?: 'up' | 'down';
}

interface AgentPerformance {
  agent: any;
  total_assigned: number;
  total_closed: number;
  close_rate: number;
  avg_response_time: number;
  avg_resolution_time: number;
  satisfaction_score?: number;
}

@Component({
  selector: 'app-enhanced-conversation-dashboard',
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
    CardModule,
    TagModule,
    ProgressBarModule,
    TooltipModule
  ],
  templateUrl: './enhanced-conversation-dashboard.component.html',
  styleUrls: ['./enhanced-conversation-dashboard.component.scss']
})
export class EnhancedConversationDashboardComponent implements OnInit, OnDestroy {
  profile: any;
  loading = false;
  Math = Math;
  
  // Date Range
  dateRange: Date[] = [];
  
  // Enhanced Metrics
  enhancedMetrics: any = null;
  customerEffortScore: any = null;
  
  // Metric Cards
  metricCards: MetricCard[] = [];
  
  // Agent Performance
  agentPerformance: AgentPerformance[] = [];
  topPerformers: AgentPerformance[] = [];
  
  // Charts
  volumeChartData: any;
  volumeChartOptions: any;
  channelChartData: any;
  channelChartOptions: any;
  hourlyChartData: any;
  hourlyChartOptions: any;
  effortChartData: any;
  effortChartOptions: any;
  
  // Auto-refresh
  private refreshInterval$ = interval(60000); // 1 minute
  private destroy$ = new Subject<void>();
  
  constructor(
    private router: Router,
    private conversationService: ChatManagerService,
    private userManagerService: UserManagerService
  ) {}
  
  ngOnInit(): void {
    this.loadProfile();
    this.initializeDateRange();
    this.loadAllMetrics();
    this.setupChartOptions();
    this.setupAutoRefresh();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadProfile(): void {
    this.profile = JSON.parse(localStorage.getItem('profile') || '{}');
    if (!this.profile || !this.profile.user) {
      this.router.navigate(['/apps/login']);
    }
  }
  
  initializeDateRange(): void {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    this.dateRange = [thirtyDaysAgo, today];
  }
  
  setupAutoRefresh(): void {
    this.refreshInterval$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadAllMetrics();
      });
  }
  
  loadAllMetrics(): void {
    this.loading = true;
    const startDate = this.formatDate(this.dateRange[0]);
    const endDate = this.formatDate(this.dateRange[1]);
    
    // Load Enhanced Metrics
    this.conversationService.getEnhancedMetrics(startDate, endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.enhancedMetrics = data;
          this.processMetrics();
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading enhanced metrics:', err);
          this.loading = false;
        }
      });
    
    // Load Customer Effort Score
    this.conversationService.getCustomerEffortScore()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.customerEffortScore = data;
          this.setupEffortChart();
        },
        error: (err) => {
          console.error('Error loading customer effort score:', err);
        }
      });
  }
  
  processMetrics(): void {
    if (!this.enhancedMetrics) return;
    
    const metrics = this.enhancedMetrics;
    
    // Create Metric Cards
    this.metricCards = [
      {
        title: 'Total Tickets',
        value: metrics.summary.total_tickets,
        icon: 'pi-ticket',
        color: '#3B82F6',
        bgColor: '#DBEAFE',
        subtitle: `${metrics.summary.new_tickets} new today`,
        trend: this.calculateTrend(metrics.summary.total_tickets, 1200),
        trendDirection: 'up'
      },
      {
        title: 'Resolution Rate',
        value: `${metrics.summary.resolution_rate}%`,
        icon: 'pi-check-circle',
        color: '#10B981',
        bgColor: '#D1FAE5',
        subtitle: `${metrics.summary.closed_tickets} resolved`,
        trend: metrics.summary.resolution_rate - 75,
        trendDirection: metrics.summary.resolution_rate > 75 ? 'up' : 'down'
      },
      {
        title: 'Avg Response Time',
        value: `${metrics.performance.avg_first_response_hours}h`,
        icon: 'pi-clock',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        subtitle: 'First response',
        trend: -12,
        trendDirection: 'down'
      },
      {
        title: 'SLA Compliance',
        value: `${metrics.performance.sla_compliance_rate}%`,
        icon: 'pi-shield',
        color: '#8B5CF6',
        bgColor: '#EDE9FE',
        subtitle: 'On-time responses',
        trend: metrics.performance.sla_compliance_rate - 90,
        trendDirection: metrics.performance.sla_compliance_rate > 90 ? 'up' : 'down'
      }
    ];
    
    // Process Agent Performance
    this.agentPerformance = metrics.agents.map((agent: any) => ({
      agent: agent,
      total_assigned: agent.total_assigned,
      total_closed: agent.total_closed,
      close_rate: agent.close_rate,
      avg_response_time: agent.avg_resolution_hours,
      avg_resolution_time: agent.avg_resolution_hours,
      satisfaction_score: 4.5 // Mock data - replace with actual if available
    }));
    
    // Top 5 Performers
    this.topPerformers = [...this.agentPerformance]
      .sort((a, b) => b.close_rate - a.close_rate)
      .slice(0, 5);
    
    // Setup Charts
    this.setupVolumeChart();
    this.setupChannelChart();
    this.setupHourlyChart();
  }
  
  setupVolumeChart(): void {
    if (!this.enhancedMetrics) return;
    
    const labels = this.generateDateLabels(this.dateRange[0], this.dateRange[1]);
    
    this.volumeChartData = {
      labels: labels,
      datasets: [
        {
          label: 'New Tickets',
          data: this.generateMockTrendData(labels.length, 20, 50),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Resolved',
          data: this.generateMockTrendData(labels.length, 15, 45),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  }
  
  setupChannelChart(): void {
    if (!this.enhancedMetrics || !this.enhancedMetrics.channels) return;
    
    const channels = this.enhancedMetrics.channels;
    
    this.channelChartData = {
      labels: channels.map((c: any) => c.channel),
      datasets: [{
        data: channels.map((c: any) => c.count),
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
        hoverBackgroundColor: ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED']
      }]
    };
  }
  
  setupHourlyChart(): void {
    if (!this.enhancedMetrics || !this.enhancedMetrics.hourly_distribution) return;
    
    const hourly = this.enhancedMetrics.hourly_distribution;
    
    this.hourlyChartData = {
      labels: hourly.map((h: any) => h.hour),
      datasets: [{
        label: 'Tickets by Hour',
        data: hourly.map((h: any) => h.count),
        backgroundColor: '#3B82F6',
        borderColor: '#2563EB',
        borderWidth: 1
      }]
    };
  }
  
  setupEffortChart(): void {
    if (!this.customerEffortScore) return;
    
    const insights = this.customerEffortScore.insights;
    
    this.effortChartData = {
      labels: ['Low Effort (1-3 msgs)', 'Medium Effort (4-10 msgs)', 'High Effort (10+ msgs)'],
      datasets: [{
        data: [insights.low_effort, insights.medium_effort, insights.high_effort],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        hoverBackgroundColor: ['#059669', '#D97706', '#DC2626']
      }]
    };
  }
  
  setupChartOptions(): void {
    const textColor = '#374151';
    const gridColor = '#E5E7EB';
    
    this.volumeChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: textColor }
        },
        tooltip: { enabled: true }
      },
      scales: {
        x: {
          ticks: { color: textColor },
          grid: { color: gridColor }
        },
        y: {
          ticks: { color: textColor },
          grid: { color: gridColor }
        }
      }
    };
    
    this.channelChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { color: textColor }
        }
      }
    };
    
    this.hourlyChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        x: {
          ticks: { color: textColor },
          grid: { color: gridColor }
        },
        y: {
          ticks: { color: textColor },
          grid: { color: gridColor }
        }
      }
    };
    
    this.effortChartOptions = this.channelChartOptions;
  }
  
  // Utility Methods
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  generateDateLabels(start: Date, end: Date): string[] {
    const labels: string[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      labels.push(current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      current.setDate(current.getDate() + 1);
    }
    
    return labels.filter((_, i) => i % 3 === 0); // Show every 3rd day
  }
  
  generateMockTrendData(length: number, min: number, max: number): number[] {
    return Array.from({ length }, () => Math.floor(Math.random() * (max - min + 1)) + min);
  }
  
  calculateTrend(current: number, previous: number): number {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  }
  
  onDateRangeChange(): void {
    if (this.dateRange && this.dateRange[0] && this.dateRange[1]) {
      this.loadAllMetrics();
    }
  }
  
  getPerformanceColor(rate: number): string {
    if (rate >= 90) return '#10B981';
    if (rate >= 70) return '#F59E0B';
    return '#EF4444';
  }
  
  getPerformanceSeverity(rate: number): any {
    if (rate >= 90) return 'success';
    if (rate >= 70) return 'warn';
    return 'danger';
  }
  
  exportReport(): void {
    // Implement export functionality
    console.log('TODO: Exporting report...');
  }
  
  navigateToTickets(filter?: string): void {
    this.router.navigate(['/apps/ticketing'], { 
      queryParams: filter ? { status: filter } : {} 
    });
  }
}