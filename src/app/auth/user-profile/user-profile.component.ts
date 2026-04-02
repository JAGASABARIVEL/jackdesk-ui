import { Component, OnInit, OnDestroy, AfterViewInit, Input, Output, EventEmitter } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { DialogModule } from 'primeng/dialog';
import { AccordionModule } from 'primeng/accordion';
import { trigger, transition, style, animate } from '@angular/animations';
import { LayoutService } from '../../layout/service/app.layout.service';
import { VERSION, RELEASE_NOTES } from '../../../environment';
import { SessionTimeoutService } from '../../shared/services/session-timeout.service';

declare const google: any;

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    TabsModule,
    ButtonModule,
    AvatarModule,
    DividerModule,
    DialogModule,
    AccordionModule,
  ],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss'
})
export class UserProfileComponent implements OnInit, OnDestroy, AfterViewInit {
  _profile: any;
  org_name: string = '';
  showDropdown: boolean = false;
  showReleaseNotes: boolean = false;
  private hideTimeout: any;
  @Output() logoutEvent = new EventEmitter();

  // Version information
  currentVersion: any = VERSION;
  releaseNotes: any = RELEASE_NOTES;

  @Input()
  set profile(profile) {
    this._profile = profile;
    this.org_name = profile.user?.organization?.name || '';
  }

  get profile() {
    return this._profile;
  }

  constructor(
    private layoutService: LayoutService,
    private router: Router,
    private sessionService: SessionTimeoutService,
  ) {}

  versions: string[] = [];
  ngOnInit() {
    this.versions = Object.keys(this.releaseNotes).reverse();
  }

  activeAccordionIndex: number | null = null;

ngAfterViewInit() {
  // defer to next change detection cycle
  setTimeout(() => {
    this.activeAccordionIndex = 0;
  });
}

  getVersions(): string[] {
    return Object.keys(this.releaseNotes).reverse(); // Show newest first
  }

  onMouseEnter() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    this.showDropdown = true;
  }

  onMouseLeave() {
    this.hideTimeout = setTimeout(() => {
      this.showDropdown = false;
    }, 300);
  }

  ngOnDestroy() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
  }

  getInitials(): string {
    if (!this.profile?.user?.username) return 'U';
    const names = this.profile.user.username.split(' ');
    return names.length > 1 
      ? names[0][0] + names[1][0] 
      : names[0][0] + (names[0][1] || '');
  }

  formatRole(role: string): string {
    if (!role) return '';
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  navigateToSettings() {
    this.showDropdown = false;
    this.router.navigate(['/apps/settings']);
  }

  navigateToProfile() {
    this.showDropdown = false;
    this.router.navigate(['/apps/profile']);
  }

  takeToLoginScreen() {
    this.showDropdown = false;
    this.router.navigate(['/apps/login']);
  }

  invokelogout() {
    this.sessionService.stopWatching();
    this.logoutEvent.emit();
    localStorage.clear();
    this.router.navigate(['']);
    this.layoutService.menuItemsCache.update((prev) => []);
  }

  logout() {
    this.showDropdown = false;
    let googleLoginDetails = JSON.parse(localStorage.getItem("googleLoginDetails") || '{}');
    const google_user = googleLoginDetails?.user || null;
    
    if (!google_user) {
      this.invokelogout();
      return;
    }
    
    if (google_user){
      this.invokelogout();
      // TODO: If the user is invoked or stale entries it can not be revoked and
      // the login flow break. Hence for now we are logging out the application
      // without worrying about google logout.
      //try {
      //  google.accounts.id.revoke(google_user.email, () => {
      //    this.invokelogout();
      //  });
      //} catch (e) {
      //  console.error(e);
      //  this.invokelogout();
      //}
    }
  }
}