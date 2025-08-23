import { Component } from '@angular/core';
import { HeroComponent } from './hero/hero.component';
import { SolutionsComponent } from './solutions/solutions.component';
import { SubscriptionsComponent } from './subscriptions/subscriptions.component';
import { BannerComponent } from './banner/banner.component';
import { RoadMapComponent } from './roadmap/roadmap.component';
import { MenuComponent } from './menu/menu.component';
import { ContactOfficeComponent } from './contact/contact.component';
import { ScreenshotsComponent } from './screenshots/screenshots.component';
import { ChatWidgetComponent } from './chat-widget/chat-widget.component';

@Component({
  selector: 'app-home',
  imports: [
    BannerComponent,
    MenuComponent,
    HeroComponent,
    SolutionsComponent,
    SubscriptionsComponent,
    RoadMapComponent,
    ContactOfficeComponent,
    ScreenshotsComponent,
    ChatWidgetComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

  

  scrollToSection(sectionId: any) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

}
