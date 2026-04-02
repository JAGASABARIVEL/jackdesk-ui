import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { SocialAuthService, GoogleLoginProvider, SocialUser } from '@abacritt/angularx-social-login';
import { HttpClient } from '@angular/common/http';
import { SocialLoginModule } from '@abacritt/angularx-social-login';
import { DEFAULT_OWNER_ENTERPRISE_LANDING_APP, DEFAULT_INDIVIDUAL_LANDING_APP, environment, DEFAULT_EMPLOYEE_ENTERPRISE_DASHBOARD_LANDING_APP, DEFAULT_EMPLOYEE_ENTERPRISE_LANDING_APP } from '../../../environment';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { UserManagerService } from '../../shared/services/user-manager.service';
import { supported_platforms } from '../../shared/constants';
import { HOST } from '../../../environment'
import { LayoutService } from '../../layout/service/app.layout.service';
import { SocketService } from '../../shared/services/socketio.service';
import { Subject, takeUntil } from 'rxjs';
import { CUstomEventService } from '../../shared/services/Events/custom-events.service';
import { AppInitializationService } from '../../shared/services/init.services';
import { SessionTimeoutService } from '../../shared/services/session-timeout.service';


declare var google: any;  // Add this at the top

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SocialLoginModule,  // Import Social Login Module

    DialogModule,
    ButtonModule,
    ToastModule,
    RadioButtonModule,
    InputTextModule,
    SelectModule
  ],
  templateUrl: './login.component.html',
  providers: [MessageService],
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit, OnDestroy {
  user: SocialUser | null = null;
  email;
  password;
  profile;
  supportedPlatforms;
  showDialog = false;
  step = 0;
  private destroy$ = new Subject<void>();

  // OTP Login properties
  otpLoginStep: 'email' | 'otp' | null = null;
  otpEmail: string = '';
  otpCode: string = '';
  otpLoading: boolean = false;
  otpTimer: number = 0;
  otpTimerInterval: any;
  attemptsRemaining: number = 3;


  constructor(
    private cdRef: ChangeDetectorRef,
    private authService: SocialAuthService,
    private http: HttpClient,
    private router: Router,
    private fb: FormBuilder,
    private socketService: SocketService,
    private messageService: MessageService,

    private localEventService: CUstomEventService,
    private userManagerService: UserManagerService,
    private layoutService: LayoutService,
    private appInitService: AppInitializationService,
    private sessionService: SessionTimeoutService
    
  ) {
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.otpTimerInterval) {
      clearInterval(this.otpTimerInterval);
    }
  }

  ngOnInit(): void {
    this.layoutService.clearMenuItems()
    this.appInitService.reset();
    localStorage.clear();
    this.initRegistartionForm();
    this.profile = JSON.parse(localStorage.getItem("profile"));
    if (this.profile?.access) {
      if (this.profile.user.is_registration_complete === false) {
        this.router.navigate(["/apps/login"]);
        return;
      }
      else {
        this.validateToken();
      }
      this.routeAppropriate();
    }
    else {
      this.supportedPlatforms = supported_platforms;
    this.authService.authState.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.user = user;
      if (user) {
        this.sendTokenToBackend(user.idToken);  // Send token to Django backend
      }
    });
    }
    setTimeout(() => {  // Ensure Google is loaded before calling renderButton
      google.accounts.id.disableAutoSelect();
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response: any) => this.handleGoogleResponse(response),
        use_fedcm_for_prompt: true
      });
      google.accounts.id.renderButton(
        document.getElementById("googleSignInDiv"),
        { theme: "outline", size: "large" }
      );
    }, 1000);
  }

  showOTPLogin(): void {
    this.otpLoginStep = 'email';
    this.otpEmail = '';
    this.otpCode = '';
    this.attemptsRemaining = 3;
  }

  cancelOTPLogin(): void {
    this.otpLoginStep = null;
    this.otpEmail = '';
    this.otpCode = '';
    if (this.otpTimerInterval) {
      clearInterval(this.otpTimerInterval);
    }
  }

  requestOTP(): void {
    if (!this.otpEmail || !this.otpEmail.includes('@')) {
      this.showError('Please enter a valid email address');
      return;
    }

    this.otpLoading = true;

    this.http.post(`${HOST}/users/login/otp/request`, { email: this.otpEmail })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.otpLoading = false;
          this.otpLoginStep = 'otp';
          this.showSuccess(response.message || 'OTP sent to your email');
          this.startOTPTimer();
        },
        error: (err) => {
          this.otpLoading = false;
          const errorMsg = err.error?.error || 'Failed to send OTP';
          this.showError(errorMsg);
        }
      });
  }

  verifyOTP(): void {
    if (!this.otpCode || this.otpCode.length !== 6) {
      this.showError('Please enter the 6-digit OTP');
      return;
    }

    this.otpLoading = true;

    this.http.post(`${HOST}/users/login/otp/verify`, {
      email: this.otpEmail,
      otp: this.otpCode
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (profile: any) => {
        this.otpLoading = false;
        this.cancelOTPLogin();
        
        // Same flow as Google/Zoho login
        this.socketService.initSocket(profile).then(() => {
          this.setupLoginOrRegistrationProcess(profile);
        }).catch((err) => {
          console.error("Socket connection failed", err);
          this.layoutService.addNotification({
            'id': -1,
            'severity': 'error',
            'app': 'Login',
            'text': 'Socket connection failed. Please engage Engineering.'
          });
          this.router.navigate(['/login']);
        });
      },
      error: (err) => {
        this.otpLoading = false;
        const errorMsg = err.error?.error || 'Invalid OTP';
        this.attemptsRemaining = err.error?.attempts_remaining || this.attemptsRemaining - 1;
        this.showError(errorMsg);
        
        if (this.attemptsRemaining <= 0) {
          this.showError('Too many failed attempts. Please request a new OTP.');
          this.cancelOTPLogin();
        }
      }
    });
  }

  startOTPTimer(): void {
    this.otpTimer = 300; // 5 minutes in seconds
    
    if (this.otpTimerInterval) {
      clearInterval(this.otpTimerInterval);
    }

    this.otpTimerInterval = setInterval(() => {
      this.otpTimer--;
      if (this.otpTimer <= 0) {
        clearInterval(this.otpTimerInterval);
        this.showError('OTP expired. Please request a new one.');
        this.cancelOTPLogin();
      }
    }, 1000);
  }

  getOTPTimerDisplay(): string {
    const minutes = Math.floor(this.otpTimer / 60);
    const seconds = this.otpTimer % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  resendOTP(): void {
    this.requestOTP();
  }

  validateToken() {
    this.userManagerService.ping_user_token().pipe(takeUntil(this.destroy$)).subscribe(() => {
    },
      (err) => {
        if (err.status === 401) {
          localStorage.clear();
          this.router.navigate([""]);
          return;
        }
      }
    )
  }

  routeAppropriate() {
    if (this.profile.user.role === 'individual') {
      this.router.navigate([DEFAULT_INDIVIDUAL_LANDING_APP]);
      return;
    }
    else if (this.profile.user.role === 'owner') {
      this.router.navigate([DEFAULT_OWNER_ENTERPRISE_LANDING_APP]);
      return;
    }
    else {
      this.router.navigate([DEFAULT_EMPLOYEE_ENTERPRISE_LANDING_APP]);
      return;
    }
  }

  decodeJwt(token: string): any {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  ).join(''));

  return JSON.parse(jsonPayload);
}


  handleGoogleResponse(response: any) {
    const credential = response.credential;
    const userData = this.decodeJwt(credential);
    let googleLoginDetails = {"user": userData};
    localStorage.setItem("googleLoginDetails", JSON.stringify(googleLoginDetails))
    this.sendTokenToBackend(response.credential);
  }


  signOut(): void {
    this.authService.signOut();
    this.user = null;
  }

  getDashboardLinkItems(profile) {
    if (profile?.user.role === "owner") {
      return {
        label: 'My Firm',
        icon: 'pi pi-home',
        items: [
          {
            label: 'Dasboard',
            icon: 'pi pi-briefcase',
            items: [
              {
                label: 'Finance',
                icon: 'pi pi-chart-bar',
                routerLink: ['/apps/ca-firm/dashboard']
              },
              {
                label: 'Tickets',
                icon: 'pi pi-comments',
                routerLink: ['/apps'],
              },
              {
                label: 'Productivity',
                icon: 'pi pi-stopwatch',
                routerLink: ['/apps/productivity'],
              },
            ]
          },
          {
            label: 'Manage',
            icon: 'pi pi-list',
            items: [
              {
                label: 'Employees',
                icon: 'pi pi-users',
                routerLink: ['/apps/ca-firm/employees']
              },
              {
                label: 'Departments',
                icon: 'pi pi-sitemap',
                routerLink: ['/apps/ca-firm/departments']
              },
              {
                label: 'Salary',
                icon: 'pi pi-wallet',
                routerLink: ['/apps/ca-firm/salaries']
              },
              {
                label: 'Products & Services',
                icon: 'pi pi-box',
                routerLink: ['/apps/ca-firm/products']
              },
              {
                label: 'Expense',
                icon: 'pi pi-shopping-cart',
                routerLink: ['/apps/ca-firm/office-purchases']
              },
              {
                label: 'Sales',
                icon: 'pi pi-dollar',
                routerLink: ['/apps/ca-firm/customer-purchases']
              },
              //{
              //  label: 'Template Studio',
              //  icon: 'pi pi-dollar',
              //  routerLink: ['/apps/template-manager']
              //}
            ]
          }
        ]
      }
    }
    else {
    return {
        label: 'My Firm',
        icon: 'pi pi-home',
        items: [
          {
            label: 'Dasboard',
            icon: 'pi pi-briefcase',
            items: [
              {
                label: 'Tickets',
                icon: 'pi pi-comments',
                routerLink: ['/apps'],
              },
            ]
          },
          {
            label: 'Manage',
            icon: 'pi pi-list',
            items: [
              {
                label: 'Expense',
                icon: 'pi pi-shopping-cart',
                routerLink: ['/apps/ca-firm/office-purchases']
              },
              {
                label: 'Sales',
                icon: 'pi pi-dollar',
                routerLink: ['/apps/ca-firm/customer-purchases']
              },
            ]
          }
        ]
      }
    }
  }

  getCampaignLinkItems(profile) {
    let linkPrivilegedItems = {
      label: 'Campaign',
      icon: 'pi pi-megaphone',
      items: [
        {
          label: 'Journal',
          icon: 'pi pi-history',
          routerLink: ['/apps/history'],
        },
        {
          label: 'Jobs',
          icon: 'pi pi-calendar-clock',
          routerLink: ['/apps/schedules'],
        },
        {
          label: 'Compose',
          icon: 'pi pi-pencil',
          routerLink: ['/apps/compose'],
        },
      ]
    }

    let linkReadOnlyItems = {
      label: 'Campaign',
      icon: 'pi pi-megaphone',
      items: [
        {
          label: 'Journal',
          icon: 'pi pi-history',
          routerLink: ['/apps/history'],
        },
        {
          label: 'Jobs',
          icon: 'pi pi-calendar-clock',
          routerLink: ['/apps/schedules'],
        },
      ]
    }
    if (profile?.user.role === "owner") {
      return linkPrivilegedItems;
    }
    return linkReadOnlyItems;
  }


  getStorageLink(profile) {
    let storageItems = {
                label: 'Drive',
                icon: 'pi pi-server',
                items: [
                  {
                    label: 'File Explorer',
                    icon: 'pi pi-desktop',
                    routerLink: ['/apps/fmanager'],
                  },
                  {
                    label: 'Usage Cost',
                    icon: 'pi pi-chart-bar',
                    routerLink: ['/apps/fmanager-usage-cost'],
                  }
                ]
            }
    if (profile?.user.role === "owner") {
      return storageItems;
    }
    return {
      visible: false
    };
  }

  getContactLink(profile) {
    let contactItems = {
                label: 'Customer',
                icon: 'pi pi-users',
                items: [
                  {
                    label: 'Customers',
                    icon: 'pi pi-address-book',
                    routerLink: ['/apps/ca-firm/customers']
                  },
                  {
                    label: 'Contacts',
                    icon: 'pi pi-user',
                    routerLink: ['/apps/user'],
                  },
                  {
                    label: 'Groups',
                    icon: 'pi pi-users',
                    routerLink: ['/apps/group'],
                  }
                ]
            }
    if (profile?.user.role === "owner") {
      return contactItems;
    }
    return contactItems;
    
  }


  initLayoutMenu(profile) {
    let individualMenuItems = [
            {
                label: 'File Storage',
                icon: 'pi pi-server',
                routerLink: ['/apps/fmanager']
            }
        ]
        let enterpriseMenuItems = [
            this.getDashboardLinkItems(profile),
            this.getContactLink(profile),
            this.getCampaignLinkItems(profile),
            {
                label: 'Tickets',
                icon: 'pi pi-comment',
                items: [
                  {
                    label: 'Chat',
                    icon: 'pi pi-comment',
                    routerLink: ['/apps/chat'],
                  },
                  {
                    label: 'Active',
                    icon: 'pi pi-comments',
                    routerLink: ['/apps/chat-active'],
                  },
                  {
                    label: 'Journal',
                    icon: 'pi pi-ticket',
                    routerLink: ['/apps/ticketing'],
                  },
                  //{
                  //  label: 'Usage',
                  //  icon: 'pi pi-chart-bar',
                  //  routerLink: ['/apps/chat-usage-cost'],
                  //}
                ]
            },
            //this.getStorageLink(profile),
        ];

        if (profile.user.role !== 'individual') {
            this.layoutService.menuItemsCache.update((prev)=>[...prev, {items: enterpriseMenuItems}])
        }
        if (profile.user.role === 'individual') {
            //this.layoutService.menuItemsCache.update((prev)=>[...prev, {items: individualMenuItems}])
        }
  }

  initSates() {
    //this.layoutService.clearNotifications();
    this.layoutService.menuItemsCache.update((prev)=>[]);
  }

  setupLoginOrRegistrationProcess(profile) {
    this.appInitService.reset();
    this.initSates();
    this.initLayoutMenu(profile);
        this.profile = profile;
        localStorage.setItem(
          "profile", JSON.stringify(profile)
        );
        if (this.profile["user"]["is_registration_complete"] === true) {
          this.layoutService.isLoggedIn.set(true);
          //this.sessionService.startWatching({
          //  idleTimeoutMs: 12 * 60 * 60 * 1000,   // 12 hours
          //  warningDurationMs: 60 * 1000,     // 60 second warning
          //});
          this.localEventService.emitLoginSuccessNotification(profile);
          this.routeAppropriate();
        }
        else {
          this.step = 1;
          this.showDialog = true;
          this.cdRef.detectChanges();
        }
      }

  sendTokenToBackend(token: string): void {
    this.http.post(`${HOST}/users/login/google`, { token })
    .pipe(takeUntil(this.destroy$))
      .subscribe( {
        next: (profile) => {
          //this.setupLoginOrRegistrationProcess(profile);
          this.socketService.initSocket(profile).then(() => {
            this.setupLoginOrRegistrationProcess(profile);
          })
          .catch((err) => {
            console.error("Socket connection failed", err);
            this.layoutService.addNotification(
                {'id': -1, 'severity': 'error', 'app': 'Login', 'text': 'Socket connection failed. Please engage Engineering.'}
            )
            //this.setupLoginOrRegistrationProcess(profile);
            this.router.navigate(['/apps/login'])
          });
        },
        error: (err) => {console.error("Error sending token:", err);}
      });
  }


  // +++++++++++++++++ Registration code +++++++++++++++++++++


  userType: string | null = null;
  role: string | null = null;

  registeredOrganizationLoading = false;
  registeredOrganizations = [
    { "name": "solvedektop", "value": 1 },
    { "name": "solvedektop", "value": 1 }
  ];

  ownerForm: FormGroup;
  employeeForm: FormGroup;

  initRegistartionForm() {
    this.ownerForm = this.fb.group({
      organization_name: ['', Validators.required],
      uuid: ['', Validators.required],
      platform_name: ['', Validators.required],
      friendly_platform_name: ['', Validators.required],
      login_id: ['', Validators.required],
      app_id: ['', Validators.required],
      login_credentials: ['', Validators.required],
      secret_key: ['', Validators.required]
    });

    this.employeeForm = this.fb.group({
      organization_id: ['', Validators.required],
      uuid: ['', Validators.required],
    });
  }

  openDialog() {
    this.showDialog = true;
  }

  nextStep() {
    if (this.userType === 'individual') {
      this.submitIndividual();
    } else {
      this.step++;
    }
  }

  prevStep() {
    this.step--;
  }

  submitIndividual() {
    this.userManagerService.register_individual_user({}).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.showSuccess('Individual registered successfully!');
        this.router.navigate([DEFAULT_INDIVIDUAL_LANDING_APP]);
        return;
      },
      error: () => { this.showError('Failed to register individual.'); this.router.navigate(['/apps/login']); return; },
    });
    this.showDialog = false;
  }

  updateOwnerProfile(role, organization) {
    let profile = JSON.parse(localStorage.getItem("profile"));
    profile.user.is_registration_complete = true;
    profile.user.role = role,
      profile.user.organization = organization
    localStorage.setItem(
      "profile", JSON.stringify(profile)
    );
  }

  submitOwner() {
    if (this.ownerForm.valid) {
      this.userManagerService.register_owner_user(this.ownerForm.value).pipe(takeUntil(this.destroy$)).subscribe({
        next: (response: any) => {
          this.showSuccess('Owner registered successfully!');
          this.updateOwnerProfile(response.user.user_type, response.user);
          this.router.navigate([DEFAULT_OWNER_ENTERPRISE_LANDING_APP]);
          return;
        },
        error: () => { this.showError('Failed to register owner.'); this.router.navigate(['/apps/login']); return; },
      });
      this.showDialog = false;
    }
  }

  submitEmployee() {
    if (this.employeeForm.valid) {
      /**
      this.userManagerService.register_employee_user(this.employeeForm.value).subscribe({
        next: () => this.showSuccess('Employee registered successfully!'),
        error: () => this.showError('Failed to register employee.'),
      });*/
      this.showDialog = false;
    }
  }

  showSuccess(message: string) {
    this.messageService.add({ severity: 'success', summary: 'Success', detail: message });
  }

  showError(message: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: message });
  }

  initiateZohoLogin(): void {
  const state = this.generateRandomState();
  const zohoAuthUrl = `${environment.zohoAccountsUrl}/oauth/v2/auth?` +
    `response_type=code&` +
    `client_id=${environment.zohoClientId}&` +
    `scope=AaaServer.profile.READ&` +
    `redirect_uri=${environment.zohoRedirectUri}&` +
    `access_type=offline&` +
    `state=${state}`;
  
  // Open popup window
  const popup = window.open(
    zohoAuthUrl,
    'Zoho Login',
    'width=500,height=600,left=100,top=100'
  );
  
  // Listen for messages from popup
  window.addEventListener('message', (event) => {
    // Verify origin for security
    if (event.origin !== window.location.origin) {
      return;
    }
    
    if (event.data.type === 'ZOHO_AUTH_SUCCESS') {
      const code = event.data.code;
      this.sendZohoCodeToBackend(code);
      if (popup) {
        popup.close();
      }
    } else if (event.data.type === 'ZOHO_AUTH_ERROR') {
      this.showError('Zoho authentication failed');
      if (popup) {
        popup.close();
      }
    }
  });
}

private generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

sendZohoCodeToBackend(code: string): void {
  this.http.post(`${HOST}/users/login/zoho`, { code })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (profile) => {
        this.socketService.initSocket(profile).then(() => {
          this.setupLoginOrRegistrationProcess(profile);
        }).catch((err) => {
          console.error("Socket connection failed", err);
          this.layoutService.addNotification(
            { 'id': -1, 'severity': 'error', 'app': 'Login', 'text': 'Socket connection failed. Please engage Engineering.' }
          );
          this.router.navigate(['/apps/login']);
        });
      },
      error: (err) => { 
        console.error("Error sending Zoho code:", err);
        this.showError('Failed to complete Zoho login');
      }
    });
}


}


