
import { Component, OnInit } from '@angular/core';
import { BadgeModule } from 'primeng/badge';

import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ContactComponent } from './contact/contact.component';
import { GroupsComponent } from './groups/groups.component';
import { TabsModule } from 'primeng/tabs';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [
    CommonModule,
    TabsModule,
    BadgeModule,

    ContactComponent,
    GroupsComponent
  ],
  providers: [],
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.scss'
})
export class ContactsComponent {

  total_contacts: number = 0;
  total_groups: number = 0;

  constructor(private router: Router) {}

  profile;
  ngOnInit(): void {
    this.profile = JSON.parse(localStorage.getItem('profile'));

    if (!this.profile) {
      this.router.navigate(['/apps/login']);
      return;
    }
  }

  onTotalContactsHandler(count: number) {
    this.total_contacts = count;
  }

  onTotalGroupsHandler(count: number) {
    this.total_groups = count;
  }


  
}

