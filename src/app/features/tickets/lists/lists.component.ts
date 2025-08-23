import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LayoutService } from '../../../layout/service/app.layout.service';

@Component({
  selector: 'app-lists',
  imports: [],
  templateUrl: './lists.component.html',
  styleUrl: './lists.component.scss'
})
export class ListsComponent {

  profile;

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
