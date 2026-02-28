// src/app/features/ca-firm/customers/customers.component.ts
// Enhanced with Server-Side Pagination and Search

import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil, forkJoin, of, catchError, debounceTime, distinctUntilChanged } from 'rxjs';

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
import { ConfirmationService, MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { ChipModule } from 'primeng/chip';
import { TextareaModule } from 'primeng/textarea';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MultiSelectModule } from 'primeng/multiselect';
import { TabViewModule } from 'primeng/tabview';
import { InputSwitchModule } from 'primeng/inputswitch';
import { FileUploadModule } from 'primeng/fileupload';
import { AccordionModule } from 'primeng/accordion';
import { ProgressBarModule } from 'primeng/progressbar';

import { CAFirmService } from '../../../shared/services/ca-firm.service';
import { ContactManagerService } from '../../../shared/services/contact-manager.service';
import { PlatformManagerService } from '../../../shared/services/platform-manager.service';
import { FilterPipe } from '../../../shared/pipes/filter.pipe';
import { supported_platforms } from '../../../shared/constants';
import { LayoutService } from '../../../layout/service/app.layout.service';
import { CalendarModule } from 'primeng/calendar';
import { PaginatorModule } from 'primeng/paginator';

interface Customer {
  id?: number;
  customer_name: string;
  file_no: string;
  address?: string;
  gstin?: string;
  pan?: string;
  assigned_employee?: number;
  assigned_employee_name?: string;
  notes?: string;
  is_active: boolean;
  contacts_count?: number;
  groups_count?: number;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface FinancialYear {
  label: string;
  value: string;
  start_date: Date;
  end_date: Date;
}

@Component({
  selector: 'app-customers',
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
    TooltipModule,
    ChipModule,
    TextareaModule,
    RadioButtonModule,
    MultiSelectModule,
    TabViewModule,
    InputSwitchModule,
    FilterPipe,
    FileUploadModule,
    ProgressBarModule,
    AccordionModule,
    CalendarModule,
    PaginatorModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.scss']
})
export class CustomersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();
  private contactSearchSubject$ = new Subject<string>();
  private fileSearchSubject$ = new Subject<string>();
  
  // Data
  customers: Customer[] = [];
  employees: any[] = [];
  allContacts: any[] = [];
  allGroups: any[] = [];
  customerContacts: any[] = [];
  customerGroups: any[] = [];
  selectedContactsForAdd: any[] = [];
  selectedGroupsForAdd: any[] = [];
  platforms: any[] = [];
  supported_platforms = supported_platforms;
  
  // Pagination for Customers
  totalCustomers = 0;
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [10, 25, 50, 100];
  
  // Pagination for Contacts
  totalContacts = 0;
  contactsPage = 1;
  contactsPageSize = 50;
  
  // ✅ NEW - Pagination for Files (Server-Side)
  totalFiles = 0;
  filesPage = 1;
  filesPageSize = 20;
  filesPageSizeOptions = [10, 20, 50, 100];
  
  // Statistics
  activeCustomersCount = 0;
  unmappedContactsCount = 0;
  
  // Dialog States
  displayDialog = false;
  displayDetailsDialog = false;
  displayContactsDialog = false;
  displayAddContactsDialog = false;
  displayCreateContactDialog = false;
  displayEditContactDialog = false;
  displayGroupsDialog = false;
  displayAddGroupsDialog = false;
  displayCreateGroupDialog = false;
  displayEditGroupDialog = false;
  isEditMode = false;
  loading = false;
  loadingContacts = false;
  loadingGroups = false;
  
  // Forms and Selection
  customerForm!: FormGroup;
  contactForm!: FormGroup;
  groupForm!: FormGroup;
  selectedCustomer: Customer | null = null;
  selectedContact: any = null;
  selectedGroup: any = null;
  
  // Filters
  searchText = '';
  searchContactText = '';
  searchGroupText = '';
  selectedEmployee: number | null = null;
  selectedStatus: string | null = null;
  showUnmappedOnly = false;

  // File Management States
  displayFilesDialog = false;
  loadingFiles = false;
  customerFiles: any[] = [];
  fileStats: any = null;
  selectedFile: any = null;
  viewMode: 'grid' | 'list' = 'grid';

  // ✅ NEW - File Filters with FY Support
  fileSearchText = '';
  selectedFileType: string | null = null;
  selectedDirection: string | null = null;
  selectedContactFilter: number | null = null;
  selectedFY: string | null = null; // Financial Year filter
  financialYears: FinancialYear[] = [];

  // ✅ NEW - Upload States with FY Support
  uploadContactId: number | null = null;
  uploadDescription = '';
  uploadFY: string | null = null; // Selected FY for upload
  uploadDate: Date | null = null; // Custom date within FY
  uploadFileType: 'internal' | 'sent' = 'internal'; // Upload type

  // Options
  fileTypeOptions = [
    { label: 'Images', value: 'image' },
    { label: 'Videos', value: 'video' },
    { label: 'Audio', value: 'audio' },
    { label: 'PDF', value: 'pdf' },
    { label: 'Documents', value: 'document' },
    { label: 'Spreadsheets', value: 'spreadsheet' },
    { label: 'Other', value: 'other' }
  ];
  
  directionOptions = [
    { label: 'Sent', value: 'sent' },
    { label: 'Received', value: 'received' },
    { label: 'Internal', value: 'internal' } // ✅ Added Internal
  ];
  
  statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' }
  ];

  categoryOptions = [
    { label: 'Individual', value: 'Individual' },
    { label: 'Micro Enterprise', value: 'Micro Enterprise' },
    { label: 'Small Enterprise', value: 'Small Enterprise' },
    { label: 'Medium Enterprise', value: 'Medium Enterprise' }
  ];

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
  contactFilterOptions: any[] = [];

  constructor(
    private fb: FormBuilder,
    private layoutService: LayoutService,
    private caFirmService: CAFirmService,
    private contactService: ContactManagerService,
    private platformService: PlatformManagerService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.initForms();
    this.generateFinancialYears();
  }

  ngOnInit(): void {
    this.layoutService.state.staticMenuDesktopInactive = true;
    this.loadCustomers();
    this.loadEmployees();
    this.loadAllContacts();
    this.loadAllGroups();
    this.loadAllPlatforms();
    this.loadStatistics();
    
    // Setup search debouncing for customers
    this.searchSubject$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadCustomers();
    });
    
    // Setup search debouncing for contacts
    this.contactSearchSubject$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.contactsPage = 1;
      this.loadAllContacts();
    });

    // ✅ NEW - Setup search debouncing for files
    this.fileSearchSubject$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.filesPage = 1;
      this.loadCustomerFiles();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ NEW - Generate Financial Years (Last 10 years + Current + Next 2 years)
  generateFinancialYears(): void {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-11

    // Indian FY starts April 1st
    const fyStartMonth = 3; // April (0-indexed)

    // Determine current FY
    let baseFY = currentMonth >= fyStartMonth ? currentYear : currentYear - 1;

    this.financialYears = [];

    // Generate from 10 years ago to 2 years ahead
    for (let offset = -10; offset <= 2; offset++) {
      const fyYear = baseFY + offset;
      const startDate = new Date(fyYear, fyStartMonth, 1); // April 1
      const endDate = new Date(fyYear + 1, fyStartMonth, 0); // March 31 next year

      this.financialYears.push({
        label: `FY ${fyYear}-${(fyYear + 1).toString().slice(2)}`,
        value: `${fyYear}-${fyYear + 1}`,
        start_date: startDate,
        end_date: endDate
      });
    }

    // Reverse so most recent is first
    this.financialYears.reverse();

    // Set current FY as default
    const currentFY = this.financialYears.find(fy => {
      return currentDate >= fy.start_date && currentDate <= fy.end_date;
    });

    if (currentFY) {
      this.uploadFY = currentFY.value;
    }
  }

  // ✅ NEW - Get Date Range for Selected FY
  getFYDateRange(fyValue: string): { start: Date; end: Date } | null {
    const fy = this.financialYears.find(f => f.value === fyValue);
    return fy ? { start: fy.start_date, end: fy.end_date } : null;
  }

  initForms(): void {
    // Customer Form
    this.customerForm = this.fb.group({
      customer_name: ['', Validators.required],
      file_no: ['', Validators.required],
      address: [''],
      gstin: ['', Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)],
      pan: ['', Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)],
      assigned_employee: [null],
      notes: [''],
      is_active: [true]
    });

    // Contact Form
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      phone: [''], // Will be dynamically validated
      platform_name: ['', Validators.required],
      platform_id: [null, Validators.required],
      category: ['Individual'],
      description: [''],
      address: [''],
      custom_fields: [{}]
    });

    // Group Form
    this.groupForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      category: ['Individual'],
      member_ids: [[]]
    });
  }

  // ========== Data Loading with Pagination ==========
  loadCustomers(page=undefined, pagesize=undefined, search=undefined): void {
    this.loading = true;
    
    // Build query params
    const params: any = {
      page: page || this.currentPage,
      page_size: pagesize || this.pageSize
    };
    
    if (search || this.searchText) {
      params.search = search || this.searchText;
    }
    
    if (this.selectedEmployee) {
      params.assigned_employee = this.selectedEmployee;
    }
    
    if (this.selectedStatus) {
      params.is_active = this.selectedStatus === 'active';
    }
    
    this.caFirmService.listCustomersPaginated(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedResponse<Customer>) => {
          this.customers = response.results;
          this.totalCustomers = response.count;
          this.loading = false;
        },
        error: (error) => {
          this.showError('Failed to load customers');
          this.loading = false;
          console.error('Error loading customers:', error);
        }
      });
  }

  loadStatistics(): void {
    // Load statistics separately if needed
    this.caFirmService.getCustomerStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.activeCustomersCount = stats.active_count || 0;
          this.unmappedContactsCount = stats.unmapped_count || 0;
        },
        error: (error) => {
          console.error('Error loading statistics:', error);
        }
      });
  }

  loadEmployees(): void {
    this.caFirmService.listEmployees()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          // Normalize response
        let data: any[];
        // Always expect DRF pagination
        if (!result || !Array.isArray(result.results)) {
          console.error("Unexpected response format:", data);
          return;
        }
          data = result.results;
          this.employees = data.filter((emp: any) => emp.is_active);
        },
        error: (error) => {
          console.error('Error loading employees:', error);
        }
      });
  }

  onCustomerSearchInput(event: Event, dt: Table): void {
        const inputElement = event.target as HTMLInputElement;
        const searchValue = inputElement.value;
        this.loadCustomers(1, 10, searchValue);
        //dt.filterGlobal(searchValue, 'contains');
      }

  onSearchInput(event: Event, dt: Table): void {
        const inputElement = event.target as HTMLInputElement;
        const searchValue = inputElement.value;
        this.loadAllContacts(1, 10, searchValue);
        //dt.filterGlobal(searchValue, 'contains');
      }

  loadAllContacts(page=undefined, pagesize=undefined, search=undefined): void {
    const params: any = {
      page: page || this.contactsPage,
      page_size: pagesize || this.contactsPageSize
    };
    
    if (search || this.searchContactText) {
      params.search = search || this.searchContactText;
    }
    
    this.contactService.list_contact(params.page, params.page_size, params.search)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedResponse<any>) => {
          this.allContacts = response.results;
          this.totalContacts = response.count;
        },
        error: (error) => {
          console.error('Error loading contacts:', error);
        }
      });
  }

  loadAllGroups(): void {
    this.contactService.list_groups(1, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.allGroups = response.results || response;
        },
        error: (error) => {
          console.error('Error loading groups:', error);
        }
      });
  }

  loadAllPlatforms(): void {
    const platformTypes = ['whatsapp', 'messenger', 'telegram', 'gmail', 'webchat', 'gmessages'];
    const requests = platformTypes.map(type => 
      this.platformService.list_platforms_by_type(type).pipe(
        catchError(() => of([]))
      )
    );

    forkJoin(requests).pipe(takeUntil(this.destroy$)).subscribe({
      next: (results) => {
        this.platforms = results.flat();
      },
      error: (err) => {
        console.error('Error loading platforms', err);
      }
    });
  }

  loadCustomerContacts(customerId: number): void {
    this.loadingContacts = true;
    
    this.caFirmService.getCustomerContacts(customerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {          
          if (Array.isArray(data)) {
            this.customerContacts = data;
          } else if (data.contacts && Array.isArray(data.contacts)) {
            this.customerContacts = data.contacts;
          } else if (data.results && Array.isArray(data.results)) {
            this.customerContacts = data.results;
          } else {
            this.customerContacts = [];
          }
          this.loadingContacts = false;
        },
        error: (error) => {
          this.showError('Failed to load customer contacts');
          this.loadingContacts = false;
          console.error('Error loading customer contacts:', error);
          this.customerContacts = [];
        }
      });
  }

  loadCustomerGroups(customerId: number): void {
    this.loadingGroups = true;
    this.caFirmService.getCustomerGroups(customerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.customerGroups = Array.isArray(data) ? data : (data.groups || []);
          this.loadingGroups = false;
        },
        error: (error) => {
          this.showError('Failed to load customer groups');
          this.loadingGroups = false;
          console.error('Error loading customer groups:', error);
          this.customerGroups = [];
        }
      });
  }

  // ========== Search & Filter Handlers ==========
  onSearchChange(searchTerm: string): void {
    this.searchText = searchTerm;
    this.searchSubject$.next(searchTerm);
  }

  onContactSearchChange(searchTerm: string): void {
    this.searchContactText = searchTerm;
    this.contactSearchSubject$.next(searchTerm);
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadCustomers();
  }

  toggleUnmappedFilter(): void {
    this.showUnmappedOnly = !this.showUnmappedOnly;
    this.currentPage = 1;
    this.loadCustomers();
  }

  // ========== Pagination Handlers ==========
  onPageChange(event: any): void {
    this.currentPage = event.page + 1;
    this.pageSize = event.rows;
    this.loadCustomers();
  }

  // ========== Customer CRUD ==========
  openNew(): void {
    this.isEditMode = false;
    this.customerForm.reset({ is_active: true });
    this.displayDialog = true;
  }

  editCustomer(customer: Customer): void {
    this.isEditMode = true;
    this.selectedCustomer = customer;
    this.customerForm.patchValue(customer);
    this.displayDialog = true;
  }

  saveCustomer(): void {
    if (this.customerForm.invalid) {
      this.markFormGroupTouched(this.customerForm);
      this.showError('Please fill all required fields correctly');
      return;
    }

    this.loading = true;
    const customerData = this.customerForm.value;

    const request = this.isEditMode && this.selectedCustomer
      ? this.caFirmService.updateCustomer(this.selectedCustomer.id!, customerData)
      : this.caFirmService.createCustomer(customerData);

    request.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(this.isEditMode ? 'Customer updated successfully' : 'Customer created successfully');
          this.loadCustomers();
          this.loadStatistics();
          this.hideDialog();
          this.loading = false;
        },
        error: (error) => {
          this.showError(this.isEditMode ? 'Failed to update customer' : 'Failed to create customer');
          console.error('Error saving customer:', error);
          this.loading = false;
        }
      });
  }

  deleteCustomer(customer: Customer): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${customer.customer_name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.caFirmService.deleteCustomer(customer.id!)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.showSuccess('Customer deleted successfully');
              this.loadCustomers();
              this.loadStatistics();
            },
            error: (error) => {
              this.showError('Failed to delete customer');
              console.error('Error deleting customer:', error);
            }
          });
      }
    });
  }

  toggleStatus(customer: Customer): void {
    const updatedCustomer = { ...customer, is_active: !customer.is_active };
    
    this.caFirmService.updateCustomer(customer.id!, updatedCustomer)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(`Customer ${updatedCustomer.is_active ? 'activated' : 'deactivated'} successfully`);
          this.loadCustomers();
          this.loadStatistics();
        },
        error: (error) => {
          this.showError('Failed to update customer status');
          console.error('Error updating status:', error);
        }
      });
  }

  viewDetails(customer: Customer): void {
    this.selectedCustomer = customer;
    this.displayDetailsDialog = true;
  }

  // ========== Contact Management ==========
  manageContacts(customer: Customer): void {
    this.selectedCustomer = customer;
    this.loadCustomerContacts(customer.id!);
    this.displayContactsDialog = true;
  }

  openAddContactsDialog(): void {
    this.selectedContactsForAdd = [];
    this.searchContactText = '';
    this.displayAddContactsDialog = true;
  }

  openCreateContactDialog(): void {
    this.contactForm.reset({ 
    category: 'Individual', 
    custom_fields: {} 
  });
  
  // Reset WhatsApp-specific fields
  this.selectedCountryCode = null;
  this.phoneNumberWithoutCode = '';
  this.isWhatsAppContact = false;
  
  this.displayCreateContactDialog = true;
  }

  parsePhoneNumber(phone: string): { countryCode: any, number: string } {
  // Remove any non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Try to match against supported country codes
  for (const country of this.supportedCountryCodes) {
    if (digitsOnly.startsWith(country.code)) {
      const number = digitsOnly.substring(country.code.length);
      if (number.length >= country.minLength && number.length <= country.maxLength) {
        return { countryCode: country, number };
      }
    }
  }
  
  // If no match found, assume it's a local number
  return { countryCode: null, number: digitsOnly };
}

  openEditContactDialog(contact: any): void {
    this.selectedContact = contact;
  
  // Check if this is a WhatsApp contact
  this.isWhatsAppContact = contact.platform_name === 'whatsapp';
  
  if (this.isWhatsAppContact && contact.phone) {
    // Try to parse country code from phone number
    const parsed = this.parsePhoneNumber(contact.phone);
    this.selectedCountryCode = parsed.countryCode;
    this.phoneNumberWithoutCode = parsed.number;
  } else {
    this.selectedCountryCode = null;
    this.phoneNumberWithoutCode = '';
  }
  
  this.contactForm.patchValue(contact);
  this.updatePhoneValidation();
  this.displayEditContactDialog = true;
  }

  saveContact(): void {
    if (this.contactForm.invalid) {
      this.markFormGroupTouched(this.contactForm);
      this.showError('Please fill all required fields');
      return;
    }

    const contactData = {
      ...this.contactForm.value,
      customer_id: this.selectedCustomer?.id
    };

    // For WhatsApp contacts, construct the phone number with country code
  if (this.isWhatsAppContact && this.selectedCountryCode && this.phoneNumberWithoutCode) {
    contactData.phone = `${this.selectedCountryCode.code}${this.phoneNumberWithoutCode}`;
  }

    this.contactService.create_contact(contactData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Contact created successfully');
          this.loadAllContacts();
          this.loadCustomerContacts(this.selectedCustomer!.id!);
          this.loadCustomers();
          this.loadStatistics();
          this.displayCreateContactDialog = false;

          // Reset WhatsApp fields
        this.selectedCountryCode = null;
        this.phoneNumberWithoutCode = '';
        this.isWhatsAppContact = false;
        },
        error: (error) => {
          this.showError('Failed to create contact');
          console.error('Error creating contact:', error);
        }
      });
  }

  updateContact(): void {
    if (this.contactForm.invalid) {
      this.markFormGroupTouched(this.contactForm);
      this.showError('Please fill all required fields');
      return;
    }

    const contactData = {
      id: this.selectedContact.id,
      ...this.contactForm.value
    };

    // For WhatsApp contacts, construct the phone number with country code
  if (this.isWhatsAppContact && this.selectedCountryCode && this.phoneNumberWithoutCode) {
    contactData.phone = `${this.selectedCountryCode.code}${this.phoneNumberWithoutCode}`;
  }

    this.contactService.update_contact(contactData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Contact updated successfully');
          this.loadAllContacts();
          this.loadCustomerContacts(this.selectedCustomer!.id!);
          this.displayEditContactDialog = false;

          // Reset WhatsApp fields
        this.selectedCountryCode = null;
        this.phoneNumberWithoutCode = '';
        this.isWhatsAppContact = false;
        },
        error: (error) => {
          this.showError('Failed to update contact');
          console.error('Error updating contact:', error);
        }
      });
  }

  addContactsToCustomer(): void {
    if (!this.selectedCustomer || this.selectedContactsForAdd.length === 0) {
      this.showError('Please select contacts to add');
      return;
    }

    const contact_ids = this.selectedContactsForAdd.map(c => c.id);
    const payload = {
      contact_ids: contact_ids,
      action: 'add',
      roles: {}
    };

    this.caFirmService.addContactsToCustomer(this.selectedCustomer.id!, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.showSuccess(`Successfully added ${contact_ids.length} contact(s)`);
          
          this.loadCustomerContacts(this.selectedCustomer!.id!);
          this.loadCustomers();
          this.loadStatistics();
          
          this.displayAddContactsDialog = false;
          this.selectedContactsForAdd = [];
          this.searchContactText = '';
        },
        error: (error) => {
          console.error('Error adding contacts:', error);
          this.showError('Failed to add contacts');
        }
      });
  }

  removeContactFromCustomer(contact: any): void {
    this.confirmationService.confirm({
      message: `Remove "${contact.name}" from this customer?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        if (!this.selectedCustomer?.id) {
          this.showError('No customer selected');
          return;
        }

        const payload = {
          contact_ids: [contact.id],
          action: 'remove'
        };
        
        this.caFirmService.addContactsToCustomer(this.selectedCustomer.id, payload)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.showSuccess('Contact removed successfully');
              this.loadCustomerContacts(this.selectedCustomer!.id!);
              this.loadCustomers();
              this.loadStatistics();
            },
            error: (error) => {
              console.error('Error removing contact:', error);
              this.showError('Failed to remove contact');
            }
          });
      }
    });
  }

  deleteContact(contact: any): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${contact.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.contactService.delete_contact(contact.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.showSuccess('Contact deleted successfully');
              this.loadAllContacts();
              this.loadCustomerContacts(this.selectedCustomer!.id!);
              this.loadCustomers();
              this.loadStatistics();
            },
            error: (error) => {
              this.showError('Failed to delete contact');
              console.error('Error deleting contact:', error);
            }
          });
      }
    });
  }

  getAvailableContacts(): any[] {
    if (!this.selectedCustomer) return [];
    
    const customerContactIds = this.customerContacts.map(c => c.id);
    return this.allContacts.filter(c => !customerContactIds.includes(c.id));
  }

  // ========== Group Management ==========
  manageGroups(customer: Customer): void {
    this.selectedCustomer = customer;
    this.loadCustomerGroups(customer.id!);
    this.displayGroupsDialog = true;
  }

  openAddGroupsDialog(): void {
    this.selectedGroupsForAdd = [];
    this.searchGroupText = '';
    this.displayAddGroupsDialog = true;
  }

  openCreateGroupDialog(): void {
    this.groupForm.reset({ category: 'Individual', member_ids: [] });
    this.displayCreateGroupDialog = true;
  }

  openEditGroupDialog(group: any): void {
    this.selectedGroup = group;
    const memberIds = group.members?.map((m: any) => m.contact.id) || [];
    this.groupForm.patchValue({
      name: group.name,
      description: group.description,
      category: group.category,
      member_ids: memberIds
    });
    this.displayEditGroupDialog = true;
  }

  saveGroup(): void {
    if (this.groupForm.invalid) {
      this.markFormGroupTouched(this.groupForm);
      this.showError('Please fill all required fields');
      return;
    }

    const groupData = this.groupForm.value;

    this.contactService.create_group(groupData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Group created successfully');
          this.loadAllGroups();
          this.displayCreateGroupDialog = false;
        },
        error: (error) => {
          this.showError('Failed to create group');
          console.error('Error creating group:', error);
        }
      });
  }

  updateGroup(): void {
    if (this.groupForm.invalid) {
      this.markFormGroupTouched(this.groupForm);
      this.showError('Please fill all required fields');
      return;
    }

    const groupData = {
      id: this.selectedGroup.id,
      ...this.groupForm.value
    };

    this.contactService.update_group(groupData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Group updated successfully');
          this.loadAllGroups();
          this.displayEditGroupDialog = false;
        },
        error: (error) => {
          this.showError('Failed to update group');
          console.error('Error updating group:', error);
        }
      });
  }

  deleteGroup(group: any): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${group.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.contactService.delete_group(group.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.showSuccess('Group deleted successfully');
              this.loadAllGroups();
            },
            error: (error) => {
              this.showError('Failed to delete group');
              console.error('Error deleting group:', error);
            }
          });
      }
    });
  }

  getAvailableGroups(): any[] {
    let available = this.allGroups;
    
    if (this.searchGroupText) {
      const search = this.searchGroupText.toLowerCase();
      available = available.filter(g =>
        g.name?.toLowerCase().includes(search)
      );
    }
    
    return available;
  }

  // ========== Utility Functions ==========
  getUnmappedContactsCount(): number {
    return this.unmappedContactsCount;
  }

  getRoleSeverity(role: string): any {
    const severityMap: { [key: string]: string } = {
      'primary': 'success',
      'billing': 'info',
      'technical': 'warn',
      'management': 'primary',
      'employee': 'secondary',
      'other': 'secondary'
    };
    return severityMap[role] || 'secondary';
  }

  getCategorySeverity(category: string): any {
    const severityMap: { [key: string]: string } = {
      'Individual': 'info',
      'Micro Enterprise': 'success',
      'Small Enterprise': 'warn',
      'Medium Enterprise': 'danger'
    };
    return severityMap[category] || 'secondary';
  }

  getStatusSeverity(isActive: boolean): any {
    return isActive ? 'success' : 'danger';
  }

  hideDialog(): void {
    this.displayDialog = false;
    this.displayDetailsDialog = false;
    this.displayContactsDialog = false;
    this.displayAddContactsDialog = false;
    this.displayCreateContactDialog = false;
    this.displayEditContactDialog = false;
    this.displayGroupsDialog = false;
    this.displayAddGroupsDialog = false;
    this.displayCreateGroupDialog = false;
    this.displayEditGroupDialog = false;
    this.selectedCustomer = null;
    this.selectedContact = null;
    this.selectedGroup = null;
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  showSuccess(message: string): void {
    this.messageService.add({ 
      severity: 'success', 
      summary: 'Success', 
      detail: message,
      life: 3000
    });
  }

  showError(message: string): void {
    this.messageService.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: message,
      life: 4000
    });
  }

  exportToExcel(): void {
    this.showSuccess('Excel export functionality will be implemented');
  }



  onPlatformNameChange(platformName: string): void {
  this.contactForm.patchValue({ platform_id: null });
  
  // Reset country code fields when platform changes
  this.selectedCountryCode = null;
  this.phoneNumberWithoutCode = '';
  this.isWhatsAppContact = platformName === 'whatsapp';
  
  // Update phone validation based on platform
  this.updatePhoneValidation();
  
  if (platformName) {
    this.platformService.list_platforms_by_type(platformName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.platforms = data;
        },
        error: (err) => {
          console.error('Error loading platforms:', err);
        }
      });
  }
}

updatePhoneValidation(): void {
  const phoneControl = this.contactForm.get('phone');
  
  if (this.isWhatsAppContact) {
    // For WhatsApp, phone will be constructed from country code + number
    // So we don't need direct validation on the phone field
    phoneControl?.clearValidators();
    phoneControl?.updateValueAndValidity();
  } else {
    // For other platforms, use standard 10-digit validation
    phoneControl?.setValidators([
      Validators.required,
      Validators.pattern(/^[0-9]{10}$/)
    ]);
    phoneControl?.updateValueAndValidity();
  }
}

onCountryCodeChange(): void {
  // Update phone number validation when country code changes
  this.validatePhoneNumber();
}

onPhoneNumberInput(): void {
  // Validate as user types
  this.validatePhoneNumber();
}

validatePhoneNumber(): boolean {
  if (!this.isWhatsAppContact) {
    return true; // Non-WhatsApp contacts use standard validation
  }

  if (!this.selectedCountryCode) {
    return false;
  }

  const phoneLength = this.phoneNumberWithoutCode?.length || 0;
  const { minLength, maxLength } = this.selectedCountryCode;
  
  return phoneLength >= minLength && phoneLength <= maxLength;
}

getPhoneValidationMessage(): string {
  if (!this.selectedCountryCode) {
    return 'Please select a country code';
  }

  const { minLength, maxLength, name } = this.selectedCountryCode;
  const phoneLength = this.phoneNumberWithoutCode?.length || 0;

  if (phoneLength === 0) {
    return `Enter ${minLength} digit phone number for ${name}`;
  }

  if (phoneLength < minLength) {
    return `Phone number must be ${minLength} digits for ${name}`;
  }

  if (phoneLength > maxLength) {
    return `Phone number cannot exceed ${maxLength} digits for ${name}`;
  }

  return '';
}

isContactFormValid(): boolean {
  const basicFormValid = this.contactForm.valid;
  
  if (!this.isWhatsAppContact) {
    return basicFormValid;
  }

  // For WhatsApp, additionally check country code and phone number
  return basicFormValid && 
         this.selectedCountryCode !== null && 
         this.validatePhoneNumber();
}

// ========== File Management Methods ==========

/**
 * Open files dialog for a customer
 */
manageFiles(customer: Customer): void {
  this.selectedCustomer = customer;
  
  // ✅ Reset pagination when opening dialog
  this.filesPage = 1;
  this.filesPageSize = 20;
  this.totalFiles = 0;
  this.lastLoadedPage = 0;
  this.lastLoadedPageSize = 0;
  
  this.loadCustomerContacts(customer.id!);
  this.loadCustomerFiles();
  this.loadFileStatistics();
  this.loadContactFilterOptions();
  this.displayFilesDialog = true;
}

/**
 * ✅ FIXED: Load all files for the selected customer with proper pagination
 */
loadCustomerFiles(): void {
  if (!this.selectedCustomer?.id) return;

  this.loadingFiles = true;
  
  const params: any = {
    page: this.filesPage,
    page_size: this.filesPageSize
  };

  // Add FY parameter
  if (this.selectedFY) {
    params.fy = this.selectedFY;
  }

  if (this.fileSearchText) {
    params.search = this.fileSearchText;
  }

  if (this.selectedFileType) {
    params.file_type = this.selectedFileType;
  }

  if (this.selectedDirection) {
    params.direction = this.selectedDirection;
  }

  if (this.selectedContactFilter) {
    params.contact_id = this.selectedContactFilter;
  }

  this.caFirmService.listCustomerFiles(this.selectedCustomer.id, params)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        // ✅ Handle paginated response properly
        if (response.results) {
          this.customerFiles = response.results;
          this.totalFiles = response.count || 0;
          this.loadingFiles = false;
        }
      },
      error: (error) => {
        this.showError('Failed to load files');
        console.error('Error loading customer files:', error);
        this.loadingFiles = false;
        this.customerFiles = [];
        this.totalFiles = 0;
      }
    });
}

/**
 * Load file statistics for the customer
 */
loadFileStatistics(): void {
  if (!this.selectedCustomer?.id) return;

  this.caFirmService.getCustomerFileStats(this.selectedCustomer.id)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (stats) => {
        this.fileStats = stats;
      },
      error: (error) => {
        console.error('Error loading file statistics:', error);
      }
    });
}

/**
 * Load contact filter options
 */
loadContactFilterOptions(): void {
  if (!this.selectedCustomer?.id) return;

  this.caFirmService.getCustomerContacts(this.selectedCustomer.id)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        const contacts = Array.isArray(data) ? data : (data.contacts || data.results || []);
        this.contactFilterOptions = contacts.map((c: any) => ({
          label: `${c.name} (${c.phone})`,
          value: c.id
        }));
      },
      error: (error) => {
        console.error('Error loading contact filters:', error);
      }
    });
}

/**
 * Handle file search
 */
onFileSearch(): void {
  this.filesPage = 1; // Reset to first page when filters change
  this.loadCustomerFiles();
}

private searchTimeout: any;

/**
 * Handle filter changes
 */
onFileFilterChange(event: any): void {
  this.filesPage = 1;
  this.loadCustomerFiles();
}

onGridPageChange(event: any): void {
  this.filesPage = event.page + 1;
  this.filesPageSize = event.rows;
  this.loadCustomerFiles();
}

private lastLoadedPage: number = 0;
private lastLoadedPageSize: number = 0;

onTableLazyLoad(event: any): void {  
  if (this.loadingFiles) return;
  
  const newPage = event.first / event.rows + 1;
  const newPageSize = event.rows;
  
  // ✅ Only load if pagination actually changed
  if (newPage === this.lastLoadedPage && newPageSize === this.lastLoadedPageSize) {
    return;
  }
  
  this.lastLoadedPage = newPage;
  this.lastLoadedPageSize = newPageSize;
  this.filesPage = newPage;
  this.filesPageSize = newPageSize;
  
  this.loadCustomerFiles();
}


/**
 * Filter files by contact
 */
filterByContact(contactId: number): void {
  this.selectedContactFilter = contactId;
  this.filesPage = 1; // Reset to first page
  this.loadCustomerFiles();
}

/**
 * Select a file
 */
selectFile(file: any): void {
  this.selectedFile = file;
}

/**
 * Download a file
 */
downloadFile(file: any): void {
  if (file.signed_url) {
    window.open(file.signed_url, '_blank');
  } else {
    this.showError('File URL not available');
  }
}

/**
 * Delete a file
 */
deleteFile(file: any): void {
  if (!file.can_delete) {
    this.showError('You do not have permission to delete this file');
    return;
  }

  this.confirmationService.confirm({
    message: `Are you sure you want to delete "${file.name}"?`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      this.caFirmService.deleteCustomerFile(this.selectedCustomer!.id!, file.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.showSuccess('File deleted successfully');
            this.loadCustomerFiles();
            this.loadFileStatistics();
          },
          error: (error) => {
            this.showError('Failed to delete file');
            console.error('Error deleting file:', error);
          }
        });
    }
  });
}

/**
 * Open upload dialog
 */
openUploadDialog(): void {
  this.uploadContactId = null;
  this.uploadDescription = '';
  this.uploadDate = null;
  
  // Set default FY to current FY if available
  const currentFY = this.financialYears.find(fy => {
    const now = new Date();
    return now >= fy.start_date && now <= fy.end_date;
  });
  
  if (currentFY) {
    this.uploadFY = currentFY.value;
    this.uploadDate = new Date(); // Set to today
  }
}

/**
 * Open upload dialog for specific contact
 */
openUploadDialogForContact(contactId: number): void {
  this.uploadContactId = contactId;
  this.uploadDescription = '';
  this.uploadDate = null;
  
  // Set default FY
  const currentFY = this.financialYears.find(fy => {
    const now = new Date();
    return now >= fy.start_date && now <= fy.end_date;
  });
  
  if (currentFY) {
    this.uploadFY = currentFY.value;
    this.uploadDate = new Date();
  }
}

/**
 * ✅ FIXED: Handle file upload with proper date formatting
 */
onFileUpload(event: any): void {
  if (!this.selectedCustomer?.id) return;

  const file = event.files[0];
  if (!file) return;

  // ✅ Validate required fields
  if (!this.uploadFY) {
    this.showError('Please select a Financial Year');
    return;
  }

  if (!this.uploadContactId) {
    this.showError('Please select a contact');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('fy', this.uploadFY);
  formData.append('contact_id', this.uploadContactId.toString());

  // ✅ FIXED: Format date properly for backend
  if (this.uploadDate) {
    const year = this.uploadDate.getFullYear();
    const month = String(this.uploadDate.getMonth() + 1).padStart(2, '0');
    const day = String(this.uploadDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    formData.append('upload_date', formattedDate);
  }

  if (this.uploadDescription) {
    formData.append('description', this.uploadDescription);
  }

  this.caFirmService.uploadCustomerFile(this.selectedCustomer.id, formData)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.showSuccess('File uploaded successfully to internal storage');
        
        // Reload files and stats
        this.loadCustomerFiles();
        this.loadFileStatistics();
        
        // Reset upload form
        this.uploadContactId = null;
        this.uploadDescription = '';
        this.uploadDate = null;
        
        // Reset FY to current
        const currentFY = this.financialYears.find(fy => {
          const now = new Date();
          return now >= fy.start_date && now <= fy.end_date;
        });
        if (currentFY) {
          this.uploadFY = currentFY.value;
        }
        
        // Clear the file uploader
        if (event.files) {
          event.files = [];
        }
      },
      error: (error) => {
        this.showError('Failed to upload file');
        console.error('Error uploading file:', error);
        
        // Show detailed error if available
        if (error.error?.error) {
          this.showError(error.error.error);
        }
      }
    });
}

/**
 * Get file icon based on type
 */
getFileIcon(fileType: string): string {
  const iconMap: { [key: string]: string } = {
    'pdf': 'pi pi-file-pdf',
    'image': 'pi pi-image',
    'video': 'pi pi-video',
    'audio': 'pi pi-volume-up',
    'document': 'pi pi-file-word',
    'spreadsheet': 'pi pi-file-excel',
    'other': 'pi pi-file'
  };

  return iconMap[fileType] || 'pi pi-file';
}

/**
 * Get file type icon for filters
 */
getFileTypeIcon(fileType: string): string {
  return this.getFileIcon(fileType);
}

/**
 * Get contact header for accordion
 */
getContactHeader(contactGroup: any): string {
  return `${contactGroup.contact_name} - ${contactGroup.file_count} files`;
}

/**
 * Get file types as array for statistics
 */
getFileTypesArray(): any[] {
  if (!this.fileStats?.file_types) return [];

  return Object.entries(this.fileStats.file_types).map(([name, count]) => ({
    name,
    count
  }));
}

/**
 * Reset file filters
 */
resetFileFilters(): void {
  this.fileSearchText = '';
  this.selectedFileType = null;
  this.selectedDirection = null;
  this.selectedContactFilter = null;
  this.selectedFY = null;
  this.filesPage = 1;
  this.loadCustomerFiles();
}

/**
 * Close files dialog
 */
closeFilesDialog(): void {
  this.displayFilesDialog = false;
  this.selectedCustomer = null;
  this.customerFiles = [];
  this.fileStats = null;
  this.selectedFile = null;
  this.totalFiles = 0;
  this.filesPage = 1;
  this.filesPageSize = 20;
  this.resetFileFilters();
}

/**
 * Get contact name by ID
 */
getContactName(contactId: number): string {
  const contact = this.customerContacts.find(c => c.id === contactId);
  return contact ? contact.name : 'Unknown';
}

/**
 * Get contact phone by ID (formatted for path)
 */
getContactPhone(contactId: number): string {
  const contact = this.customerContacts.find(c => c.id === contactId);
  return contact ? contact.phone.replace(' ', '_') : '';
}

/**
 * Get FY label by value
 */
getFYLabel(fyValue: string): string {
  const fy = this.financialYears.find(f => f.value === fyValue);
  return fy ? fy.label : fyValue;
}

/**
 * Validate upload form before allowing file selection
 */
canUploadFile(): boolean {
  return !!(this.uploadFY && this.uploadDate && this.uploadContactId);
}

/**
 * Get upload path preview
 */
getUploadPathPreview(): string {
  if (!this.selectedCustomer || !this.uploadContactId || !this.uploadFY) {
    return '';
  }
  
  const contactPhone = this.getContactPhone(this.uploadContactId);
  return `.../internal/${contactPhone}/${this.uploadFY}/[filename]`;
}
}