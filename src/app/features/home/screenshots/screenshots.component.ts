import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { environment } from '../../../../environment'

@Component({
  selector: 'app-screenshots',
  standalone: true,
  imports: [
    ButtonModule
  ],
  templateUrl: './screenshots.component.html',
  styleUrl: './screenshots.component.scss'
})
export class ScreenshotsComponent {
}
