// src/app/features/ca-firm/customers/customers.component.ts
// Enhanced with Server-Side Pagination and Search

import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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

import { CAFirmService } from '../../../shared/services/ca-firm.service';
import { ContactManagerService } from '../../../shared/services/contact-manager.service';
import { PlatformManagerService } from '../../../shared/services/platform-manager.service';
import { FilterPipe } from '../../../shared/pipes/filter.pipe';
import { supported_platforms } from '../../../shared/constants';
import { LayoutService } from '../../../layout/service/app.layout.service';

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
    FilterPipe
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.scss']
})
export class CustomersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();
  private contactSearchSubject$ = new Subject<string>();
  
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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
}