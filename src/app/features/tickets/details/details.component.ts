import { Component } from '@angular/core';
import { LayoutService } from '../../../layout/service/app.layout.service';
import { Router } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-details',
  imports: [
    CommonModule,
    FormsModule,

    AvatarModule,
    ButtonModule,
    SelectModule
  ],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent {

  profile;
  ticketStates = [{'id': 0, 'name': "New"}, {'id': 1, 'name': "In Progress"}, {'id': 2, 'name': 'Closed'}]
  selectedTicketState = this.ticketStates[0]

  constructor(private router: Router, private layoutService: LayoutService) { }

  ngOnInit() {
    this.profile = JSON.parse(localStorage.getItem('profile'));
    if (!this.profile) {
      this.router.navigate(['/apps/login']);
      return;
    } else {
      this.layoutService.state.staticMenuDesktopInactive = true;
    }
  }
}
