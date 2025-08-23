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
import { Router } from '@angular/router';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { GroupModel } from './groups.model';
import { MultiSelectModule } from 'primeng/multiselect';
import { ContactManagerService } from '../../../shared/services/contact-manager.service';
import { LayoutService } from '../../../layout/service/app.layout.service';
import { Subject, takeUntil } from 'rxjs';


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
  products!: GroupModel[];
  product!: any;
  selectedProducts!: any[] | null;
  submitted: boolean = false;
  statuses!: any[];
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
    }
    else {
      this.layoutService.state.staticMenuDesktopInactive = true;
      this.loadContactGroups();
      this.loading = false;
    }
  }

  validateGroupName() {
    let groupNames = [];
    this.products.forEach((prod) => {
      groupNames.push(prod.name);
    });
    if (groupNames.includes(this.product.name)) {
      this.product = {};
      let error = "Group name is already present. Please choose a different name";
      this.messageService.add({ severity: 'error', summary: 'Success', detail: error, sticky: true });
    }
  }

  individual_contacts !: any;
  loadUserContacts(successCallback=undefined) {
    this.loading = true;
    this.contactService.list_contact().pipe(takeUntil(this.destroy$)).subscribe(
      (data) => {
        this.individual_contacts = data;
        this.individual_contacts.forEach((individual_contact)=> {
          individual_contact.name = individual_contact.name === ''? individual_contact.phone : individual_contact.name;
        });
        this.loading = false;
        if (successCallback) {
          successCallback();
        }
      },
      (err) => {
        console.error("Compose Message | Error getting contacts ", err);
        this.loading = false;
      }
     )
  }

  loadGroupCallback = () => {
    this.totalGroups.emit(this.products.length);
    this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Groups Loaded', life: 3000 });
  }

  loadContactGroups() {
    this.loading = true;
    this.contactService.list_groups().pipe(takeUntil(this.destroy$)).subscribe(
      (data: any) => {
        this.products = data;
        this.loadUserContacts(this.loadGroupCallback);
      },
      (err) => {
        this.loading = false;
        console.error("Contacts | Error getting contacts ", err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Groups Not Loaded', sticky: true });
      }
    );
  }

  onSearchInput(event: Event, dt: Table): void {
    const inputElement = event.target as HTMLInputElement;
    const searchValue = inputElement.value;
    dt.filterGlobal(searchValue, 'contains');
  }

  onSearchMemeberInput(event: Event, dt: Table): void {
    const inputElement = event.target as HTMLInputElement;
    const searchValue = inputElement.value;
    dt.filterGlobal(searchValue, 'contains');
  }

  members_not_part_of_this_group;
  openNew() {
    this.product = {};
    this.members_not_part_of_this_group = this.individual_contacts;
    this.submitted = false;
    this.productDialog = true;
  }


  deleteSelectedProducts() {
    this.confirmationService.confirm({
        message: 'Are you sure you want to delete the selected contacts?',
        header: 'Confirm',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
            this.loading = true;
            let groupIds = [];
            for (let group of this.selectedProducts) {
              groupIds.push(group.id);
            }
            this.contactService.delete_groups(groupIds).pipe(takeUntil(this.destroy$)).subscribe(
              (data) => {
                this.selectedProducts = null;
                this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Contact Deleted', life: 3000 });
                this.loadContactGroups();
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
          this.contactService.delete_group(product.id).pipe(takeUntil(this.destroy$)).subscribe(
            (data) => {
              this.product = {};
              this.loading = false;
              this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Contact Deleted', life: 3000 });
              this.loadContactGroups()
            },
            (err) => {
              console.error('Groups | Error deleting group:', err);
              this.loading = false;
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Group Not Deleted',
                sticky: true,
              });
            });
          }
    });
  }



  confirmDeletion(product: any) {
    
  }
  

  hideDialog() {
    this.productDialog = false;
    this.submitted = false;
  }

  editProduct(product: any) {
    this.product = { ...product };
    this.members_not_part_of_this_group = this.individual_contacts.filter((individual_contact) => !this.product.members.some((actual_member => individual_contact.phone === actual_member.contact.phone)))
    this.productDialog = true;
  }

  refreshMemebersContactList() {
    this.selected_contacts_for_creating_group = [];
    this.members_not_part_of_this_group = this.individual_contacts.filter((individual_contact) => !this.product.members.some((actual_member => individual_contact.phone === actual_member.contact.phone)))
  }
  
  add_members_modal_visible = false;
  selected_contacts_for_creating_group !: any;
  //newMemberToGroup!: AddContactToGroupModel;

  //async addMemebersToExistingGroup(patch=false) {
  //  this.newMemberToGroup = {
  //    contact_id: -1,
  //    organization_id: this.profile.organization,
  //    group_id: this.product.id
  //  }
  //  let created_contacts = 0;
//
  //  // Handle if there are no members selected for new or all members unselected in existing groups.
  //  if (!this.product.members || this.product.members?.length === 0) {
  //    if (patch) {
  //      this.groupService.patchGroupDetails(this.product).subscribe(
  //        (data) => {
  //          this.product.total = this.product.members.length;
  //          this.products[this.findIndexById(this.product.id)] = this.product;
  //          this.products = [...this.products];
  //          this.product = {};
  //          this.dialogProgress = false;
  //          this.productDialog = false;
  //          this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Group Updated', life: 3000 });
  //        },
  //        (err) => {
  //          this.product = {};
  //          this.dialogProgress = false;
  //          this.productDialog = false;
  //          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Group Not Updated', sticky: true });
  //        }
  //      );
  //    }
  //    else {
  //      this.product.members = []; // This would initialize members if empty group is selected which would help while editing.
  //      this.product.total = this.product.members.length;
  //      this.products.push(this.product);
  //      this.dialogProgress = false;
  //      this.productDialog = false;
  //      this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Group Created', life: 3000 });
  //    }
  //  }
  //  else {
  //    for (let contact of this.product.members) {
  //      this.newMemberToGroup.contact_id = contact.contact_id;
  //      // New group would not be having 'group_id' initialized
  //      this.newMemberToGroup.group_id = this.product.id;
  //      this.groupService.addMembers(this.newMemberToGroup).subscribe(
  //        (data) => {
  //          created_contacts += 1;
  //          let foundIndex =  this.product.members.findIndex((member) => member.contact_id === contact.contact_id)
  //          this.product.members[foundIndex].id = data.member_id;
  //          if (created_contacts == this.product.members.length) {
  //            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Memember Got Added' });
  //            if (patch) {
  //                  this.groupService.patchGroupDetails(this.product).subscribe(
  //                    (data) => {
  //                      this.product.total = this.product.members.length;
  //                      this.products[this.findIndexById(this.product.id)] = this.product;
  //                      this.products = [...this.products];
  //                      this.product = {};
  //                      this.dialogProgress = false;
  //                      this.productDialog = false;
  //                      this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Group Updated', life: 3000 });
  //                    },
  //                    (err) => {
  //                      this.product = {};
  //                      this.dialogProgress = false;
  //                      this.productDialog = false;
  //                      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Group Not Updated', sticky: true });
  //                    }
  //                  );
  //            }
  //            else {
  //              this.product.total = this.product.members.length;
  //              this.products.push(this.product);
  //              this.dialogProgress = false;
  //              this.productDialog = false;
  //              this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Group Created', life: 3000 });
  //            }
  //          }
  //        },
  //        (err) => {
  //            this.messageService.add( { severity: 'error', summary: 'Error', detail: 'Group Member addition failed'} );
  //        });
  //    }
  //  }
  //}

  addMembers() {
    if (this.product.id) {
      const temp = this.product.members;
      this.product.members = [];
      for (let temp_existing_contact of temp) {
        this.product.members.push(temp_existing_contact);
      }
      for (let contact of this.selected_contacts_for_creating_group) {
        this.product.members.push({'contact': {'id': contact.id, 'name': contact.name, 'phone': contact.phone}});
      }
      this.product.members = this.product.members;
    }
    else {
      this.product.members = [];
      // Do not do anything unless group is created.
      for (let contact of this.selected_contacts_for_creating_group) {
        this.product.members.push({'contact' : {'id': contact.id, 'name': contact.name, 'phone': contact.phone}});
      }
    }
    this.refreshMemebersContactList();
    this.add_members_modal_visible = false;
  }

  saveGroupSuccessCall() {
    this.dialogProgress = false;
    this.productDialog = false;
    this.loadContactGroups();
  }

  saveSelectedProduct() {
    let memberIds = [];
    if (this.product.members) {
      for (let member of this.product.members) {
        memberIds.push(member.contact.id);
      }
    }
    let oldGroupPayload: GroupModel = {
      id: this.product.id,
      name: this.product.name,
      member_ids: memberIds,
      description: this.product.description,
      category: this.product.category,
      member_count: this.product?.member_count,
      members: []
    }
    this.contactService.update_group(oldGroupPayload).pipe(takeUntil(this.destroy$)).subscribe(
      (data: any) => {
        this.saveGroupSuccessCall();
      },
      (err) => {
        console.error("Groups | Error creating Group ", err);
        this.product = {};
        this.dialogProgress = false;
        this.productDialog = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Group Not Created', sticky: true });
      }
    );
  }

  saveNewProduct() {
    let memberIds = [];
    if (this.product.members) {
      for (let member of this.product.members) {
        memberIds.push(member.contact.id);
      }
    }
    let newGroupPayload: GroupModel = {
      id: -1, // Dummy since the id would be generated from service
      name: this.product.name,
      member_ids: memberIds,
      description: this.product.description,
      category: this.product.category,
      member_count: this.product?.member_count,
      members: []
    }
    this.contactService.create_group(newGroupPayload).pipe(takeUntil(this.destroy$)).subscribe(
      (data: any) => {
        this.product.id = data.id;
        this.saveGroupSuccessCall();
      },
      (err) => {
        console.error("Groups | Error creating Group ", err);
        this.product = {};
        this.dialogProgress = false;
        this.productDialog = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Group Not Created', sticky: true });
      }
    );
  }

  saveProduct() {
    this.submitted = true;
    this.dialogProgress = true;
    if (this.product.id) {
      this.saveSelectedProduct();
    }
    else {
      this.saveNewProduct();
    }
  }

  findIndexById(id: any): number {
    let index = -1;
    for (let i = 0; i < this.products.length; i++) {
        if (this.products[i].id === id) {
            index = i;
            break;
        }
    }

    return index;
  }

  createId(): string {
    let id = '';
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < 5; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

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
    }
    return 'danger';
  }

  onBulkUpload(event: any, fileUpload: any): void {

  }

showAddContactDialog() {

}
}
