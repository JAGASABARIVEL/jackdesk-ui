// src/app/features/ca-firm/products-management/products-management.component.ts
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
import { CardModule } from 'primeng/card';
import { InputNumberModule } from 'primeng/inputnumber';
import { TabViewModule } from 'primeng/tabview';
import { SplitterModule } from 'primeng/splitter';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { ChipModule } from 'primeng/chip';
import { BadgeModule } from 'primeng/badge';
import { CAFirmService } from '../../../shared/services/ca-firm.service';
import { TextareaModule } from 'primeng/textarea';
import { FilterPipe } from '../../../shared/pipes/filter.pipe';
import { LayoutService } from '../../../layout/service/app.layout.service';

interface Category {
  id?: number;
  name: string;
  category_type: 'service' | 'product';
  description?: string;
}

interface Product {
  id?: number;
  name: string;
  description?: string;
  product_type: 'service' | 'product';
  category: number;
  category_name?: string;
  base_price: string;
  tax_percentage: string;
  hsn_sac_code?: string;
  unit: string;
  is_active: boolean;
}

@Component({
  selector: 'app-products-management',
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
    InputNumberModule,
    TextareaModule,
    TabViewModule,
    SplitterModule,
    TooltipModule,
    ChipModule,
    BadgeModule,
    FilterPipe
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './products-management.component.html',
  styleUrls: ['./products-management.component.scss']
})
export class ProductsManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  categories: Category[] = [];
  products: Product[] = [];
  
  displayCategoryDialog = false;
  displayProductDialog = false;
  displayDetailsDialog = false;
  isEditMode = false;
  loading = false;
  
  categoryForm: FormGroup;
  productForm: FormGroup;
  selectedCategory: Category | null = null;
  selectedProduct: Product | null = null;
  searchText = '';
  selectedCategoryFilter: number | null = null;
  selectedTypeFilter: string | null = null;
  
  categoryTypes = [
    { label: 'Service', value: 'service' },
    { label: 'Product', value: 'product' }
  ];

  units = [
    { label: 'Service', value: 'Service' },
    { label: 'Hour', value: 'Hour' },
    { label: 'Day', value: 'Day' },
    { label: 'Month', value: 'Month' },
    { label: 'Piece', value: 'Piece' },
    { label: 'Box', value: 'Box' },
    { label: 'Set', value: 'Set' }
  ];

  activeTabIndex = 0;

  constructor(
    private fb: FormBuilder,
    private layoutService: LayoutService,
    private caFirmService: CAFirmService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    this.layoutService.state.staticMenuDesktopInactive = true;
    this.loadCategories();
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForms(): void {
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      category_type: ['service', Validators.required],
      description: ['']
    });

    this.productForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      product_type: ['service', Validators.required],
      category: [null, Validators.required],
      base_price: ['', [Validators.required, Validators.min(0)]],
      tax_percentage: ['18.00', [Validators.required, Validators.min(0), Validators.max(100)]],
      hsn_sac_code: [''],
      unit: ['Service', Validators.required],
      is_active: [true]
    });
  }

  loadCategories(): void {
    this.loading = true;
    this.caFirmService.listCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.categories = data;
          this.loading = false;
        },
        error: (error) => {
          this.showError('Failed to load categories');
          this.loading = false;
          console.error('Error loading categories:', error);
        }
      });
  }

  currentPage: number = 1;
  pageSize: number = 10;
  totalRecords: number = 0;

  onPageChange(event: any) {
    const page = event.first / event.rows + 1;  // PrimeNG gives zero-based
    const pageSize = event.rows;
    const sortField = event.sortField;
    const sortOrder = event.sortOrder; // 1 for asc, -1 for desc
    this.loadProducts(page, pageSize, undefined, sortField, sortOrder);
  }

  loadProducts(page: number = this.currentPage, pageSize: number = this.pageSize, search?: string, sortField?: string, sortOrder?: number): void {
    this.loading = true;
    const params: any = {
    page: page,
    page_size: pageSize,
    search: search
  };
  let ordering = sortOrder === -1 ? `-${sortField}` : sortField;
  if (ordering) params.ordering = ordering;
    this.caFirmService.listProducts(params)
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
          this.products = data;

          this.totalRecords = result.count ?? data.length; // DRF count or fallback
          this.currentPage = page;
          this.pageSize = pageSize;
          this.loading = false;
        },
        error: (error) => {
          this.showError('Failed to load products');
          this.loading = false;
          console.error('Error loading products:', error);
        }
      });
  }

  // Category Methods
  openNewCategory(): void {
    this.isEditMode = false;
    this.categoryForm.reset({ category_type: 'service' });
    this.displayCategoryDialog = true;
  }

  editCategory(category: Category): void {
    this.isEditMode = true;
    this.selectedCategory = category;
    this.categoryForm.patchValue(category);
    this.displayCategoryDialog = true;
  }

  onSearchInput(event: Event, dt: Table): void {
        const inputElement = event.target as HTMLInputElement;
        const searchValue = inputElement.value;
        this.currentPage = 1;
        this.loadProducts(this.currentPage, this.pageSize, searchValue);
        //dt.filterGlobal(searchValue, 'contains');
      }

  saveCategory(): void {
    if (this.categoryForm.invalid) {
      this.markFormGroupTouched(this.categoryForm);
      this.showError('Please fill all required fields correctly');
      return;
    }

    this.loading = true;
    const categoryData = this.categoryForm.value;

    const request = this.isEditMode
      ? this.caFirmService.updateCategory(this.selectedCategory!.id!, categoryData)
      : this.caFirmService.createCategory(categoryData);

    request.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(this.isEditMode ? 'Category updated successfully' : 'Category created successfully');
          this.loadCategories();
          this.hideCategoryDialog();
        },
        error: (error) => {
          this.showError(this.isEditMode ? 'Failed to update category' : 'Failed to create category');
          console.error('Error saving category:', error);
          this.loading = false;
        }
      });
  }

  deleteCategory(category: Category): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${category.name}?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading = true;
        this.caFirmService.deleteCategory(category.id!)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.showSuccess('Category deleted successfully');
              this.loadCategories();
            },
            error: (error) => {
              this.showError('Failed to delete category');
              console.error('Error deleting category:', error);
              this.loading = false;
            }
          });
      }
    });
  }

  // Product Methods
  openNewProduct(): void {
    this.isEditMode = false;
    this.productForm.reset({
      product_type: 'service',
      tax_percentage: '18.00',
      unit: 'Service',
      is_active: true
    });
    this.displayProductDialog = true;
  }

  editProduct(product: Product): void {
    this.isEditMode = true;
    this.selectedProduct = product;
    this.productForm.patchValue(product);
    this.displayProductDialog = true;
  }

  viewDetails(product: Product): void {
    this.selectedProduct = product;
    this.displayDetailsDialog = true;
  }

  saveProduct(): void {
    if (this.productForm.invalid) {
      this.markFormGroupTouched(this.productForm);
      this.showError('Please fill all required fields correctly');
      return;
    }

    this.loading = true;
    const productData = this.productForm.value;

    const request = this.isEditMode
      ? this.caFirmService.updateProduct(this.selectedProduct!.id!, productData)
      : this.caFirmService.createProduct(productData);

    request.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(this.isEditMode ? 'Product updated successfully' : 'Product created successfully');
          this.loadProducts();
          this.hideProductDialog();
        },
        error: (error) => {
          this.showError(this.isEditMode ? 'Failed to update product' : 'Failed to create product');
          console.error('Error saving product:', error);
          this.loading = false;
        }
      });
  }

  deleteProduct(product: Product): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${product.name}?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading = true;
        this.caFirmService.deleteProduct(product.id!)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.showSuccess('Product deleted successfully');
              this.loadProducts();
            },
            error: (error) => {
              this.showError('Failed to delete product');
              console.error('Error deleting product:', error);
              this.loading = false;
            }
          });
      }
    });
  }

  toggleProductStatus(product: Product): void {
    const updatedProduct = { ...product, is_active: !product.is_active };
    
    this.caFirmService.updateProduct(product.id!, updatedProduct)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(`Product ${updatedProduct.is_active ? 'activated' : 'deactivated'} successfully`);
          this.loadProducts();
        },
        error: (error) => {
          this.showError('Failed to update product status');
          console.error('Error updating status:', error);
        }
      });
  }

  hideCategoryDialog(): void {
    this.displayCategoryDialog = false;
    this.selectedCategory = null;
  }

  hideProductDialog(): void {
    this.displayProductDialog = false;
    this.selectedProduct = null;
  }

  hideDetailsDialog(): void {
    this.displayDetailsDialog = false;
    this.selectedProduct = null;
  }

  getFilteredProducts(): Product[] {
    let filtered = this.products;

    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(search) ||
        p.hsn_sac_code?.toLowerCase().includes(search) ||
        p.category_name?.toLowerCase().includes(search)
      );
    }

    if (this.selectedCategoryFilter) {
      filtered = filtered.filter(p => p.category === this.selectedCategoryFilter);
    }

    if (this.selectedTypeFilter) {
      filtered = filtered.filter(p => p.product_type === this.selectedTypeFilter);
    }

    return filtered;
  }

  calculateTotal(basePrice: string | number, taxPercentage: string | number): number {
    const base = Number(basePrice) || 0;
    const tax = Number(taxPercentage) || 0;
    return base + (base * tax / 100);
  }

  formatCurrency(amount: string | number): string {
    return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  getStatusSeverity(isActive: boolean): any {
    return isActive ? 'success' : 'danger';
  }

  getTypeBadge(type: string): any {
    return type === 'service' ? 'info' : 'success';
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