import { Component } from '@angular/core';
import { MailFolder } from '../../../shared/models/mailbox.model';
import { MailboxService } from '../../../shared/services/mailbox.services';
import { CommonModule } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { AccountManagerComponent } from '../account-manager/account-manager.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    DrawerModule,
    ButtonModule,
    DividerModule,

    AccountManagerComponent
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  folders: MailFolder[] = [];
  menuVisible: boolean = false;

  constructor(public mailboxService: MailboxService) {
    this.folders = this.mailboxService.getFolders();
  }

  selectFolder(folder: MailFolder) {
    this.mailboxService.loadEmailsForFolder(folder);
  }
}
