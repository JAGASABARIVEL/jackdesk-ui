import { Component, OnInit } from '@angular/core';
import { BadgeModule } from 'primeng/badge';
import { ComposeMessageComponent } from './compose-message/compose-message.component';
import { CrudSchedulesComponent } from './crud-schedules/crud-schedules.component';
import { MessageHistoryComponent } from './message-history/message-history.component';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TabsModule } from 'primeng/tabs';

@Component({
  selector: 'app-campaign',
  standalone: true,
  imports: [
    CommonModule,
    TabsModule,
    BadgeModule,

    ComposeMessageComponent,
    CrudSchedulesComponent,
    MessageHistoryComponent
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss'
})
export class CampaignComponent implements OnInit {

  failedMessageCounts: number = 0;
  total_schedules: number = 0;

  constructor(private router: Router) {}
  profile;
  ngOnInit(): void {
    this.profile = JSON.parse(localStorage.getItem('profile'));

    if (!this.profile) {
      this.router.navigate(['/apps/login']);
      return;
    }
  }

  onTotalSchedulesHandler(count: number) {
    this.total_schedules = count;
  }

  onFailedMessageHandler(count: number) {
    this.failedMessageCounts = count;
  }

}
