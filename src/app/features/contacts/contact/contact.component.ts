import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
//import { Product } from '@domain/product';
//import { ProductService } from '@service/productservice';
import { Table, TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { RippleModule } from 'primeng/ripple';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CommonModule } from '@angular/common';
import { FileUploadModule } from 'primeng/fileupload';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { RadioButtonModule } from 'primeng/radiobutton';
import { AvatarModule } from 'primeng/avatar';
import { FormsModule } from '@angular/forms';
import { ContactModel } from './contacts.model';
import { Router } from '@angular/router';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { ContactManagerService } from '../../../shared/services/contact-manager.service';
import { LayoutService } from '../../../layout/service/app.layout.service';
import { catchError, forkJoin, of, Subject, takeUntil } from 'rxjs';
import { supported_platforms } from '../../../shared/constants';
import { SelectModule } from 'primeng/select';
import { CalendarModule } from 'primeng/calendar';
import { PlatformManagerService } from '../../../shared/services/platform-manager.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    DialogModule,
    RippleModule,
    ButtonModule,
    ToastModule,
    ToolbarModule,
    ConfirmDialogModule,
    TextareaModule,
    FileUploadModule,
    DropdownModule,
    TagModule,
    RadioButtonModule,
    InputTextModule,
    AvatarModule,
    SelectModule,
    CalendarModule,

    InputGroupModule,
    InputGroupAddonModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent implements OnInit, OnDestroy {
  @Output() totalContacts: EventEmitter<number> = new EventEmitter();

  profile!: any;
  loading = true;
  dialogProgress = false;
  productDialog: boolean = false;
  products!: ContactModel[];
  supported_platforms = supported_platforms;
  platforms: any[] = [];  // ✅ Holds Platform objects filtered by platform_name
  product!: any;
  selectedProducts!: any[] | null;
  submitted: boolean = false;
  statuses!: any[];

  customFieldDefs: any[] = []; // ✅ Holds the custom field definitions

  selectedImportPlatformId: number | null = null;
  showImportDialog: boolean = false;

  // ✅ Country code configuration
  supportedCountryCodes = [
    { name: 'India', code: '91', flag: '🇮🇳', minLength: 10, maxLength: 10 },
    { name: 'Bangladesh', code: '880', flag: '🇧🇩', minLength: 10, maxLength: 10 },
    { name: 'Sri Lanka', code: '94', flag: '🇱🇰', minLength: 9, maxLength: 9 },
    { name: 'Nepal', code: '977', flag: '🇳🇵', minLength: 10, maxLength: 10 }
  ];

  selectedCountryCode: any = null;
  phoneNumberWithoutCode: string = '';
  isWhatsAppContact: boolean = false;


  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private layoutService: LayoutService,
    private contactService: ContactManagerService,
    private platformService: PlatformManagerService
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit() {
    this.profile = JSON.parse(localStorage.getItem('profile'));
    if (!this.profile) {
      this.router.navigate(['/apps/login']);
      return;
    } else {
      this.layoutService.state.staticMenuDesktopInactive = true;
      this.loadContacts();
      this.loading = false;
    }
  }

  getSelectedPlatformName(): string {
    if (!this.product.platform_id || !this.platforms.length) {
      return '';
    }
    const platform = this.platforms.find(p => p.id === this.product.platform_id);
    return platform ? platform.user_platform_name : '';
  }

  loadPlatformsByType(platformName: string) {
    if (!platformName) {
      this.platforms = [];
      return;
    }

    this.platformService.list_platforms_by_type(platformName).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.platforms = data.map(platform => {
          // Add image type like in your existing code
          if (platform.platform_name === 'whatsapp') {
            platform.image_type = 'svg';
          } else if (['webchat', 'messenger', 'gmail', 'gmessages', 'smsrelay'].includes(platform.platform_name)) {
            platform.image_type = 'png';
          }
          return platform;
        });
      },
      error: (err) => {
        console.error('Contact | Error loading platforms', err);
        this.platforms = [];
      }
    });
  }

  getPhoneValidationMessage(): string {
    if (!this.isWhatsAppContact || !this.selectedCountryCode) {
      return '';
    }

    const { minLength, maxLength, name } = this.selectedCountryCode;
    const currentLength = this.phoneNumberWithoutCode.length;

    if (currentLength === 0) {
      return `Enter ${name} phone number (${minLength} digits)`;
    } else if (currentLength < minLength) {
      return `Need ${minLength - currentLength} more digit(s)`;
    } else if (currentLength > maxLength) {
      return `Too long! Maximum ${maxLength} digits`;
    } else {
      return '✓ Valid number';
    }
  }

  mergePhoneWithCountryCode(): string {
    if (!this.isWhatsAppContact) {
      return this.product.phone || '';
    }

    if (!this.selectedCountryCode || !this.phoneNumberWithoutCode) {
      return '';
    }

    return `${this.selectedCountryCode.code}${this.phoneNumberWithoutCode}`;
  }

  onPhoneNumberInput() {
    // Remove non-numeric characters
    this.phoneNumberWithoutCode = this.phoneNumberWithoutCode.replace(/\D/g, '');
    this.validatePhoneNumber();
  }

  validatePhoneNumber(): boolean {
    if (!this.isWhatsAppContact) {
      return true; // No validation for non-WhatsApp contacts
    }

    if (!this.selectedCountryCode) {
      return false;
    }

    const numberLength = this.phoneNumberWithoutCode.length;
    const { minLength, maxLength } = this.selectedCountryCode;

    return numberLength >= minLength && numberLength <= maxLength;
  }

  onCountryCodeChange(countryCode: any) {
    this.selectedCountryCode = countryCode;
    this.validatePhoneNumber();
  }

  parsePhoneNumber(phone: string): { countryCode: any; number: string } | null {
    if (!phone) return null;
    
    // Remove any spaces, dashes, or plus signs
    const cleaned = phone.replace(/[\s\-\+]/g, '');
    
    // Try to match with supported country codes
    for (const cc of this.supportedCountryCodes) {
      if (cleaned.startsWith(cc.code)) {
        return {
          countryCode: cc,
          number: cleaned.substring(cc.code.length)
        };
      }
    }
    
    return null;
  }

  initializeCountryCode() {
    // Parse existing phone number if editing
    if (this.product.phone) {
      const parsed = this.parsePhoneNumber(this.product.phone);
      if (parsed) {
        this.selectedCountryCode = parsed.countryCode;
        this.phoneNumberWithoutCode = parsed.number;
      } else {
        // Default to India if no valid code found
        this.selectedCountryCode = this.supportedCountryCodes[0];
        this.phoneNumberWithoutCode = this.product.phone.replace(/^\+/, '');
      }
    } else {
      // Default to India for new contacts
      this.selectedCountryCode = this.supportedCountryCodes[0];
      this.phoneNumberWithoutCode = '';
    }
  }

  onPlatformNameChange(platformName: string) {
    this.product.platform_id = null;
    this.isWhatsAppContact = platformName?.toLowerCase() === 'whatsapp';
    
    // Reset country code selection when platform changes
    if (this.isWhatsAppContact) {
      this.initializeCountryCode();
    } else {
      this.selectedCountryCode = null;
      this.phoneNumberWithoutCode = '';
    }
    
    this.loadPlatformsByType(platformName);
  }

  currentPage: number = 1;
  pageSize: number = 10;
  totalRecords: number = 0;

  onPageChange(event: any) {
    const page = event.first / event.rows + 1;  // PrimeNG gives zero-based
    const pageSize = event.rows;
    const sortField = event.sortField;
    const sortOrder = event.sortOrder; // 1 for asc, -1 for desc
    this.loadContacts(undefined, page, pageSize, undefined, sortField, sortOrder);
  }

  loadContacts(successCallback = undefined, page: number = this.currentPage, pageSize: number = this.pageSize, search?: string, sortField?: string, sortOrder?: number) {
    this.loading = true;
    sortField = sortField === 'user_platform_name' ? 'platform_name' : sortField;
    let ordering = sortOrder === -1 ? `-${sortField}` : sortField;
    this.contactService.list_contact(page, pageSize, search, ordering).pipe(takeUntil(this.destroy$)).subscribe(
      (result) => {
        // Normalize response
        let data: any[];
        // Always expect DRF pagination
        if (!result || !Array.isArray(result.results)) {
          console.error("Unexpected response format:", data);
          this.products = [];
          this.totalRecords = 0;
          this.loading = false;
          return;
        }
        data = result.results;
        
        // Always assign an array
        this.products = data.map(contact => {
          contact._search_blob = [
            contact.name,
            contact.phone,
            contact.category,
            contact.description,
            contact.user_platform_name || '',
            ...Object.values(contact.custom_fields || {})
          ].join(' ').toLowerCase();
          return contact;
        });
        this.totalRecords = result.count ?? data.length; // DRF count or fallback
        this.currentPage = page;
        this.pageSize = pageSize;
        this.loading = false;

        this.totalContacts.emit(this.products.length);
        //this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Contacts Loaded', life: 3000 });
        if (successCallback) {
          successCallback();
        }
      },
      (err) => {
        this.loading = false;
        console.error("Contacts | Error getting contacts ", err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Contacts Not Loaded', sticky: true });
      }
    );
  }

  onSearchInput(event: Event, dt: Table): void {
    const inputElement = event.target as HTMLInputElement;
    const searchValue = inputElement.value;
    this.currentPage = 1;
    this.loadContacts(undefined, this.currentPage, this.pageSize, searchValue);
    //dt.filterGlobal(searchValue, 'contains');
  }

  // contact.component.ts - ADD METHOD
viewCustomerDetail(customerId: number): void {
  this.router.navigate(['/apps/contacts', customerId]);
}

isFormValid(): boolean {
    const baseValid = this.product.name && this.product.platform_name && this.product.platform_id;
    
    if (this.isWhatsAppContact) {
      return baseValid && this.selectedCountryCode && this.validatePhoneNumber();
    }
    
    return baseValid && this.product.phone;
  }

  openNew() {
    this.product = {
      name: '',
      phone: '',
      description: '',
      address: '',
      category: '',
      platform_name: '',
      platform_id: null,
      image: '',
      custom_fields: {}
    };
    this.platforms = [];
    this.selectedCountryCode = this.supportedCountryCodes[0]; // Default to India
    this.phoneNumberWithoutCode = '';
    this.isWhatsAppContact = false;
    this.submitted = false;

    this.contactService.list_contact_custom_fields().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.customFieldDefs = res;
        res.forEach(field => this.product.custom_fields[field.key] = '');
        this.productDialog = true;
      },
      error: (err) => {
        console.error('Error fetching custom fields', err);
        this.customFieldDefs = [];
        this.productDialog = true;
      }
    });
  }

  editProduct(product: any) {
    this.product = { ...product };
    if (!this.product.custom_fields) this.product.custom_fields = {};

    this.isWhatsAppContact = this.product.platform_name?.toLowerCase() === 'whatsapp';
    
    if (this.isWhatsAppContact) {
      this.initializeCountryCode();
    }

    if (this.product.platform_name) {
      this.loadPlatformsByType(this.product.platform_name);
    } else {
      this.platforms = [];
    }

    this.contactService.list_contact_custom_fields().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.customFieldDefs = res;
        res.forEach(field => {
          if (!(field.key in this.product.custom_fields)) {
            this.product.custom_fields[field.key] = '';
          }
        });
        this.productDialog = true;
      },
      error: (err) => {
        console.error('Error fetching custom fields', err);
        this.customFieldDefs = [];
        this.productDialog = true;
      }
    });
  }

  saveProduct() {
    this.submitted = true;

    // ✅ Merge country code with phone number for WhatsApp contacts
    if (this.isWhatsAppContact) {
      if (!this.selectedCountryCode || !this.validatePhoneNumber()) {
        this.messageService.add({
          severity: 'error',
          summary: 'Invalid Phone Number',
          detail: 'Please enter a valid phone number with country code',
          life: 3000
        });
        return;
      }
      this.product.phone = this.mergePhoneWithCountryCode();
    }

    this.dialogProgress = true;

    if (this.product.name?.trim() && this.product.phone?.trim()) {
      const payload = {
        ...this.product,
        custom_fields: this.product.custom_fields || {}
      };

      if (this.product.id) {
        this.contactService.update_contact(payload).pipe(takeUntil(this.destroy$)).subscribe(
          () => this.loadContacts(this.saveContactCallback),
          (err) => {
            console.error("Contacts | Error updating contact ", err);
            this.product = {};
            this.dialogProgress = false;
            this.productDialog = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Contact not updated', sticky: true });
          }
        );
      } else {
        this.contactService.create_contact(payload).pipe(takeUntil(this.destroy$)).subscribe(
          () => this.loadContacts(this.createContactCallback),
          (err) => {
            console.error("Contacts | Error creating contact ", err);
            this.product = {};
            this.dialogProgress = false;
            this.productDialog = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: "Contact not created", sticky: true });
          }
        );
      }
    }
  }


  deleteSelectedProducts() {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete the selected contacts?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading = true;
        let contactIds = this.selectedProducts.map(contact => contact.id);
        this.contactService.delete_contacts(contactIds).pipe(takeUntil(this.destroy$)).subscribe(
          () => {
            this.selectedProducts = null;
            this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Contact Deleted', life: 3000 });
            this.loadContacts();
          },
          (err) => {
            console.error("Contacts | Error deleting contact ", err);
            this.selectedProducts = null;
            this.loading = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Contact Not Deleted', sticky: true });
          }
        );
      }
    });
  }

  deleteProduct(product: any) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete ' + product.name + '?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading = true;
        this.contactService.delete_contact(product.id).pipe(takeUntil(this.destroy$)).subscribe(
          () => {
            this.products = this.products.filter((val) => val.id !== product.id);
            this.product = {};
            this.loading = false;
            this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Contact Deleted', life: 3000 });
          },
          (err) => {
            console.error("Contacts | Error deleting contact ", err);
            this.loading = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Contact Not Deleted', sticky: true });
          }
        );
      }
    });
  }

  hideDialog() {
    this.productDialog = false;
    this.submitted = false;
  }

  saveContactCallback = () => {
    this.product = {};
    this.dialogProgress = false;
    this.productDialog = false;
    this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Contact Updated', life: 3000 });
  };

  createContactCallback = () => {
    this.dialogProgress = false;
    this.productDialog = false;
    this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Contact Created', life: 3000 });
  };

  findIndexById(id: string): number {
    return this.products.findIndex(p => p.id === id);
  }

  createId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 5 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  }

  getSeverity(status: string) {
    switch (status) {
      case 'Individual': return 'info';
      case 'Micro Enterprise': return 'success';
      case 'Small Enterprise': return 'warn';
      case 'Medium Enterprise': return 'danger';
    }
    return 'danger';
  }

  bulkUploadCallback() {
    this.messageService.add({
      severity: 'success',
      summary: 'Import Successful',
      detail: 'contacts imported successfully',
      sticky: true
    });
    this.loading = false;
  }

  onBulkUpload(event: any, fileUpload: any): void {
    if (!this.selectedImportPlatformId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Platform Required',
        detail: 'Please select a platform instance first',
        life: 3000
      });
      fileUpload.clear();
      return;
    }

    this.loading = true;
    const file = event.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      
      this.contactService.import_contact_with_platform(formData, this.selectedImportPlatformId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Import Successful',
              detail: `Imported: ${response.imported_count}, Updated: ${response.updated_count}`,
              life: 5000
            });
            
            if (response.errors && response.errors.length > 0) {
              this.messageService.add({
                severity: 'warn',
                summary: 'Some Errors',
                detail: `${response.errors.length} contacts had errors`,
                sticky: true
              });
            }
            
            fileUpload.clear();
            this.showImportDialog = false;
            this.selectedImportPlatformId = null;
            this.loadContacts();
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Import Failed',
              detail: err.error?.error || 'An error occurred while importing contacts',
              sticky: true
            });
            fileUpload.clear();
            this.loading = false;
          }
        });
    }
  }

  onImportDialogShow() {
    // Load all platforms if not already loaded
    if (this.platforms.length === 0) {
      this.loadAllPlatformsForImport();
    }
  }

  loadAllPlatformsForImport() {
    const platformTypes = ['whatsapp', 'messenger', 'telegram', 'gmail', 'webchat', 'gmessages', 'smsrelay'];
    const requests = platformTypes.map(type => 
      this.platformService.list_platforms_by_type(type).pipe(
        catchError(() => of([]))
      )
    );

    forkJoin(requests).pipe(takeUntil(this.destroy$)).subscribe({
      next: (results) => {
        this.platforms = results.flat().map(platform => {
          if (platform.platform_name === 'whatsapp') {
            platform.image_type = 'svg';
          } else if (['webchat', 'messenger', 'gmail', 'gmessages', 'smsrelay'].includes(platform.platform_name)) {
            platform.image_type = 'png';
          }
          return platform;
        });
      },
      error: (err) => {
        console.error('Error loading platforms', err);
        this.platforms = [];
      }
    });
  }

  showAddContactDialog() {}

  showImportContactDialog() {
    this.selectedImportPlatformId = null;
    this.showImportDialog = true;
  }

  downloadTemplate() {
    if (!this.selectedImportPlatformId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Platform Required',
        detail: 'Please select a platform instance first',
        life: 3000
      });
      return;
    }

    this.contactService.download_contact_template(this.selectedImportPlatformId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          
          const platform = this.platforms.find(p => p.id === this.selectedImportPlatformId);
          const filename = platform 
            ? `contact_import_template_${platform.user_platform_name.replace(/\s+/g, '_')}.xlsx`
            : 'contact_import_template.xlsx';
          
          link.download = filename;
          link.click();
          window.URL.revokeObjectURL(url);
          
          this.messageService.add({
            severity: 'success',
            summary: 'Download Started',
            detail: 'Template file is being downloaded',
            life: 3000
          });
        },
        error: (err) => {
          console.error('Error downloading template', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Download Failed',
            detail: 'Could not download template file',
            sticky: true
          });
        }
      });
  }


}
