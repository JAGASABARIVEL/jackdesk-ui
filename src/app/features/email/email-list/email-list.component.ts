import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { Email } from '../../../shared/models/mailbox.model';
import { MailboxService } from '../../../shared/services/mailbox.services';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-email-list',
  standalone: true,
  imports: [CommonModule, TableModule],
  templateUrl: './email-list.component.html',
})
export class EmailListComponent {
  emails: Email[] = [];
  private destroy$ = new Subject<void>();


  constructor(public mailboxService: MailboxService) {
    this.mailboxService.getEmails().subscribe(data => this.emails = data);
  }

  onSelect(email: Email) {
    this.mailboxService.selectEmail(email);
  }

  isToday(dateStr: string | Date): boolean {
    const date = new Date(dateStr);
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }
}
