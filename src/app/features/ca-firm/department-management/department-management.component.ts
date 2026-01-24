// src/app/features/ca-firm/department-management/department-management.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { TreeTableModule } from 'primeng/treetable';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmationService, MessageService, TreeNode } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { ChipModule } from 'primeng/chip';
import { CAFirmService } from '../../../shared/services/ca-firm.service';
import { UserManagerService } from '../../../shared/services/user-manager.service';
import { TextareaModule } from 'primeng/textarea';
import { LayoutService } from '../../../layout/service/app.layout.service';

interface Department {
  id?: number;
  name: string;
  description?: string;
  head?: number;
  parent_department?: number;
  is_triage: boolean;
  is_active: boolean;
  head_details?: {
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  employee_count?: number;
}

@Component({
  selector: 'app-department-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    TreeTableModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule,
    AvatarModule,
    CardModule,
    BadgeModule,
    CheckboxModule,
    TextareaModule,
    TooltipModule,
    ChipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './department-management.component.html',
  styleUrls: ['./department-management.component.scss']
})
export class DepartmentManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  departments: Department[] = [];
  treeNodes: TreeNode[] = [];
  employees: any[] = [];
  
  displayDialog = false;
  displayDetailsDialog = false;
  isEditMode = false;
  loading = false;
  
  departmentForm: FormGroup;
  selectedDepartment: Department | null = null;
  searchText = '';
  
  stats = {
    total: 0,
    active: 0,
    withHead: 0,
    triage: 0
  };

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
    this.loadDepartments();
    this.loadEmployees();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForm(): void {
    this.departmentForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      head: [null],
      parent_department: [null],
      is_triage: [false],
      is_active: [true]
    });
  }

  loadDepartments(): void {
    this.loading = true;
    this.caFirmService.listDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.departments = data;
          this.buildTreeNodes();
          this.calculateStats();
          this.loading = false;
        },
        error: (error) => {
          this.showError('Failed to load departments');
          this.loading = false;
          console.error('Error loading departments:', error);
        }
      });
  }

  loadEmployees(): void {
    this.userManagerService.list_users()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.employees = data;
        },
        error: (error) => {
          console.error('Error loading employees:', error);
        }
      });
  }

  buildTreeNodes(): void {
    const departmentMap = new Map<number, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // Create tree nodes
    this.departments.forEach(dept => {
      const node: TreeNode = {
        data: dept,
        children: [],
        expanded: true
      };
      departmentMap.set(dept.id!, node);
    });

    // Build hierarchy
    this.departments.forEach(dept => {
      const node = departmentMap.get(dept.id!);
      if (dept.parent_department) {
        const parent = departmentMap.get(dept.parent_department);
        if (parent) {
          parent.children?.push(node!);
        } else {
          rootNodes.push(node!);
        }
      } else {
        rootNodes.push(node!);
      }
    });

    this.treeNodes = rootNodes;
  }

  calculateStats(): void {
    this.stats.total = this.departments.length;
    this.stats.active = this.departments.filter(d => d.is_active).length;
    this.stats.withHead = this.departments.filter(d => d.head).length;
    this.stats.triage = this.departments.filter(d => d.is_triage).length;
  }

  openNew(): void {
    this.isEditMode = false;
    this.departmentForm.reset({
      is_triage: false,
      is_active: true
    });
    this.displayDialog = true;
  }

  editDepartment(department: Department): void {
    this.isEditMode = true;
    this.selectedDepartment = department;
    this.departmentForm.patchValue(department);
    this.displayDialog = true;
  }

  viewDetails(department: Department): void {
    this.selectedDepartment = department;
    this.displayDetailsDialog = true;
  }

  saveDepartment(): void {
    if (this.departmentForm.invalid) {
      this.markFormGroupTouched(this.departmentForm);
      this.showError('Please fill all required fields correctly');
      return;
    }

    this.loading = true;
    const departmentData = this.departmentForm.value;

    const request = this.isEditMode
      ? this.caFirmService.updateDepartment(this.selectedDepartment!.id!, departmentData)
      : this.caFirmService.createDepartment(departmentData);

    request.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(this.isEditMode ? 'Department updated successfully' : 'Department created successfully');
          this.loadDepartments();
          this.hideDialog();
        },
        error: (error) => {
          this.showError(this.isEditMode ? 'Failed to update department' : 'Failed to create department');
          console.error('Error saving department:', error);
          this.loading = false;
        }
      });
  }

  deleteDepartment(department: Department): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${department.name}? This will affect ${department.employee_count || 0} employees.`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading = true;
        this.caFirmService.deleteDepartment(department.id!)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.showSuccess('Department deleted successfully');
              this.loadDepartments();
            },
            error: (error) => {
              this.showError('Failed to delete department');
              console.error('Error deleting department:', error);
              this.loading = false;
            }
          });
      }
    });
  }

  toggleStatus(department: Department): void {
    const updatedDepartment = { ...department, is_active: !department.is_active };
    
    this.caFirmService.updateDepartment(department.id!, updatedDepartment)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(`Department ${updatedDepartment.is_active ? 'activated' : 'deactivated'} successfully`);
          this.loadDepartments();
        },
        error: (error) => {
          this.showError('Failed to update department status');
          console.error('Error updating status:', error);
        }
      });
  }

  toggleTriage(department: Department): void {
    const updatedDepartment = { ...department, is_triage: !department.is_triage };
    
    this.caFirmService.updateDepartment(department.id!, updatedDepartment)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(`Department ${updatedDepartment.is_triage ? 'marked' : 'unmarked'} as triage`);
          this.loadDepartments();
        },
        error: (error) => {
          this.showError('Failed to update triage status');
          console.error('Error updating triage:', error);
        }
      });
  }

  hideDialog(): void {
    this.displayDialog = false;
    this.displayDetailsDialog = false;
    this.selectedDepartment = null;
  }

  getStatusSeverity(isActive: boolean): any {
    return isActive ? 'success' : 'danger';
  }

  getInitials(department: Department): string {
    if (department.head_details?.first_name && department.head_details?.last_name) {
      return `${department.head_details.first_name[0]}${department.head_details.last_name[0]}`.toUpperCase();
    }
    return department.head_details?.username?.substring(0, 2).toUpperCase() || 'NA';
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
    this.showSuccess('Excel export functionality to be implemented');
  }
}