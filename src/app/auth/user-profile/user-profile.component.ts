import { Component, OnInit } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { AdminSettingsComponent } from './admin-settings/admin-settings.component';
import { ProfileSettingsComponent } from './profile-settings/profile-settings.component';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    TabsModule,

    ProfileSettingsComponent,
    AdminSettingsComponent
  ],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss'
})
export class UserProfileComponent implements OnInit {

  constructor(private router: Router) {}

  profile;
  ngOnInit(): void {
    this.profile = JSON.parse(localStorage.getItem('profile'));
    if (!this.profile) {
      this.router.navigate(['/apps/login']);
      return;
    }
  }
  
}