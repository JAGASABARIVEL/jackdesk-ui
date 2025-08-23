import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Email } from '../../../shared/models/mailbox.model';
import { MailboxService } from '../../../shared/services/mailbox.services';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-email-detail',
  standalone: true,
  imports: [
    CommonModule,

    AvatarModule,
    ButtonModule,
    DividerModule
  ],
  templateUrl: './email-detail.component.html'
})
export class EmailDetailComponent {
  email: Email | null = null;
  private destroy$ = new Subject<void>();


  constructor(
    private mailboxService: MailboxService
  ) {
    this.mailboxService.getSelectedEmail().subscribe(email => this.email = email);
  }
}
