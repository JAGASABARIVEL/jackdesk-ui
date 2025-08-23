import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LayoutService } from '../../../layout/service/app.layout.service';

@Component({
  selector: 'app-create',
  imports: [],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss'
})
export class CreateComponent {

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
