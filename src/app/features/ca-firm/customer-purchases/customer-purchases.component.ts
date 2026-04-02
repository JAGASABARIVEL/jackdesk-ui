// src/app/pages/customer-purchases/customer-purchases.component.ts
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

interface CustomerPurchase {
  id?: number;
  customer: number;
  customer_name?: string;
  product: number;
  product_name?: string;
  purchase_date: string;
  financial_year: string;
  quantity: string;
  unit_price: string;
  subtotal?: string;
  tax_amount?: string;
  total_amount?: string;
  invoice_number?: string;
  payment_status?: string;
  amount_paid?: string;
  amount_due?: string;
  description?: string;
  notes?: string;
}

@Component({
  selector: 'app-customer-purchases',
  templateUrl: './customer-purchases.component.html',
  styleUrls: ['./customer-purchases.component.scss'],
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
export class CustomerPurchasesComponent implements OnInit {
  purchases: CustomerPurchase[] = [];
  customers: any[] = [];
  products: any[] = [];
  filteredPurchases: CustomerPurchase[] = [];
  
  purchaseForm!: FormGroup;
  paymentForm!: FormGroup;
  
  showPurchaseModal = false;
  showPaymentModal = false;
  isEditMode = false;
  selectedPurchaseId: number | null = null;
  selectedPurchaseForPayment: CustomerPurchase | null = null;
  
  loading = false;
  searchTerm = '';
  
  selectedCustomer: number | null = null;
  selectedFinancialYear: string | null = null;
  selectedPaymentStatus: string | null = null;
  
  financialYears: string[] = [];
  paymentStatuses = [
    { value: 'pending', label: 'Pending' },
    { value: 'partial', label: 'Partial' },
    { value: 'paid', label: 'Paid' }
  ];
  
  paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'neft', label: 'NEFT/RTGS' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'card', label: 'Card' }
  ];

  constructor(
    private fb: FormBuilder,
    private layoutService: LayoutService,
    private caFirmService: CAFirmService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.initializeForms();
    this.generateFinancialYears();
  }

  profile !: any;
  ngOnInit(): void {
    this.profile = JSON.parse(localStorage.getItem('profile'));
    this.layoutService.state.staticMenuDesktopInactive = true;
    this.loadCustomers();
    this.loadProducts();
    this.loadPurchases();
  }

  initializeForms(): void {
    this.purchaseForm = this.fb.group({
      customer: [null, Validators.required],
      product: [null, Validators.required],
      purchase_date: [new Date(), Validators.required],
      financial_year: [this.getCurrentFinancialYear(), Validators.required],
      quantity: [1.00, [Validators.required, Validators.min(0)]],
      unit_price: [null, [Validators.required, Validators.min(0)]],
      description: [''],
      notes: ['']
    });

    this.paymentForm = this.fb.group({
      payment_date: [new Date(), Validators.required],
      amount: [null, [Validators.required, Validators.min(0)]],
      payment_method: [null, Validators.required],
      reference_number: [''],
      notes: ['']
    });
  }

  generateFinancialYears(): void {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    for (let i = -2; i <= 2; i++) {
      const year = currentMonth >= 3 ? currentYear + i : currentYear + i - 1;
      this.financialYears.push(`${year}-${(year + 1).toString().slice(-2)}`);
    }
  }

  loadCustomers(): void {
    this.caFirmService.listCustomers({ is_active: true }).subscribe({
      next: (response) => {
        this.customers = response.results || response;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load customers'
        });
      }
    });
  }

  loadProducts(): void {
    this.caFirmService.listProducts({ is_active: true }).subscribe({
      next: (response) => {
        this.products = response.results || response;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load products'
        });
      }
    });
  }

  loadPurchases(): void {
    this.loading = true;
    const params: any = {};
    
    if (this.selectedCustomer) params.customer = this.selectedCustomer;
    if (this.selectedFinancialYear) params.financial_year = this.selectedFinancialYear;
    if (this.selectedPaymentStatus) params.payment_status = this.selectedPaymentStatus;

    this.caFirmService.listCustomerPurchases(params).subscribe({
      next: (response) => {
        this.purchases = response.results || response;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load purchases'
        });
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredPurchases = this.purchases.filter(purchase => {
      const matchesSearch = !this.searchTerm || 
        purchase.customer_name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        purchase.product_name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        purchase.invoice_number?.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.loadPurchases();
  }

  clearFilters(): void {
    this.selectedCustomer = null;
    this.selectedFinancialYear = null;
    this.selectedPaymentStatus = null;
    this.searchTerm = '';
    this.loadPurchases();
  }

  openPurchaseModal(): void {
    this.isEditMode = false;
    this.selectedPurchaseId = null;
    this.purchaseForm.reset({
      quantity: 1.00,
      purchase_date: new Date(),
      financial_year: this.getCurrentFinancialYear()
    });
    this.showPurchaseModal = true;
  }

  editPurchase(purchase: CustomerPurchase): void {
    this.isEditMode = true;
    this.selectedPurchaseId = purchase.id!;
    this.purchaseForm.patchValue({
      customer: purchase.customer,
      product: purchase.product,
      purchase_date: new Date(purchase.purchase_date),
      financial_year: purchase.financial_year,
      quantity: parseFloat(purchase.quantity),
      unit_price: parseFloat(purchase.unit_price),
      description: purchase.description,
      notes: purchase.notes
    });
    this.showPurchaseModal = true;
  }

  onProductChange(): void {
    const productId = this.purchaseForm.get('product')?.value;
    if (productId) {
      const product = this.products.find(p => p.id === productId);
      if (product) {
        this.purchaseForm.patchValue({
          unit_price: parseFloat(product.base_price)
        });
      }
    }
  }

  savePurchase(): void {
    if (this.purchaseForm.invalid) {
      Object.keys(this.purchaseForm.controls).forEach(key => {
        this.purchaseForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    const formData = {
      ...this.purchaseForm.value,
      purchase_date: this.formatDateForAPI(this.purchaseForm.value.purchase_date)
    };

    const request = this.isEditMode && this.selectedPurchaseId
      ? this.caFirmService.updateCustomerPurchase(this.selectedPurchaseId, formData)
      : this.caFirmService.createCustomerPurchase(formData);

    request.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Purchase ${this.isEditMode ? 'updated' : 'created'} successfully`
        });
        this.closePurchaseModal();
        this.loadPurchases();
        this.loading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to ${this.isEditMode ? 'update' : 'create'} purchase`
        });
        this.loading = false;
      }
    });
  }

  deletePurchase(id: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this purchase?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading = true;
        this.caFirmService.deleteCustomerPurchase(id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Purchase deleted successfully'
            });
            this.loadPurchases();
            this.loading = false;
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete purchase'
            });
            this.loading = false;
          }
        });
      }
    });
  }

  openPaymentModal(purchase: CustomerPurchase): void {
    this.selectedPurchaseForPayment = purchase;
    this.paymentForm.reset({
      payment_date: new Date(),
      amount: parseFloat(purchase.amount_due || '0')
    });
    this.showPaymentModal = true;
  }

  recordPayment(): void {
    if (this.paymentForm.invalid || !this.selectedPurchaseForPayment) {
      Object.keys(this.paymentForm.controls).forEach(key => {
        this.paymentForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    const paymentData = {
      ...this.paymentForm.value,
      purchase: this.selectedPurchaseForPayment.id,
      payment_date: this.formatDateForAPI(this.paymentForm.value.payment_date)
    };

    this.caFirmService.recordCustomerPayment(paymentData).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Payment recorded successfully'
        });
        this.closePaymentModal();
        this.loadPurchases();
        this.loading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to record payment'
        });
        this.loading = false;
      }
    });
  }

  closePurchaseModal(): void {
    this.showPurchaseModal = false;
    this.purchaseForm.reset();
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.paymentForm.reset();
    this.selectedPurchaseForPayment = null;
  }

  exportToExcel(): void {
    //const data = this.filteredPurchases.map(p => ({
    //  'Invoice': p.invoice_number,
    //  'Date': this.formatDate(p.purchase_date),
    //  'Customer': p.customer_name,
    //  'Product/Service': p.product_name,
    //  'FY': p.financial_year,
    //  'Total Amount': p.total_amount,
    //  'Paid': p.amount_paid,
    //  'Balance': p.balance_due,
    //  'Status': p.payment_status
    //}));
    //const ws = XLSX.utils.json_to_sheet(data);
    //const wb = XLSX.utils.book_new();
    //XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
    //XLSX.writeFile(wb, `customer_purchases_${new Date().getTime()}.xlsx`);
  }

  getCurrentFinancialYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    if (month >= 3) {
      return `${year}-${(year + 1).toString().slice(-2)}`;
    } else {
      return `${year - 1}-${year.toString().slice(-2)}`;
    }
  }

  getPurchasesByStatus(status: string): CustomerPurchase[] {
    return this.filteredPurchases.filter(p => p.payment_status === status);
  }

  getTotalBalanceDue(): string {
    const total = this.filteredPurchases.reduce((sum, p) => 
      sum + parseFloat(p.amount_due || '0'), 0
    );
    return total.toFixed(2);
  }

  getPaymentStatusSeverity(status?: string): any {
    switch (status) {
      case 'paid': return 'success';
      case 'partial': return 'warn';
      case 'pending': return 'danger';
      default: return 'secondary';
    }
  }

  formatCurrency(amount?: string): string {
    return amount ? `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00';
  }

  formatDate(date?: string): string {
    return date ? new Date(date).toLocaleDateString('en-IN') : '-';
  }

  formatDateForAPI(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  parseFloat(value?: string): number {
    return parseFloat(value || '0');
  }
}