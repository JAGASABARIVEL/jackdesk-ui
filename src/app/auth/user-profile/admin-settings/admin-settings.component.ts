import { Component, OnDestroy, OnInit } from '@angular/core';
import { UserManagerService } from '../../../shared/services/user-manager.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { InputGroup } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { TooltipModule } from 'primeng/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { ContactManagerService } from '../../../shared/services/contact-manager.service';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { AccordionModule } from 'primeng/accordion';
import { supported_platforms } from '../../../shared/constants';
import { PlatformManagerService } from '../../../shared/services/platform-manager.service';
import { environment, HOST } from '../../../../environment';
import { PlatformModel } from '../profile-settings/profile-settings.component';
import { LayoutService } from '../../../layout/service/app.layout.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,

    ButtonModule,
    SelectModule,
    InputTextModule,
    InputGroup,
    InputGroupAddonModule,
    CardModule,
    TableModule,
    ToastModule,
    TooltipModule,
    CheckboxModule,
    ConfirmDialogModule,
    DialogModule,
    AccordionModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.scss'
})
export class AdminSettingsComponent implements OnInit, OnDestroy {

  blockDialogVisible = false;
  registeredUsersLoading = false;
  registeredUsers: any = [];
  registeredEmployeeTypes = [
  { name: 'intern' },
  { name: 'nontech' },
  { name: 'employee' },
  { name: 'manager' }
];
  private destroy$ = new Subject<void>();
  supported_platforms = supported_platforms;
  profile !: any;

  // GMessage Integration Variables
  gmessageStatus: any = null;
  gmessageError: string = '';
  gmessageQRLoading = false;
  gmessageQRCode: SafeUrl | null = null;
  checkingAuthStatus = false;
  gmessageDialogVisible = false;
  private gmessagePlatformId: number | null = null;
  private gmessageAuthInterval: any = null;

  constructor(
    private router: Router,
    private formBuilder: FormBuilder,
    private sanitizer: DomSanitizer,

    private messageService: MessageService,

    private layoutService: LayoutService,
    private userManagerService: UserManagerService,

    private confirmationService: ConfirmationService,
    private contactService: ContactManagerService,
    private platforService: PlatformManagerService,
    private platformManagerService: PlatformManagerService
  ) {
    this.newPlatformformGroup = this.formBuilder.group({
          selected_platform_ctrl: ['', [Validators.required]],
          platformname_form_field_ctrl: ['', [Validators.required]],
          login_id_form_filed_ctrl: ['', [Validators.required]],
          app_id_form_field_ctrl: ['', [Validators.required]],
          token_form_filed_ctrl: ['', [Validators.required]],
          secret_key_field_ctrl: ['', [Validators.required]],
        });
  }
        

  ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}

  ngOnInit(): void {
    

    this.profile = JSON.parse(localStorage.getItem('profile'));
    if (!this.profile) {
      this.takeToLoginScreen();
    }
    else {
      if (["owner", "employee"].includes(this.profile.user.role)) {
      this.initEnterpriseProfile();
      this.initAdditionForm();
      this.initAdditionFormAgent();
      this.initCustomFileForm();
      this.initRegisteredUsersList();
      this.initRegisteredAgentsList();
      this.loadCustomFields();
      // Load existing employees of the organization
      this.loadEmployees();
      this.loadAgents();
      this.loadPlatforms();
      }
    }
  }

  initRegisteredUsersList() {
    this.registeredUsersLoading = true;
    this.userManagerService.list_all_users().pipe(takeUntil(this.destroy$)).subscribe((response) => {
      this.registeredUsers = response;
      this.registeredUsersLoading = false;
    }, (err) => this.registeredUsersLoading=false);
  }

  // +++++++ Employee Management +++++++++++++
  employeeForm: FormGroup;
  initAdditionForm() {
    this.employeeForm = this.formBuilder.group({
      employee_id: ['', Validators.required],
      employment_role: ['', Validators.required],
      uuid: ['', Validators.required],
    });
  }

  initCustomFileForm() {
    this.fieldForm = this.formBuilder.group({
      name: ['', Validators.required],
      key: ['', Validators.required],
      field_type: ['text', Validators.required],
      required: [false],
      options: ['']
    });
  }

  addEmployee() {
    if (this.employeeForm.valid) {
      this.userManagerService.add_employee_user_to_org(this.employeeForm.value).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {this.showSuccess('Employee registered successfully!'); this.loadEmployees();},
        error: (err) => {this.showError(`Failed to register employee.\nReason${err.error?.non_field_errors[0]}`)},
      });
    }
  }

  employees = []
  loadEmployees() {
    this.userManagerService.list_users().pipe(takeUntil(this.destroy$)).subscribe(data => {
      this.employees = data;
    });
  }

  removeEmployee(employee) {
    this.userManagerService.remove_employee_user_from_org(employee?.id).pipe(takeUntil(this.destroy$)).subscribe(
      () => {this.showSuccess("Employee removed from organization"); this.loadEmployees()},
      () => this.showError("Emplyoee could not be removed from the organization")
    )
  }

  blockedContacts: any[] = [];
  selectedPlatform
  registeredPlatforms;
  blockForm = {
  platform: null,
  contact_value: '',
  contact_type: '',
  reason: ''
};
  loadPlatforms() {
    this.platformManagerService.list_platforms().pipe(takeUntil(this.destroy$)).subscribe(
      {
        next: (data) => {this.registeredPlatforms = data; this.loadAllBlockedContacts();},
        error: (err) => console.error("Could not get the platforms ", err)
      }
    )
  }

allBlockedContacts: any[] = [];

loadAllBlockedContacts() {
  this.allBlockedContacts = [];  // Clear existing data

  for (let let_platform of this.registeredPlatforms) {
    this.platformManagerService
      .getBlockedContacts(let_platform.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any[]) => {
          if (data.length > 0) {
            // Add platform context + flatten
            const withPlatform = data.map(item => ({
              ...item,
              platform_name: let_platform.user_platform_name,
              platform: let_platform.id
            }));
            this.allBlockedContacts.push(...withPlatform);  // Use spread to flatten
          }
        },
        error: (err) => console.error("Can not load blocked contacts", err)
      });
  }
}


submitBlockContact() {
  this.blockForm.contact_type = this.blockForm.platform.platform_name;
  this.platformManagerService
    .blockContact(this.blockForm.platform.id, this.blockForm)
    .subscribe({
      next: () => {
        this.blockDialogVisible = false;
        this.blockForm = { platform: null, contact_value: '', contact_type: '', reason: '' };
        this.loadAllBlockedContacts();
      },
      error: (err) => console.error('Block contact failed', err)
    });
}

unblockContact(platformId: number, contactValue: string) {
  this.platformManagerService
    .unblockContact(platformId, contactValue)
    .subscribe(() => this.loadAllBlockedContacts());
}


  // +++++++++++++++++ Agent Management ++++++++++++++

  registeredAgents: any[] = []
  registeredAgentsLoading = false;
  initRegisteredAgentsList() {
    this.registeredAgentsLoading = true;
    this.userManagerService.list_global_agents().pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
      this.registeredAgents = response;
      this.registeredAgentsLoading = false;
    }, (err) => this.registeredAgentsLoading=false);
  }

  agentForm: FormGroup;
  initAdditionFormAgent() {
    this.agentEmailValid = false;
    this.agentForm = this.formBuilder.group({
      agent_email: ['', Validators.required],
      agent_username: ['', Validators.required],
    });
  }

  agentEmailValid = false;
  validateAgentEmailAvailable() {
    let agent_email = this.agentForm.value.agent_email;
    if (agent_email.length === 0) {
      this.agentEmailValid = false;
      return;
    }
    let is_email_registered_already: any = this.registeredAgents.filter((agent) => {
      return agent.email === agent_email
    });
    if (is_email_registered_already?.length === 0) {
      this.agentEmailValid = true;
      return;
    }
    console.warn("Email not available");
    this.agentEmailValid = false;
    return;    
  }

  addAgent() {
    if (this.agentForm.valid) {
      this.userManagerService.add_agent(this.agentForm.value).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {this.showSuccess('Agent registered successfully!'); this.initAdditionFormAgent(); this.loadAgents(); this.initRegisteredAgentsList();},
        error: () => this.showError('Failed to register agent.'),
      });
    }
  }

  agents: any = []
  loadAgents() {
    this.userManagerService.list_my_agents().pipe(takeUntil(this.destroy$)).subscribe(data => {
      this.agents = data;
      this.loadEmployees();
    });
  }

  removeAgent(agent) {
    this.userManagerService.remove_agent_from_org(agent.id).pipe(takeUntil(this.destroy$)).subscribe(
      () => {this.showSuccess("Employee removed from organization"); this.loadAgents(); this.initRegisteredAgentsList();},
      () => this.showError("Emplyoee could not be removed from the organization")
    )
  }


  showSuccess(message: string) {
    this.messageService.add({ severity: 'success', summary: 'Success', detail: message });
  }

  showError(message: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: message });
  }


  fieldForm: FormGroup;
  customFields: any[] = [];

  fieldTypes = [
    { label: 'Text', value: 'text' },
    { label: 'Number', value: 'number' },
    { label: 'Date', value: 'date' },
    { label: 'Dropdown', value: 'dropdown' },
    { label: 'Checkbox', value: 'checkbox' }
  ];


  loadCustomFields() {
    this.contactService.list_contact_custom_fields().subscribe({
      next: (res) => (this.customFields = res),
      error: (err) => console.error("Failed to load fields", err)
    });
  }

  showOptionsField(): boolean {
    const type = this.fieldForm.get('field_type')?.value;
    return type === 'dropdown' || type === 'checkbox';
  }

  onCustomFiledsSubmit() {
    let payload = this.fieldForm.value;

    // Convert comma-separated options string into array (if needed)
    if (this.showOptionsField()) {
      payload.options = payload.options
        .split(',')
        .map((opt: string) => opt.trim())
        .filter((opt: string) => !!opt);
    } else {
      payload.options = null;
    }

    this.contactService.create_contact_custom_field(payload).subscribe({
      next: () => {
        this.loadCustomFields();
        this.fieldForm.reset({ field_type: 'text', required: false });
      },
      error: (err) => console.error("Error creating custom field", err)
    });
  }

  selectedField

deleteField(field: any) {
  this.confirmationService.confirm({
    message: `Are you sure you want to delete "${field.name}"?`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      this.contactService.deleteField(field.id).subscribe(() => {
        this.loadCustomFields(); // reload list
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Field deleted successfully' });
      });
    }
  });
}

/** Platform / Channe settings */

  selected_platform : any = undefined;
  newPlatformformGroup!: FormGroup;
  org_name!: string;
  platforms!: PlatformModel[];
  new_platform!: PlatformModel;
  takeToLoginScreen()
 {
  this.router.navigate(['/apps/login']);
      return;
 }
  initEnterpriseProfile() {
    this.loadRegisteredPlatforms();
    this.new_platform = {
      id: undefined,
      platform_name: undefined,
      user_platform_name: undefined,
      login_credentials: undefined,
      login_id: undefined,
      app_id: undefined,
      secret_key: undefined,
      owner: this.profile.user.id,
      status: 'active'
    }
    this.org_name = this.profile.user.organization.name;
  }

  loadRegisteredPlatforms() {
    this.platforService.list_platforms().pipe(takeUntil(this.destroy$)).subscribe(
      (data) => {
        this.platforms = data;
      },
      (err) => {
        console.error("Compose Message | Error getting platforms ", err);  
      }
    );
  }

  addNewPlatformDialogVisible: boolean = false;
  resetPlatform() {
    this.selected_platform = null;
    this.new_platform = {
      id: undefined,
      platform_name: undefined,
      user_platform_name: undefined,
      login_credentials: undefined,
      app_id: undefined,
      login_id: undefined,
      secret_key: undefined,
      owner: this.profile.user.id,
      status: 'active'     
    }
  }

  onAddPlatform() {
    this.new_platform.owner = this.profile.user.id;
    this.new_platform.platform_name = this.newPlatformformGroup.value.selected_platform_ctrl.name.toLowerCase()
    this.new_platform.user_platform_name = this.newPlatformformGroup.value.platformname_form_field_ctrl
    this.new_platform.login_id = this.newPlatformformGroup.value.login_id_form_filed_ctrl;
    this.new_platform.login_credentials = this.newPlatformformGroup.value.token_form_filed_ctrl;
    this.new_platform.secret_key = this.newPlatformformGroup.value.secret_key_field_ctrl;
    this.new_platform.app_id = this.newPlatformformGroup.value.app_id_form_field_ctrl;
    this.new_platform.status = 'active';
    this.platforService.create_platform(this.new_platform).pipe(takeUntil(this.destroy$)).subscribe(
      (data) => {
        this.addNewPlatformDialogVisible = false;
        this.loadRegisteredPlatforms();
        this.resetPlatform();
        this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Platform Created', life: 3000 });
      },
      (err) => {
        console.error("Compose Message | Error creating platform ", err);
        this.addNewPlatformDialogVisible = false;
        this.resetPlatform();
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Platform Creation Failed', sticky: true });
      }
    )
  }
    
  connectGmail(platformId: number) {
  const clientId = environment.googleClientId;
  const redirectUri = `${HOST}/platforms/gmail/oauth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send'
    ].join(' '),
    state: platformId.toString()
  });

  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  const width = 500;
  const height = 600;
  const left = (window.innerWidth - width) / 2;
  const top = (window.innerHeight - height) / 2;
  const authWindow = window.open(
    oauthUrl,
    'GmailOAuth',
    `width=${width},height=${height},top=${top},left=${left}`
  );

  // Listen for message from popup
  const messageListener = (event: MessageEvent) => {
    if (event.data?.type === 'gmail-auth-success') {
      window.removeEventListener('message', messageListener);
      this.layoutService.clearNotification('Platform'); // or any other post-auth logic
    }
  };
  window.addEventListener('message', messageListener);

  const timer = setInterval(() => {
    if (authWindow?.closed) {
      clearInterval(timer);
      // Optional: fallback if no postMessage received
    }
  }, 1000);
}


//this.layoutService.clearNotification('Platform');
 _connectGmail(platformId: number) {
  const clientId = environment.googleClientId;
  const redirectUri = encodeURIComponent(`${HOST}/platforms/gmail/oauth/callback`);
  const scope = encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send');
  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `scope=${scope}&` +
    `access_type=offline&` +
    `include_granted_scopes=true&` +
    `response_type=code&` +
    `client_id=${clientId}&` +
    `redirect_uri=${redirectUri}&` +
    `state=${platformId}&` +
    `prompt=consent`;
  const width = 500;
  const height = 600;
  const left = (window.innerWidth - width) / 2;
  const top = (window.innerHeight - height) / 2;
  const authWindow = window.open(
    oauthUrl,
    'GmailOAuth',
    `width=${width},height=${height},top=${top},left=${left}`
  );

  const timer = setInterval(() => {
    if (authWindow?.closed) {
      clearInterval(timer);
      //this.fetchGmailAccounts(); // or refresh table if needed
    }
  }, 1000);
}

  savePlatform(platform: any) {
    this.platforService.update_platform(platform.id, platform).pipe(takeUntil(this.destroy$)).subscribe(
        (data) => {
          this.loadRegisteredPlatforms();
          this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Platforms Updated', life: 3000 });
        },
        (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Platforms Update Failed', sticky: true });
        }
      );
  }

  // Gmessages
  /** Open GMessage QR Dialog */
openGMessageDialog(platformId: number) {
  this.gmessageDialogVisible = true;
  this.gmessagePlatformId = platformId;
  this.resetGMessageState();
  this.generateGMessageQR();
}

/** Close Dialog and Clear State */
closeGMessageDialog() {
  this.gmessageDialogVisible = false;
  this.clearGMessagePolling();
  this.resetGMessageState();
}

/** Generate GMessage QR Code from backend */
generateGMessageQR() {
  if (!this.gmessagePlatformId) return;

  this.gmessageError = '';
  this.gmessageQRLoading = true;
  this.gmessageQRCode = '';
  this.gmessageStatus = null;

  this.platformManagerService.getGMessageQR(this.gmessagePlatformId)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res: any) => {

        let base64Data = res.qr_code;

        /// Ensure prefix exists
      if (!base64Data.startsWith('data:image/png;base64,')) {
        base64Data = 'data:image/png;base64,' + base64Data;
      }

      // Sanitize the URL to safely display
      this.gmessageQRCode = this.sanitizer.bypassSecurityTrustUrl(base64Data);
      this.gmessageQRLoading = false;

        // Start polling for authentication
        //this.pollAuthStatus();
      },
      error: (err) => {
        this.gmessageQRLoading = false;
        this.gmessageError = err?.error?.message || 'Failed to generate QR code';
      }
    });
}

/** Start polling backend for authentication status */
pollAuthStatus() {
  this.clearGMessagePolling();
  this.checkingAuthStatus = true;
  this.gmessageAuthInterval = setInterval(() => {
    if (this.gmessagePlatformId)
      this.platformManagerService.getGMessageStatus(this.gmessagePlatformId)
        .subscribe({
          next: (res: any) => {
            this.gmessageStatus = res;
            if (res.is_authenticated) {
              this.checkingAuthStatus = false;
              this.clearGMessagePolling();
              this.showSuccess('Google Messages connected successfully!');
            }
          },
          error: (err) => console.warn('Auth check failed', err)
        });
  }, 5000); // every 5s
}

/** Sync messages manually */
syncGMessage() {
  if (!this.gmessagePlatformId) return;

  this.platformManagerService.syncGMessage(this.gmessagePlatformId)
    .subscribe({
      next: () => this.showSuccess('Messages synced successfully!'),
      error: () => this.showError('Failed to sync Google Messages')
    });
}

/** Disconnect GMessage session */
disconnectGMessage() {
  if (!this.gmessagePlatformId) return;

  this.confirmationService.confirm({
    message: 'Are you sure you want to disconnect Google Messages?',
    header: 'Confirm Disconnect',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      this.platformManagerService.disconnectGMessage(this.gmessagePlatformId)
        .subscribe({
          next: () => {
            this.showSuccess('Disconnected from Google Messages');
            this.closeGMessageDialog();
          },
          error: () => this.showError('Failed to disconnect')
        });
    }
  });
}

/** Helpers */
resetGMessageState() {
  this.gmessageStatus = null;
  this.gmessageError = '';
  this.gmessageQRLoading = false;
  this.gmessageQRCode = '';
  this.checkingAuthStatus = false;
}

clearGMessagePolling() {
  if (this.gmessageAuthInterval) {
    clearInterval(this.gmessageAuthInterval);
    this.gmessageAuthInterval = null;
  }
}

}
