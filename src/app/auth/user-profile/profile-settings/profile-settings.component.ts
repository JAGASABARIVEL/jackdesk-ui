import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DividerModule } from 'primeng/divider';
import { TextareaModule } from 'primeng/textarea';
import { Router } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { FloatLabelModule } from 'primeng/floatlabel';

import { PlatformManagerService } from '../../../shared/services/platform-manager.service';
import { DomSanitizer } from '@angular/platform-browser';
import { SelectModule } from 'primeng/select';
import { supported_platforms } from '../../../shared/constants';
import { Subject, takeUntil } from 'rxjs';
import { CellEditor, TableModule } from 'primeng/table';
import { environment, HOST } from '../../../../environment';
import { TooltipModule } from 'primeng/tooltip';


export interface PlatformModel {
  id: number,
  platform_name: string,
  user_platform_name: string,
  login_id: string,
  app_id: string,
  login_credentials: string,
  secret_key: string,
  owner: number,
  status: string
}

@Component({
  selector: 'app-user-profile-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    DividerModule,
    SelectModule,
    ToastModule,
    InputGroupModule,
    InputGroupAddonModule,
    TextareaModule,
    FloatLabelModule,
    TableModule,
    TooltipModule,
  ],
  providers: [
    MessageService
  ],
  templateUrl: './profile-settings.component.html',
  styleUrl: './profile-settings.component.scss'
})
export class ProfileSettingsComponent implements OnInit, OnDestroy {

  supported_platforms = supported_platforms;
  selected_platform : any = undefined;
  newPlatformformGroup!: FormGroup;
  private destroy$ = new Subject<void>();
  profile !: any;
  org_name!: string;
  platforms!: PlatformModel[];
  new_platform!: PlatformModel;
  constructor(
    private router: Router,
    private platforService: PlatformManagerService,
    private messageService: MessageService,
    private formBuilder: FormBuilder,
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
    }
    }
  }

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

  const timer = setInterval(() => {
    if (authWindow?.closed) {
      clearInterval(timer);
      //this.fetchGmailAccounts(); // or refresh table if needed
    }
  }, 1000);
}

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
}
