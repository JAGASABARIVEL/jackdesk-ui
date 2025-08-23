import { Component } from '@angular/core';
import { SidebarComponent } from './sidebar/sidebar.component';
import { EmailListComponent } from './email-list/email-list.component';
import { EmailDetailComponent } from './email-detail/email-detail.component';
import { HeaderComponent } from './header/header.component';
import { ComposeEmailComponent } from './compose-email/compose-email.component';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-mailbox',
  standalone: true,
  imports: [

    ButtonModule,

    HeaderComponent,
    SidebarComponent,
    EmailListComponent,
    EmailDetailComponent,
    ComposeEmailComponent
  ],
  templateUrl: './mailbox.component.html',
  styleUrls: ['./mailbox.component.css']
})
export class MailboxComponent {

  onSearch(event) {
    console.log("Mailbox | onSearch ", event);
  }

  onEmailSent(event) {
    console.log("Mailbox | onEmailSent ", event);
  }
}
