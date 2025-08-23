import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ChatManagerService } from '../../../shared/services/chat-manager.service';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { ToolbarModule } from 'primeng/toolbar';
import { LayoutService } from '../../../layout/service/app.layout.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-cost-analysis-chat',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    TableModule,
    DatePickerModule,
    ToolbarModule
  ],
  templateUrl: './cost-analysis.component.html',
  styleUrl: './cost-analysis.component.scss'
})
export class CostAnalysisComponentChat implements OnInit, OnDestroy {

  loading: boolean = false;
  costReport: any = null;

  fromDate: Date | null = null;
  toDate: Date | null = null;
  private destroy$ = new Subject<void>();


  constructor(
    private layoutService: LayoutService,
    private chatManagerService: ChatManagerService
  ) {}

  ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}


  ngOnInit(): void {
    this.layoutService.state.staticMenuDesktopInactive = true;
    const today = new Date();
    this.fromDate = new Date(today.getFullYear(), today.getMonth(), 1); // 1st of current month
    this.toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // end of current month

    this.fetchCostReport(); // Initial fetch on page load
  }

  fetchCostReport(): void {
    if (!this.fromDate || !this.toDate) return;
    this.loading = true;
    const formattedFromDate = formatDate(this.fromDate, 'yyyy-MM-dd', 'en-IN');
    const formattedToDate = formatDate(this.toDate, 'yyyy-MM-dd', 'en-IN');
    this.chatManagerService.usage_cost(formattedFromDate, formattedToDate).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.costReport = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching cost report', error);
        this.loading = false;
      }
    });
  }
}
