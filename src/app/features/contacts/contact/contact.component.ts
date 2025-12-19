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
import { Subject, takeUntil } from 'rxjs';
import { supported_platforms } from '../../../shared/constants';
import { SelectModule } from 'primeng/select';
import { CalendarModule } from 'primeng/calendar';

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
  product!: any;
  selectedProducts!: any[] | null;
  submitted: boolean = false;
  statuses!: any[];

  customFieldDefs: any[] = []; // ✅ Holds the custom field definitions

  private destroy$ = new Subject<void>();

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
    } else {
      this.layoutService.state.staticMenuDesktopInactive = true;
      this.loadContacts();
      this.loading = false;
    }
  }

  loadContacts(successCallback = undefined) {
    this.loading = true;
    this.contactService.list_contact().pipe(takeUntil(this.destroy$)).subscribe(
      (data) => {
        this.loading = false;
        this.products = data.map(contact => {
  contact._search_blob = [
    contact.name,
    contact.phone,
    contact.category,
    contact.description,
    ...Object.values(contact.custom_fields || {})
  ].join(' ').toLowerCase();
  return contact;
});
        this.totalContacts.emit(this.products.length);
        this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Contacts Loaded', life: 3000 });
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
    dt.filterGlobal(searchValue, 'contains');
  }

  // contact.component.ts - ADD METHOD
viewCustomerDetail(customerId: number): void {
  this.router.navigate(['/apps/contacts', customerId]);
}

  openNew() {
    this.product = {
      name: '',
      phone: '',
      description: '',
      address: '',
      category: '',
      platform_name: '',
      image: '',
      custom_fields: {}
    };
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

  saveProduct() {
    this.submitted = true;
    this.dialogProgress = true;

    if (this.product.name?.trim()) {
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
    this.loading = true;
    const file = event.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      this.contactService.import_contact(formData).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          fileUpload.clear();
          this.loadContacts();
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Import Failed',
            detail: 'An error occurred while importing contacts.',
            sticky: true
          });
          fileUpload.clear();
          this.loading = false;
        }
      });
    }
  }

  showAddContactDialog() {}
}
