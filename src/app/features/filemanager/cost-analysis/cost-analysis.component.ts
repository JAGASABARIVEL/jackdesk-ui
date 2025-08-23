import { Component, OnDestroy, OnInit } from '@angular/core';
import { FileManagerService } from '../../../shared/services/file-manager.service';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { ToolbarModule } from 'primeng/toolbar';
import { LayoutService } from '../../../layout/service/app.layout.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-cost-analysis',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    TableModule,
    ButtonModule,
    FormsModule,
    SelectModule,
    ToolbarModule
  ],
  templateUrl: './cost-analysis.component.html',
  styleUrl: './cost-analysis.component.scss'
})
export class CostAnalysisComponent implements OnInit, OnDestroy {
  costReport: any;
  loading: boolean = true;

  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear: number = new Date().getFullYear();
  private destroy$ = new Subject<void>();


  months = [
    { name: 'January', value: 1 },
    { name: 'February', value: 2 },
    { name: 'March', value: 3 },
    { name: 'April', value: 4 },
    { name: 'May', value: 5 },
    { name: 'June', value: 6 },
    { name: 'July', value: 7 },
    { name: 'August', value: 8 },
    { name: 'September', value: 9 },
    { name: 'October', value: 10 },
    { name: 'November', value: 11 },
    { name: 'December', value: 12 }
  ];

  years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  constructor(
    private layoutService: LayoutService,
    private fileManagerService: FileManagerService
  ) {}

  ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}


  ngOnInit() {
    this.layoutService.state.staticMenuDesktopInactive = true;
    this.fetchCostReport();
  }

  fetchCostReport() {
    this.loading = true;
    this.fileManagerService.usage_cost(this.selectedMonth, this.selectedYear).pipe(takeUntil(this.destroy$)).subscribe(
      (data) => {
        this.costReport = data;
        this.loading = false;
      },
      (error) => {
        console.error('Error fetching cost report:', error);
        this.loading = false;
      }
    );
  }
}
