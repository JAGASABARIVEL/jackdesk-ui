import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { environment, HOST } from '../../../../environment';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-account-manager',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DropdownModule,
    TagModule
  ],
  templateUrl: './account-manager.component.html',
  styleUrl: './account-manager.component.scss'
})
export class AccountManagerComponent {

  constructor(private router: Router) { }

  accounts = [
    { email: 'john@example.com', synced: true },
    { email: 'alice@example.com', synced: false }
  ];
  selectedAccount = this.accounts[0];

  addAccount() {
    const gmailOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `scope=https://www.googleapis.com/auth/gmail.readonly%20https://www.googleapis.com/auth/gmail.send&` +
      `access_type=offline&` + // this gives refresh token
      `include_granted_scopes=true&` +
      `response_type=code&` +
      `redirect_uri=${HOST}/users/api/gmail/oauth/callback&` +
      `client_id=${environment.googleClientId}&prompt=consent`;

    //this.router.navigate([gmailOAuthUrl])

    window.location.href = gmailOAuthUrl; // redirect user
  }

}
