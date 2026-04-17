// src/app/features/ca-firm/employee-management/employee-management.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { Table, TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { ToolbarModule } from 'primeng/toolbar';
import { CardModule } from 'primeng/card';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { ChipModule } from 'primeng/chip';
import { BadgeModule } from 'primeng/badge';
import { DatePickerModule } from 'primeng/datepicker';
import { CAFirmService } from '../../../shared/services/ca-firm.service';
import {FilterPipe} from '../../../shared/pipes/filter.pipe'
import { UserManagerService } from '../../../shared/services/user-manager.service';
import { LayoutService } from '../../../layout/service/app.layout.service';


interface Employee {
  id?: number;
  user: number;
  department: number;
  department_name?: string;
  monthly_salary: string;
  salary_currency: string;
  employee_id: string;
  designation: string;
  date_of_joining: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  permanent_address?: string;
  current_address?: string;
  pan_number?: string;
  aadhar_number?: string;
  is_active: boolean;
  user_details?: {
    username: string;
    email: string;
    user_type?: string;
    first_name?: string;
    last_name?: string;
  };
}

interface Department {
  id: number;
  name: string;
  description?: string;
  head?: number;
  is_active: boolean;
}

@Component({
  selector: 'app-employee-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    TableModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule,
    AvatarModule,
    ToolbarModule,
    CardModule,
    InputGroupModule,
    InputGroupAddonModule,
    TooltipModule,
    ChipModule,
    BadgeModule,
    DatePickerModule,
    FilterPipe
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './employee-management.component.html',
  styleUrls: ['./employee-management.component.scss']
})
export class EmployeeManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  employees: Employee[] = [];
  departments: Department[] = [];
  users: any[] = [];
  
  displayDialog = false;
  displayDetailsDialog = false;
  isEditMode = false;
  loading = false;
  
  employeeForm: FormGroup;
  selectedEmployee: Employee | null = null;
  searchText = '';
  selectedDepartment: number | null = null;

  // ── Owner-as-employee ──
  currentUser: any = null;
  ownerAlreadyEmployee = false;
  
  designations = [
    { label: 'Intern', value: 'Intern' },
    { label: 'Assistant', value: 'Assistant' },
    { label: 'Accountant', value: 'Accountant' },
    { label: 'Office Manager', value: 'Office Manager' },
    { label: 'Audit Manager', value: 'Audit Manager' },
    { label: 'Junior Consultant', value: 'Junior Consultant' },
    { label: 'Tax Consultant', value: 'Tax Consultant' },
    { label: 'Senior Tax Consultant', value: 'Senior Tax Consultant' },
    { label: 'Auditor', value: 'Auditor' },
    { label: 'Director', value: 'Director' },
    { label: 'Managing Partner', value: 'Managing Partner' },
  ];

  constructor(
    private fb: FormBuilder,
    private layoutService: LayoutService,
    private caFirmService: CAFirmService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private userManagerService: UserManagerService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.layoutService.state.staticMenuDesktopInactive = true;
    this.loadCurrentUser();
    this.loadEmployees();
    this.loadDepartments();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForm(): void {
    this.employeeForm = this.fb.group({
      user: [null, Validators.required],
      department: [null, Validators.required],
      monthly_salary: ['', [Validators.required, Validators.min(0)]],
      salary_currency: ['INR'],
      employee_id: ['', Validators.required],
      designation: ['', Validators.required],
      date_of_joining: [new Date(), Validators.required],
      emergency_contact_name: [''],
      emergency_contact_phone: ['', Validators.pattern(/^[0-9]{10}$/)],
      permanent_address: [''],
      current_address: [''],
      pan_number: ['', Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)],
      aadhar_number: ['', Validators.pattern(/^[0-9]{12}$/)],
      is_active: [true]
    });
  }

  currentPage: number = 1;
  pageSize: number = 10;
  totalRecords: number = 0;

  // ── Load current user from localStorage ──
  loadCurrentUser(): void {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        this.currentUser = JSON.parse(userData);
      }
    } catch (e) {
      console.error('Error loading current user:', e);
    }
  }

  get isOwner(): boolean {
    return this.currentUser?.role === 'owner';
  }

  // ── Check if owner already has an EmployeeProfile ──
  private checkOwnerEmployeeStatus(): void {
    if (!this.isOwner || !this.currentUser?.id) {
      this.ownerAlreadyEmployee = false;
      return;
    }
    this.ownerAlreadyEmployee = this.employees.some(
      emp => emp.user === this.currentUser.id || emp.user_details?.user_type === 'owner'
    );
  }

  onPageChange(event: any) {
    const page = event.first / event.rows + 1;  // PrimeNG gives zero-based
    const pageSize = event.rows;
    const sortField = event.sortField;
    const sortOrder = event.sortOrder; // 1 for asc, -1 for desc
    this.loadEmployees(page, pageSize, undefined, sortField, sortOrder);
  }

  loadEmployees(page: number = this.currentPage, pageSize: number = this.pageSize, search?: string, sortField?: string, sortOrder?: number) {
    this.loading = true;
    const params: any = {
    page: page,
    page_size: pageSize,
    search: search
  };
  let ordering = sortOrder === -1 ? `-${sortField}` : sortField;
  if (ordering) params.ordering = ordering;
    this.caFirmService.listEmployees(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          // Normalize response
        let data: any[];
        // Always expect DRF pagination
        if (!result || !Array.isArray(result.results)) {
          console.error("Unexpected response format:", data);
          this.totalRecords = 0;
          this.loading = false;
          return;
        }
          data = result.results;
          this.employees = data;

          this.totalRecords = result.count ?? data.length; // DRF count or fallback
          this.currentPage = page;
          this.pageSize = pageSize;

          // ── After loading employees, check if owner is already listed ──
          this.checkOwnerEmployeeStatus();

          this.loading = false;
        },
        error: (error) => {
          this.showError('Failed to load employees');
          this.loading = false;
          console.error('Error loading employees:', error);
        }
      });
  }

  loadDepartments(): void {
    this.caFirmService.listDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.departments = data;
        },
        error: (error) => {
          console.error('Error loading departments:', error);
        }
      });
  }

  loadUsers(): void {
    this.userManagerService.list_all_users().pipe(takeUntil(this.destroy$)).subscribe(data => {
      // ── CHANGED: Allow 'owner' in the user list; only exclude 'agent' ──
      data = data.filter(item => !['agent'].includes(item.user_type))
      this.users = data;
    });
  }

  openNew(): void {
    this.isEditMode = false;
    this.employeeForm.reset({
      salary_currency: 'INR',
      is_active: true,
      date_of_joining: new Date()
    });
    this.displayDialog = true;
  }

  // ── NEW: Add owner as employee with pre-filled form ──
  addOwnerAsSelf(): void {
    if (!this.currentUser?.id) {
      this.showError('Unable to identify current user');
      return;
    }

    this.isEditMode = false;
    this.employeeForm.reset({
      salary_currency: 'INR',
      is_active: true,
      date_of_joining: new Date()
    });

    // Pre-fill the user field with the owner's own ID
    this.employeeForm.patchValue({
      user: this.currentUser.id,
      designation: 'Managing Partner',
      employee_id: `OWNER-${Date.now().toString().slice(-6)}`,
    });

    this.displayDialog = true;
  }

  editEmployee(employee: Employee): void {
    this.isEditMode = true;
    this.selectedEmployee = employee;
    
    this.employeeForm.patchValue({
      ...employee,
      date_of_joining: new Date(employee.date_of_joining)
    });
    
    this.displayDialog = true;
  }

  viewDetails(employee: Employee): void {
    this.selectedEmployee = employee;
    this.displayDetailsDialog = true;
  }

  saveEmployee(): void {
    if (this.employeeForm.invalid) {
      this.markFormGroupTouched(this.employeeForm);
      this.showError('Please fill all required fields correctly');
      return;
    }

    const formValue = this.employeeForm.value;
    const employeeData = {
      ...formValue,
      date_of_joining: this.formatDate(formValue.date_of_joining)
    };

    this.loading = true;

    const request = this.isEditMode
      ? this.caFirmService.updateEmployee(this.selectedEmployee!.id!, employeeData)
      : this.caFirmService.createEmployee(employeeData);

    request.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(this.isEditMode ? 'Employee updated successfully' : 'Employee added successfully');
          this.loadEmployees();
          this.hideDialog();
        },
        error: (error) => {
          const errorMsg = error?.error?.detail || error?.error?.error 
            || error?.error?.user?.[0] || error?.error?.employee_id?.[0]
            || (this.isEditMode ? 'Failed to update employee' : 'Failed to add employee');
          this.showError(errorMsg);
          console.error('Error saving employee:', error);
          this.loading = false;
        }
      });
  }

  deleteEmployee(employee: Employee): void {
    const isOwnerRow = employee.user_details?.user_type === 'owner';
    const confirmMessage = isOwnerRow
      ? `This will remove your employee profile. You will keep your owner privileges. Continue?`
      : `Are you sure you want to delete ${employee.user_details?.username || 'this employee'}?`;

    this.confirmationService.confirm({
      message: confirmMessage,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading = true;
        this.caFirmService.deleteEmployee(employee.id!)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.showSuccess(isOwnerRow ? 'Owner employee profile removed' : 'Employee deleted successfully');
              this.loadEmployees();
            },
            error: (error) => {
              this.showError('Failed to delete employee');
              console.error('Error deleting employee:', error);
              this.loading = false;
            }
          });
      }
    });
  }

  toggleStatus(employee: Employee): void {
    const updatedEmployee = { ...employee, is_active: !employee.is_active };
    
    this.caFirmService.updateEmployee(employee.id!, updatedEmployee)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(`Employee ${updatedEmployee.is_active ? 'activated' : 'deactivated'} successfully`);
          this.loadEmployees();
        },
        error: (error) => {
          this.showError('Failed to update employee status');
          console.error('Error updating status:', error);
        }
      });
  }

  // ── Helper: check if an employee row is the owner ──
  isOwnerEmployee(employee: Employee): boolean {
    return employee.user_details?.user_type === 'owner';
  }

  hideDialog(): void {
    this.displayDialog = false;
    this.displayDetailsDialog = false;
    this.selectedEmployee = null;
  }

  onSearchInput(event: Event, dt: Table): void {
      const inputElement = event.target as HTMLInputElement;
      const searchValue = inputElement.value;
      this.currentPage = 1;
      this.loadEmployees(this.currentPage, this.pageSize, searchValue);
  }

  getFilteredEmployees(): Employee[] {
    let filtered = this.employees;
    return filtered;
  }

  getStatusSeverity(isActive: boolean): any {
    return isActive ? 'success' : 'danger';
  }

  getInitials(employee: Employee): string {
    if (employee.user_details?.first_name && employee.user_details?.last_name) {
      return `${employee.user_details.first_name[0]}${employee.user_details.last_name[0]}`.toUpperCase();
    }
    return employee.user_details?.username?.substring(0, 2).toUpperCase() || 'NA';
  }

  formatDate(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  formatCurrency(amount: string | number): string {
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  showSuccess(message: string): void {
    this.messageService.add({ severity: 'success', summary: 'Success', detail: message });
  }

  showError(message: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: message });
  }

  exportToExcel(): void {
    // Implement Excel export
    this.showSuccess('Excel export functionality to be implemented');
  }
}