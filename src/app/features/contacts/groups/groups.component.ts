import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
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
import { Router } from '@angular/router';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { GroupModel } from './groups.model';
import { MultiSelectModule } from 'primeng/multiselect';
import { ContactManagerService } from '../../../shared/services/contact-manager.service';
import { LayoutService } from '../../../layout/service/app.layout.service';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

interface PaginationState {
  page: number;
  pageSize: number;
  totalRecords: number;
  search?: string;
  sortField?: string;
  sortOrder?: number;
}

@Component({
  selector: 'app-groups',
  standalone: true,
  templateUrl: './groups.component.html',
  styleUrl: './groups.component.scss',
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
    MultiSelectModule,
    InputGroupModule,
    InputGroupAddonModule
  ],
  providers: [MessageService, ConfirmationService],
})
export class GroupsComponent implements OnInit, OnDestroy {

  @Output() totalGroups: EventEmitter<number> = new EventEmitter();

  profile!: any;
  loading = true;
  dialogProgress = false;
  productDialog: boolean = false;
  
  // Group data
  products!: GroupModel[];
  product!: any;
  selectedProducts!: any[] | null;
  submitted: boolean = false;
  
  // Group pagination state
  groupPagination: PaginationState = {
    page: 1,
    pageSize: 10,
    totalRecords: 0
  };

  // Contact data for member selection
  availableContacts: any[] = [];
  contactsLoading = false;
  
  // Contact pagination state (for add members modal)
  contactPagination: PaginationState = {
    page: 1,
    pageSize: 50, // Larger size for multi-select
    totalRecords: 0
  };

  // Member management
  add_members_modal_visible = false;
  selected_contacts_for_creating_group: any[] = [];
  members_not_part_of_this_group: any[] = [];

  private destroy$ = new Subject<void>();
  private contactSearchSubject$ = new Subject<string>();

  constructor(
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private layoutService: LayoutService,
    private contactService: ContactManagerService
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
    }
    this.layoutService.state.staticMenuDesktopInactive = true;
    this.loadContactGroups();
    this.loading = false;
    
    // Setup contact search with debouncing
    this.contactSearchSubject$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.loadAvailableContacts(searchTerm);
      });
  }

  // ========== GROUP OPERATIONS ==========

  loadContactGroups(
    page?: number, 
    pageSize?: number, 
    search?: string, 
    sortField?: string, 
    sortOrder?: number
  ) {
    this.loading = true;
    
    // Use provided params or fall back to current state
    const currentPage = page ?? this.groupPagination.page;
    const currentPageSize = pageSize ?? this.groupPagination.pageSize;
    const currentSearch = search ?? this.groupPagination.search;
    
    // Handle sort field mapping
    const mappedSortField = sortField === 'user_platform_name' ? 'platform_name' : sortField;
    const ordering = sortOrder === -1 ? `-${mappedSortField}` : mappedSortField;
    
    this.contactService.list_groups(currentPage, currentPageSize, currentSearch, ordering)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result: any) => {
          if (!result || !Array.isArray(result.results)) {
            console.error("Unexpected response format:", result);
            this.products = [];
            this.groupPagination.totalRecords = 0;
            this.loading = false;
            return;
          }
          
          this.products = result.results;
          this.groupPagination = {
            page: currentPage,
            pageSize: currentPageSize,
            totalRecords: result.count ?? result.results.length,
            search: currentSearch,
            sortField: mappedSortField,
            sortOrder
          };
          
          this.loading = false;
          this.totalGroups.emit(this.groupPagination.totalRecords);
        },
        (err) => {
          this.loading = false;
          console.error("Groups | Error loading groups:", err);
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: 'Failed to load groups', 
            sticky: true 
          });
        }
      );
  }

  onGroupPageChange(event: any) {
    const page = event.first / event.rows + 1;
    const pageSize = event.rows;
    const sortField = event.sortField;
    const sortOrder = event.sortOrder;
    
    this.loadContactGroups(page, pageSize, this.groupPagination.search, sortField, sortOrder);
  }

  onSearchInput(event: Event, dt: Table): void {
    const inputElement = event.target as HTMLInputElement;
    const searchValue = inputElement.value;
    
    // Reset to first page on new search
    this.loadContactGroups(1, this.groupPagination.pageSize, searchValue);
  }

  validateGroupName() {
    const groupNames = this.products.map(prod => prod.name.toLowerCase());
    
    if (groupNames.includes(this.product.name?.toLowerCase())) {
      this.product.name = '';
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Duplicate Name', 
        detail: 'Group name already exists. Please choose a different name', 
        life: 5000 
      });
    }
  }

  openNew() {
    this.product = { members: [] };
    this.submitted = false;
    this.selected_contacts_for_creating_group = [];
    this.productDialog = true;
    
    // Load contacts for adding members
    this.loadAvailableContacts();
  }

  editProduct(product: any) {
    this.product = { ...product, members: [...(product.members || [])] };
    this.submitted = false;
    this.selected_contacts_for_creating_group = [];
    this.productDialog = true;
    
    // Load contacts excluding current members
    this.loadAvailableContacts();
  }

  deleteProduct(product: any) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${product.name}"?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading = true;
        this.contactService.delete_group(product.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            () => {
              this.messageService.add({ 
                severity: 'success', 
                summary: 'Deleted', 
                detail: 'Group deleted successfully', 
                life: 3000 
              });
              this.loadContactGroups();
            },
            (err) => {
              console.error('Groups | Error deleting group:', err);
              this.loading = false;
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete group',
                sticky: true,
              });
            }
          );
      }
    });
  }

  deleteSelectedProducts() {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete the selected groups?',
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading = true;
        const groupIds = this.selectedProducts.map(group => group.id);
        
        this.contactService.delete_groups(groupIds)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            () => {
              this.selectedProducts = null;
              this.messageService.add({ 
                severity: 'success', 
                summary: 'Deleted', 
                detail: 'Groups deleted successfully', 
                life: 3000 
              });
              this.loadContactGroups();
            },
            (err) => {
              console.error("Groups | Error deleting groups:", err);
              this.selectedProducts = null;
              this.loading = false;
              this.messageService.add({ 
                severity: 'error', 
                summary: 'Error', 
                detail: 'Failed to delete groups', 
                sticky: true 
              });
            }
          );
      }
    });
  }

  saveProduct() {
    this.submitted = true;
    
    if (!this.product.name?.trim()) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Validation Error', 
        detail: 'Group name is required', 
        life: 3000 
      });
      return;
    }
    
    this.dialogProgress = true;
    
    if (this.product.id) {
      this.updateGroup();
    } else {
      this.createGroup();
    }
  }

  private createGroup() {
    const memberIds = this.product.members?.map(m => m.contact.id) || [];
    
    const newGroupPayload: GroupModel = {
      id: -1,
      name: this.product.name.trim(),
      member_ids: memberIds,
      description: this.product.description?.trim() || '',
      category: this.product.category || '',
      member_count: memberIds.length,
      members: []
    };
    
    this.contactService.create_group(newGroupPayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data: any) => {
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Created', 
            detail: 'Group created successfully', 
            life: 3000 
          });
          this.closeDialog();
          this.loadContactGroups();
        },
        (err) => {
          console.error("Groups | Error creating group:", err);
          this.dialogProgress = false;
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: 'Failed to create group', 
            sticky: true 
          });
        }
      );
  }

  private updateGroup() {
    const memberIds = this.product.members?.map(m => m.contact.id) || [];
    
    const updatePayload: GroupModel = {
      id: this.product.id,
      name: this.product.name.trim(),
      member_ids: memberIds,
      description: this.product.description?.trim() || '',
      category: this.product.category || '',
      member_count: memberIds.length,
      members: []
    };
    
    this.contactService.update_group(updatePayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        () => {
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Updated', 
            detail: 'Group updated successfully', 
            life: 3000 
          });
          this.closeDialog();
          this.loadContactGroups();
        },
        (err) => {
          console.error("Groups | Error updating group:", err);
          this.dialogProgress = false;
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: 'Failed to update group', 
            sticky: true 
          });
        }
      );
  }

  hideDialog() {
    this.closeDialog();
  }

  private closeDialog() {
    this.productDialog = false;
    this.dialogProgress = false;
    this.submitted = false;
    this.product = {};
    this.selected_contacts_for_creating_group = [];
    this.availableContacts = [];
  }

  // ========== CONTACT/MEMBER OPERATIONS ==========

  loadAvailableContacts(search?: string) {
    this.contactsLoading = true;
    
    // If searching, use search with reasonable limit
    // Otherwise, load all contacts by fetching pages until we have them all
    if (search && search.trim()) {
      this.loadContactsWithSearch(search);
    } else {
      this.loadAllContacts();
    }
  }

  private loadContactsWithSearch(search: string) {
    // When searching, load a larger page to capture most results
    // The backend should handle the search filtering
    this.contactService.list_contact(1, 200, search)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (result) => {
          this.processContactsResponse(result);
        },
        (err) => {
          console.error("Groups | Error loading contacts with search:", err);
          this.contactsLoading = false;
        }
      );
  }

  private loadAllContacts() {
    // Load all contacts by fetching page by page
    const pageSize = 250;
    let allContacts: any[] = [];
    
    const loadPage = (page: number) => {
      this.contactService.list_contact(page, pageSize)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (result) => {
            if (!result || !Array.isArray(result.results)) {
              console.error("Unexpected contacts response format:", result);
              this.processAllContacts(allContacts);
              return;
            }
            
            allContacts = allContacts.concat(result.results);
            const totalRecords = result.count ?? result.results.length;
            
            // Check if we need to load more pages
            if (allContacts.length < totalRecords) {
              loadPage(page + 1);
            } else {
              this.processAllContacts(allContacts);
            }
          },
          (err) => {
            console.error("Groups | Error loading contacts page:", err);
            // Use whatever we've loaded so far
            this.processAllContacts(allContacts);
          }
        );
    };
    
    loadPage(1);
  }

  private processAllContacts(contacts: any[]) {
    // Normalize contact names
    const normalizedContacts = contacts.map(contact => ({
      ...contact,
      name: contact.name || contact.phone
    }));
    
    // Filter out members already in the group
    this.availableContacts = this.filterAvailableContacts(normalizedContacts);
    this.members_not_part_of_this_group = this.availableContacts;
    this.contactsLoading = false;
  }

  private processContactsResponse(result: any) {
    if (!result || !Array.isArray(result.results)) {
      console.error("Unexpected contacts response format:", result);
      this.availableContacts = [];
      this.contactsLoading = false;
      return;
    }
    
    // Normalize contact names
    const contacts = result.results.map(contact => ({
      ...contact,
      name: contact.name || contact.phone
    }));
    
    // Filter out members already in the group
    this.availableContacts = this.filterAvailableContacts(contacts);
    this.members_not_part_of_this_group = this.availableContacts;
    this.contactsLoading = false;
  }

  private filterAvailableContacts(contacts: any[]): any[] {
    if (!this.product.members || this.product.members.length === 0) {
      return contacts;
    }
    
    const memberPhones = new Set(
      this.product.members.map(m => m.contact.phone)
    );
    
    return contacts.filter(contact => !memberPhones.has(contact.phone));
  }

  showAddMembersModal() {
    this.selected_contacts_for_creating_group = [];
    this.add_members_modal_visible = true;
    this.loadAvailableContacts();
  }

  onContactSearch(event: any) {
    // PrimeNG multiselect filter event
    const searchValue = event.filter || '';
    this.contactSearchSubject$.next(searchValue);
  }

  addMembers() {
    if (!this.selected_contacts_for_creating_group || 
        this.selected_contacts_for_creating_group.length === 0) {
      return;
    }
    
    // Initialize members array if needed
    if (!this.product.members) {
      this.product.members = [];
    }
    
    // Add new members
    for (const contact of this.selected_contacts_for_creating_group) {
      // Check if already exists
      const exists = this.product.members.some(
        m => m.contact.id === contact.id
      );
      
      if (!exists) {
        this.product.members.push({
          contact: {
            id: contact.id,
            name: contact.name,
            phone: contact.phone
          }
        });
      }
    }
    
    // Refresh available contacts list
    this.availableContacts = this.filterAvailableContacts(this.availableContacts);
    this.members_not_part_of_this_group = this.availableContacts;
    
    // Close modal and reset selection
    this.add_members_modal_visible = false;
    this.selected_contacts_for_creating_group = [];
  }

  removeMember(index: number) {
    if (!this.product.members || index < 0 || index >= this.product.members.length) {
      return;
    }
    
    // Remove member at index
    this.product.members.splice(index, 1);
    
    // Refresh available contacts to include the removed member
    this.loadAvailableContacts();
  }

  removeSelectedMembers() {
    if (!this.product.members || this.product.members.length === 0) {
      return;
    }
    
    // Filter out selected members
    const selectedIds = new Set(
      this.product.members
        .filter(m => m.selected)
        .map(m => m.contact.id)
    );
    
    this.product.members = this.product.members.filter(
      m => !selectedIds.has(m.contact.id)
    );
    
    // Refresh available contacts
    this.loadAvailableContacts();
  }

  onSearchMemberInput(event: Event, dt: Table): void {
    const inputElement = event.target as HTMLInputElement;
    const searchValue = inputElement.value;
    dt.filterGlobal(searchValue, 'contains');
  }

  // ========== UTILITY METHODS ==========

  getSeverity(status: string) {
    switch (status) {
      case 'Individual':
        return 'info';
      case 'Micro Enterprise':
        return 'success';
      case 'Small Enterprise':
        return 'warn';
      case 'Medium Enterprise':
        return 'danger';
      default:
        return 'info';
    }
  }

  onBulkUpload(event: any, fileUpload: any): void {
    // Implement bulk upload logic
  }

  showAddContactDialog() {
    // Implement add contact dialog logic
  }
}

// ========== HTML TEMPLATE UPDATES ==========
/*
Key changes in the template (groups.component.html):

1. Update the main table lazy loading:
   [totalRecords]="groupPagination.totalRecords"
   [first]="(groupPagination.page - 1) * groupPagination.pageSize"
   [rows]="groupPagination.pageSize"
   (onLazyLoad)="onGroupPageChange($event)"

2. Update the Add Members button in dialog:
   <button pButton class="modern-btn modern-btn-primary btn-sm" 
           icon="pi pi-user-plus" 
           label="Add Members" 
           (click)="showAddMembersModal()">
   </button>

3. Update multiselect in Add Members modal:
   [options]="members_not_part_of_this_group"
   [(ngModel)]="selected_contacts_for_creating_group"
   [loading]="contactsLoading"

4. Update table summary:
   Total: <strong>{{ groupPagination.totalRecords }}</strong> groups

5. Optional: Add remove members button in the members table header:
   <button pButton 
           icon="pi pi-trash" 
           label="Remove Selected"
           class="modern-btn modern-btn-danger btn-sm"
           [disabled]="!product.members || product.members.length === 0"
           (click)="removeSelectedMembers()">
   </button>
*/