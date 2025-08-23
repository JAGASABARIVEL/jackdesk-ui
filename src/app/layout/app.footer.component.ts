import { Component } from '@angular/core';
import { LayoutService } from "./service/app.layout.service";
import { ChatWidgetComponent } from '../features/home/chat-widget/chat-widget.component';

@Component({
    selector: 'app-footer',
    templateUrl: './app.footer.component.html'
})
export class AppFooterComponent {
    constructor(public layoutService: LayoutService) { }
}
