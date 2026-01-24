// src/app/pages/salary-management/salary-management.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CAFirmService } from '../../../shared/services/ca-firm.service';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ChipModule } from 'primeng/chip';
import { TagModule } from 'primeng/tag';
import { CalendarModule } from 'primeng/calendar';
import { InputNumberModule } from 'primeng/inputnumber';
import { LayoutService } from '../../../layout/service/app.layout.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

interface SalaryPayment {
  id?: number;
  employee: number;
  employee_details?: {
    id: number;
    email: string;
    username: string;
    department_name?: string;
  };
  month: number;
  year: number;
  basic_salary: string;
  allowances: string;
  deductions: string;
  net_salary: string;
  payment_date?: string;
  payment_method?: string;
  payment_reference?: string;
  payment_status: string;
  notes?: string;
}

interface Employee {
  id: number;
  user_details: {
    id: number;
    email: string;
    username: string;
    department_name?: string;
  };
  user: number;
  employee_id: string;
  designation: string;
  department_name: string;
  monthly_salary: string;
  is_active: boolean;
}

@Component({
  selector: 'app-salary-management',
  templateUrl: './salary-management.component.html',
  styleUrls: ['./salary-management.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    ToastModule,
    DialogModule,
    ConfirmDialogModule,
    CardModule,
    SelectModule,
    TableModule,
    ChipModule,
    TagModule,
    CalendarModule,
    InputNumberModule
  ],
  providers: [MessageService, ConfirmationService]
})
export class SalaryManagementComponent implements OnInit {
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();
  
  salaries: SalaryPayment[] = [];
  employees: Employee[] = [];
  
  salaryForm!: FormGroup;
  
  showModal = false;
  isEditMode = false;
  selectedSalaryId: number | null = null;
  
  loading = false;
  searchTerm = '';
  
  // Filters
  selectedEmployee: number | null = null;
  selectedMonth: number | null = null;
  selectedYear: number | null = null;
  selectedStatus: string | null = null;
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalRecords: number = 0;
  first: number = 0;
  
  // Sorting
  sortField: string = '-year';  // Default sort by year descending
  sortOrder: number = -1;
  
  months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];
  
  years: number[] = [];
  
  paymentStatuses = [
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'on_hold', label: 'On Hold' }
  ];
  
  paymentMethods = [
    { value: 'Bank Transfer', label: 'Bank Transfer' },
    { value: 'Cash', label: 'Cash' },
    { value: 'Cheque', label: 'Cheque' },
    { value: 'UPI', label: 'UPI' }
  ];

  summary = {
    total_basic: 0,
    total_allowances: 0,
    total_deductions: 0,
    total_net: 0,
    total_paid: 0,
    total_pending: 0
  };

  constructor(
    private fb: FormBuilder,
    private layoutService: LayoutService,
    private caFirmService: CAFirmService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.initializeForm();
    this.generateYears();
    this.setupSearchDebounce();
  }

  ngOnInit(): void {
    this.layoutService.state.staticMenuDesktopInactive = true;
    this.loadEmployees();
    this.loadSalaries();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupSearchDebounce(): void {
    this.searchSubject$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.first = 0;
        this.currentPage = 1;
        this.loadSalaries();
      });
  }

  initializeForm(): void {
    const now = new Date();
    this.salaryForm = this.fb.group({
      employee: [null, Validators.required],
      month: [now.getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
      year: [now.getFullYear(), Validators.required],
      basic_salary: [null, [Validators.required, Validators.min(0)]],
      allowances: [0, [Validators.min(0)]],
      deductions: [0, [Validators.min(0)]],
      net_salary: [{ value: 0, disabled: true }],
      payment_date: [null],
      payment_method: [null],
      payment_reference: [''],
      payment_status: ['pending', Validators.required],
      notes: ['']
    });

    // Auto-calculate net salary
    this.salaryForm.get('basic_salary')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateNetSalary());
    this.salaryForm.get('allowances')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateNetSalary());
    this.salaryForm.get('deductions')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateNetSalary());
  }

  generateYears(): void {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      this.years.push(i);
    }
  }
  
  loadEmployees(search?: string): void {
    this.loading = true;
    const params: any = {
      page: 1,
      page_size: 1000
    };
    
    if (search) {
      params.search = search;
    }
    
    this.caFirmService.listEmployees(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (!result || !Array.isArray(result.results)) {
            console.error("Unexpected response format:", result);
            this.employees = [];
            this.loading = false;
            return;
          }
          this.employees = result.results;
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          console.error('Error loading employees:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load employees'
          });
        }
      });
  }

  loadSalaries(
    page: number = this.currentPage,
    pageSize: number = this.pageSize,
    search?: string,
    sortField?: string,
    sortOrder?: number
  ): void {
    // Prevent multiple simultaneous requests
    //if (this.loading) {
    //  console.log("Already in progress")
    //  return;
    //}
    
    this.loading = true;
    
    const params: any = {
      page: page,
      page_size: pageSize
    };
    
    // Search parameter (DRF SearchFilter)
    if (this.searchTerm && this.searchTerm.trim()) {
      params.search = this.searchTerm.trim();
    }
    
    // Filter parameters
    if (this.selectedEmployee) {
      params.employee = this.selectedEmployee;
    }
    if (this.selectedMonth) {
      params.month = this.selectedMonth;
    }
    if (this.selectedYear) {
      params.year = this.selectedYear;
    }
    if (this.selectedStatus) {
      params.payment_status = this.selectedStatus;
    }
    
    // Sorting parameter (DRF OrderingFilter)
    if (sortField) {
      // Map PrimeNG sort field to DRF field
      const orderingField = this.mapSortFieldToDRF(sortField);
      const ordering = sortOrder === -1 ? `-${orderingField}` : orderingField;
      params.ordering = ordering;
    } else if (this.sortField) {
      params.ordering = this.sortField;
    }
    
    this.caFirmService.listSalaries(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (!result || !Array.isArray(result.results)) {
            console.error("Unexpected response format:", result);
            this.salaries = [];
            this.totalRecords = 0;
            this.loading = false;
            return;
          }
          
          this.salaries = result.results;
          this.totalRecords = result.count ?? result.results.length;
          this.currentPage = page;
          this.pageSize = pageSize;
          
          this.calculateSummary();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading salaries:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load salaries'
          });
          this.salaries = [];
          this.totalRecords = 0;
          this.loading = false;
        }
      });
  }

  /**
   * Map PrimeNG table sort fields to DRF ordering fields
   */
  mapSortFieldToDRF(sortField: string): string {
    const fieldMap: { [key: string]: string } = {
      'employee_details.username': 'employee__username',
      'employee_details.department_name': 'employee__employee_profile__department__name',
      'month': 'month',
      'year': 'year',
      'basic_salary': 'basic_salary',
      'net_salary': 'net_salary',
      'payment_status': 'payment_status',
      'payment_date': 'payment_date'
    };
    
    return fieldMap[sortField] || sortField;
  }

  onPageChange(event: any): void {
    // Prevent infinite loop - only process if loading is false
    if (this.loading) {
      return;
    }
    
    const page = (event.first / event.rows) + 1;
    const pageSize = event.rows;
    
    this.first = event.first;
    this.currentPage = page;
    this.pageSize = pageSize;
    
    // Handle sorting from table
    if (event.sortField) {
      const mappedField = this.mapSortFieldToDRF(event.sortField);
      this.sortField = event.sortOrder === -1 ? `-${mappedField}` : mappedField;
      this.sortOrder = event.sortOrder;
    }
    
    this.loadSalaries(page, pageSize, this.searchTerm, event.sortField, event.sortOrder);
  }

  calculateSummary(): void {
    this.summary = {
      total_basic: 0,
      total_allowances: 0,
      total_deductions: 0,
      total_net: 0,
      total_paid: 0,
      total_pending: 0
    };

    this.salaries.forEach(salary => {
      this.summary.total_basic += parseFloat(salary.basic_salary || '0');
      this.summary.total_allowances += parseFloat(salary.allowances || '0');
      this.summary.total_deductions += parseFloat(salary.deductions || '0');
      this.summary.total_net += parseFloat(salary.net_salary || '0');
      
      if (salary.payment_status === 'paid') {
        this.summary.total_paid += parseFloat(salary.net_salary || '0');
      } else {
        this.summary.total_pending += parseFloat(salary.net_salary || '0');
      }
    });
  }

  onSearchChange(): void {
    this.searchSubject$.next(this.searchTerm);
  }

  onFilterChange(): void {
    this.first = 0;
    this.currentPage = 1;
    this.loadSalaries();
  }

  clearFilters(): void {
    this.selectedEmployee = null;
    this.selectedMonth = null;
    this.selectedYear = null;
    this.selectedStatus = null;
    this.searchTerm = '';
    this.first = 0;
    this.currentPage = 1;
    this.loadSalaries();
  }

  openModal(): void {
    this.isEditMode = false;
    this.selectedSalaryId = null;
    const now = new Date();
    this.salaryForm.reset({
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      allowances: 0,
      deductions: 0,
      payment_status: 'pending'
    });
    this.showModal = true;
  }

  editSalary(salary: SalaryPayment): void {
    this.isEditMode = true;
    this.selectedSalaryId = salary.id!;
    this.salaryForm.patchValue({
      employee: salary.employee,
      month: salary.month,
      year: salary.year,
      basic_salary: parseFloat(salary.basic_salary),
      allowances: parseFloat(salary.allowances),
      deductions: parseFloat(salary.deductions),
      payment_date: salary.payment_date ? new Date(salary.payment_date) : null,
      payment_method: salary.payment_method,
      payment_reference: salary.payment_reference,
      payment_status: salary.payment_status,
      notes: salary.notes
    });
    this.calculateNetSalary();
    this.showModal = true;
  }

  saveSalary(): void {
    if (this.salaryForm.invalid) {
      Object.keys(this.salaryForm.controls).forEach(key => {
        this.salaryForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    
    const formData = {
      ...this.salaryForm.getRawValue(),
      payment_date: this.salaryForm.value.payment_date ? 
        this.formatDateForAPI(this.salaryForm.value.payment_date) : null
    };

    const request = this.isEditMode && this.selectedSalaryId
      ? this.caFirmService.updateSalary(this.selectedSalaryId, formData)
      : this.caFirmService.createSalary(formData);

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Salary ${this.isEditMode ? 'updated' : 'created'} successfully`
        });
        this.closeModal();
        this.loadSalaries();
        this.loading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.error?.message || `Failed to ${this.isEditMode ? 'update' : 'create'} salary`
        });
        this.loading = false;
      }
    });
  }

  deleteSalary(id: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this salary record?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading = true;
        this.caFirmService.deleteSalary(id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Salary deleted successfully'
              });
              this.loadSalaries();
              this.loading = false;
            },
            error: (error) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete salary'
              });
              this.loading = false;
            }
          });
      }
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.salaryForm.reset();
  }

  onEmployeeChange(): void {
    const employeeId = this.salaryForm.get('employee')?.value;
    if (employeeId) {
      const employee = this.employees.find(e => e.user === employeeId);
      if (employee) {
        this.salaryForm.patchValue({
          basic_salary: parseFloat(employee.monthly_salary)
        });
      }
    }
  }

  calculateNetSalary(): void {
    const basic = this.salaryForm.get('basic_salary')?.value || 0;
    const allowances = this.salaryForm.get('allowances')?.value || 0;
    const deductions = this.salaryForm.get('deductions')?.value || 0;
    
    const netSalary = basic + allowances - deductions;
    this.salaryForm.get('net_salary')?.setValue(netSalary);
  }

  generateSalariesForMonth(): void {
    this.confirmationService.confirm({
      message: 'This will generate salary records for all active employees for the selected month. Continue?',
      header: 'Generate Salaries',
      icon: 'pi pi-question-circle',
      accept: () => {
        const now = new Date();
        const month = this.selectedMonth || now.getMonth() + 1;
        const year = this.selectedYear || now.getFullYear();

        this.loading = true;
        
        const promises = this.employees
          .filter(emp => emp.is_active)
          .map(employee => {
            const data = {
              employee: employee.user,
              month,
              year,
              basic_salary: parseFloat(employee.monthly_salary),
              allowances: 0,
              deductions: 0,
              net_salary: parseFloat(employee.monthly_salary),
              payment_status: 'pending'
            };
            return this.caFirmService.createSalary(data).toPromise();
          });

        Promise.all(promises)
          .then(() => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Salaries generated successfully!'
            });
            this.loadSalaries();
            this.loading = false;
          })
          .catch((error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Some records failed to generate'
            });
            this.loadSalaries();
            this.loading = false;
          });
      }
    });
  }

  exportToExcel(): void {
    // Implement Excel export if needed
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Excel export feature coming soon'
    });
  }

  getStatusSeverity(status: string): any {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warn';
      case 'on_hold': return 'danger';
      default: return 'secondary';
    }
  }

  formatCurrency(amount?: string | number): string {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return value ? `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00';
  }

  formatDate(date?: string): string {
    return date ? new Date(date).toLocaleDateString('en-IN') : '-';
  }

  formatDateForAPI(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  getMonthName(month: number): string {
    return this.months.find(m => m.value === month)?.label || '';
  }
}