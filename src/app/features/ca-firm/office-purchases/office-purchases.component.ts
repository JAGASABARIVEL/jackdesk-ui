// src/app/features/ca-firm/office-purchases/office-purchases.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ToolbarModule } from 'primeng/toolbar';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { ChipModule } from 'primeng/chip';
import { BadgeModule } from 'primeng/badge';
import { TimelineModule } from 'primeng/timeline';
import { TabsModule } from 'primeng/tabs';
import { AccordionModule } from 'primeng/accordion';

import { CAFirmService } from '../../../shared/services/ca-firm.service';
import { TextareaModule } from 'primeng/textarea';
import { LayoutService } from '../../../layout/service/app.layout.service';

interface Vendor {
  id?: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  pan?: string;
}

interface Category {
  id: number;
  name: string;
  category_type: string;
}

interface Purchase {
  id?: number;
  vendor: number;
  vendor_name?: string;
  category: number;
  category_name?: string;
  invoice_number: string;
  purchase_date: string;
  description: string;
  amount: string;
  tax_amount: string;
  total_amount: string;
  payment_status?: string;
  paid_amount?: number;
  remaining_amount?: number;
  notes?: string;
  payments?: Payment[];
}

interface Payment {
  id?: number;
  purchase: number;
  payment_date: string;
  amount: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
}

@Component({
  selector: 'app-office-purchases',
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
    CardModule,
    ToolbarModule,
    TextareaModule,
    DatePickerModule,
    TooltipModule,
    ChipModule,
    BadgeModule,
    TimelineModule,
    TabsModule,
    AccordionModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './office-purchases.component.html',
  styleUrls: ['./office-purchases.component.scss']
})
export class OfficePurchasesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data
  purchases: Purchase[] = [];
  vendors: Vendor[] = [];
  categories: Category[] = [];
  
  // Dialogs
  displayPurchaseDialog = false;
  displayVendorDialog = false;
  displayPaymentDialog = false;
  displayDetailsDialog = false;
  displayCategoryDialog = false;
  
  // Forms
  purchaseForm: FormGroup;
  vendorForm: FormGroup;
  paymentForm: FormGroup;
  categoryForm: FormGroup;
  
  // State
  loading = false;
  isEditMode = false;
  selectedPurchase: Purchase | null = null;
  selectedVendor: Vendor | null = null;
  
  // Filters
  searchText = '';
  selectedVendorFilter: number | null = null;
  selectedStatusFilter: string | null = null;
  dateRange: Date[] = [];
  
  // Options
  paymentMethods = [
    { label: 'Cash', value: 'cash' },
    { label: 'UPI', value: 'upi' },
    { label: 'NEFT/RTGS', value: 'neft' },
    { label: 'Cheque', value: 'cheque' },
    { label: 'Bank Transfer', value: 'bank_transfer' }
  ];
  
  paymentStatuses = [
    { label: 'All', value: null },
    { label: 'Pending', value: 'pending' },
    { label: 'Partial', value: 'partial' },
    { label: 'Paid', value: 'paid' }
  ];

  // Summary Stats
  summaryStats = {
    total_purchases: 0,
    total_amount: 0,
    paid_amount: 0,
    pending_amount: 0
  };

  constructor(
    private fb: FormBuilder,
    private layoutService: LayoutService,
    private caFirmService: CAFirmService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.initForms();
  }

  profile !: any;
  ngOnInit(): void {
    this.profile = JSON.parse(localStorage.getItem('profile'));
    this.layoutService.state.staticMenuDesktopInactive = true;
    this.loadPurchases();
    this.loadVendors();
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForms(): void {
    this.purchaseForm = this.fb.group({
      vendor: [null, Validators.required],
      category: [null, Validators.required],
      invoice_number: ['', Validators.required],
      purchase_date: [new Date(), Validators.required],
      description: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0)]],
      tax_amount: ['', [Validators.required, Validators.min(0)]],
      notes: ['']
    });

    // Auto-calculate total
    this.purchaseForm.get('amount')?.valueChanges.subscribe(() => this.calculateTotal());
    this.purchaseForm.get('tax_amount')?.valueChanges.subscribe(() => this.calculateTotal());

    this.vendorForm = this.fb.group({
      name: ['', Validators.required],
      contact_person: [''],
      phone: ['', Validators.pattern(/^[0-9]{10}$/)],
      email: ['', Validators.email],
      address: [''],
      gstin: ['', Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)],
      pan: ['', Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)]
    });

    this.paymentForm = this.fb.group({
      purchase: [null],
      payment_date: [new Date(), Validators.required],
      amount: ['', [Validators.required, Validators.min(0)]],
      payment_method: ['', Validators.required],
      reference_number: [''],
      notes: ['']
    });

    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  calculateTotal(): void {
    const amount = parseFloat(this.purchaseForm.get('amount')?.value || 0);
    const tax = parseFloat(this.purchaseForm.get('tax_amount')?.value || 0);
    const total = amount + tax;
    // Display only, not in form
  }

  openNewCategory() {
  this.categoryForm.reset();
  this.displayCategoryDialog = true;
}

  loadPurchases(): void {
    this.loading = true;
    const params: any = {};
    
    if (this.dateRange && this.dateRange[0] && this.dateRange[1]) {
      params.start_date = this.formatDate(this.dateRange[0]);
      params.end_date = this.formatDate(this.dateRange[1]);
    }

    this.caFirmService.listOfficePurchases(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.purchases = data;
          this.calculateSummary();
          this.loading = false;
        },
        error: (error) => {
          this.showError('Failed to load purchases');
          this.loading = false;
          console.error('Error loading purchases:', error);
        }
      });
  }

  loadVendors(): void {
    this.caFirmService.listVendors()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.vendors = data;
        },
        error: (error) => {
          console.error('Error loading vendors:', error);
        }
      });
  }

  loadCategories(): void {
    this.caFirmService.listCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.categories = data.filter((c: Category) => c.category_type === 'product');
        },
        error: (error) => {
          console.error('Error loading categories:', error);
        }
      });
  }

  calculateSummary(): void {
    this.summaryStats = {
      total_purchases: this.purchases.length,
      total_amount: this.purchases.reduce((sum, p) => sum + parseFloat(p.total_amount || '0'), 0),
      paid_amount: this.purchases.reduce((sum, p) => sum + (p.paid_amount || 0), 0),
      pending_amount: this.purchases.reduce((sum, p) => sum + (p.remaining_amount || 0), 0)
    };
  }

  // Purchase Operations
  openNewPurchase(): void {
    this.isEditMode = false;
    this.purchaseForm.reset({ purchase_date: new Date() });
    this.displayPurchaseDialog = true;
  }

  editPurchase(purchase: Purchase): void {
    this.isEditMode = true;
    this.selectedPurchase = purchase;
    this.purchaseForm.patchValue({
      ...purchase,
      purchase_date: new Date(purchase.purchase_date)
    });
    this.displayPurchaseDialog = true;
  }

  savePurchase(): void {
    if (this.purchaseForm.invalid) {
      this.markFormGroupTouched(this.purchaseForm);
      this.showError('Please fill all required fields correctly');
      return;
    }

    const formValue = this.purchaseForm.value;
    const amount = parseFloat(formValue.amount);
    const tax = parseFloat(formValue.tax_amount);
    
    const purchaseData = {
      ...formValue,
      purchase_date: this.formatDate(formValue.purchase_date),
      amount: amount.toFixed(2),
      tax_amount: tax.toFixed(2),
      total_amount: (amount + tax).toFixed(2)
    };

    this.loading = true;

    const request = this.isEditMode
      ? this.caFirmService.updateOfficePurchase(this.selectedPurchase!.id!, purchaseData)
      : this.caFirmService.createOfficePurchase(purchaseData);

    request.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(this.isEditMode ? 'Purchase updated successfully' : 'Purchase added successfully');
          this.loadPurchases();
          this.hideDialog();
        },
        error: (error) => {
          this.showError(this.isEditMode ? 'Failed to update purchase' : 'Failed to add purchase');
          console.error('Error saving purchase:', error);
          this.loading = false;
        }
      });
  }

  deletePurchase(purchase: Purchase): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete purchase ${purchase.invoice_number}?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading = true;
        this.caFirmService.deleteOfficePurchase(purchase.id!)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.showSuccess('Purchase deleted successfully');
              this.loadPurchases();
            },
            error: (error) => {
              this.showError('Failed to delete purchase');
              console.error('Error deleting purchase:', error);
              this.loading = false;
            }
          });
      }
    });
  }

  // Vendor Operations
  openNewVendor(): void {
    this.vendorForm.reset();
    this.displayVendorDialog = true;
  }

  saveVendor(): void {
    if (this.vendorForm.invalid) {
      this.markFormGroupTouched(this.vendorForm);
      this.showError('Please fill all required fields correctly');
      return;
    }

    this.loading = true;
    this.caFirmService.createVendor(this.vendorForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (vendor) => {
          this.showSuccess('Vendor added successfully');
          this.loadVendors();
          this.displayVendorDialog = false;
          // Auto-select the new vendor in purchase form
          if (this.displayPurchaseDialog) {
            this.purchaseForm.patchValue({ vendor: vendor.id });
          }
          this.loading = false;
        },
        error: (error) => {
          this.showError('Failed to add vendor');
          console.error('Error saving vendor:', error);
          this.loading = false;
        }
      });
  }

  // Payment Operations
  openPaymentDialog(purchase: Purchase): void {
    this.selectedPurchase = purchase;
    const remainingAmount = purchase.remaining_amount || 0;
    
    this.paymentForm.reset({
      purchase: purchase.id,
      payment_date: new Date(),
      amount: remainingAmount.toFixed(2)
    });
    
    this.displayPaymentDialog = true;
  }

  recordPayment(): void {
    if (this.paymentForm.invalid) {
      this.markFormGroupTouched(this.paymentForm);
      this.showError('Please fill all required fields correctly');
      return;
    }

    const formValue = this.paymentForm.value;
    const paymentData = {
      ...formValue,
      payment_date: this.formatDate(formValue.payment_date),
      amount: parseFloat(formValue.amount).toFixed(2)
    };

    // Validate payment amount
    if (parseFloat(paymentData.amount) > (this.selectedPurchase?.remaining_amount || 0)) {
      this.showError('Payment amount cannot exceed remaining amount');
      return;
    }

    this.loading = true;
    this.caFirmService.recordPurchasePayment(paymentData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Payment recorded successfully');
          this.loadPurchases();
          this.displayPaymentDialog = false;
        },
        error: (error) => {
          this.showError('Failed to record payment');
          console.error('Error recording payment:', error);
          this.loading = false;
        }
      });
  }

  viewDetails(purchase: Purchase): void {
    this.selectedPurchase = purchase;
    this.displayDetailsDialog = true;
  }

  // Filtering
  getFilteredPurchases(): Purchase[] {
    let filtered = this.purchases;

    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(p => 
        p.invoice_number?.toLowerCase().includes(search) ||
        p.vendor_name?.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search)
      );
    }

    if (this.selectedVendorFilter) {
      filtered = filtered.filter(p => p.vendor === this.selectedVendorFilter);
    }

    if (this.selectedStatusFilter) {
      filtered = filtered.filter(p => p.payment_status === this.selectedStatusFilter);
    }

    return filtered;
  }

  getStatusSeverity(status: string): any {
    const severities: any = {
      paid: 'success',
      partial: 'warn',
      pending: 'danger'
    };
    return severities[status] || 'info';
  }

  // Utility Methods
  hideDialog(): void {
    this.displayPurchaseDialog = false;
    this.displayVendorDialog = false;
    this.displayPaymentDialog = false;
    this.displayDetailsDialog = false;
    this.selectedPurchase = null;
    this.loading = false;
  }

  formatDate(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  formatCurrency(amount: string | number): string {
    return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  getPaymentMethodLabel(method: string): string {
    const found = this.paymentMethods.find(m => m.value === method);
    return found?.label || method;
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