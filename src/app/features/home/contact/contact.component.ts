import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { environment } from '../../../../environment'

@Component({
  selector: 'app-contact-address',
  standalone: true,
  imports: [
    ButtonModule
  ],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactOfficeComponent {
}
