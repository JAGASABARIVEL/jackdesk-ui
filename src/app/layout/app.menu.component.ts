import { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { LayoutService } from './service/app.layout.service';
import { AppMenuitemComponent } from './app.menuitem.component';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
    selector: 'app-menu',
    templateUrl: './app.menu.component.html',
    standalone: true,
    imports: [
        CommonModule,
        AppMenuitemComponent
    ]
})
export class AppMenuComponent implements OnInit {

    model: any[] = [];

    constructor(private router: Router, public layoutService: LayoutService) { }

    profile;

    ngOnInit() {

        this.profile = JSON.parse(localStorage.getItem('profile'));
        if (!this.profile) {
            this.router.navigate(['/apps/login']);
            return;
        }
        let individualMenuItems = [
            {
                label: 'File Storage',
                icon: 'pi pi-server',
                routerLink: ['/apps/fmanager']
            }
        ]
        let enterpriseMenuItems = [
            {
                label: 'Dashboard',
                icon: 'pi pi-chart-bar',
                items: [
                  {
                    label: 'Productivity',
                    icon: 'pi pi-stopwatch',
                    routerLink: ['/apps/productivity'],
                  }
                ]
            },
            {
                label: 'Contact',
                icon: 'pi pi-address-book',
                routerLink: ['/apps/contact']
            },
            {
                label: 'Campaign',
                icon: 'pi pi-megaphone',
                routerLink: ['/apps/campaign']
            },
            {
                label: 'Conversation',
                icon: 'pi pi-comment',
                routerLink: ['/apps/chat']
            },
            {
                label: 'Drive',
                icon: 'pi pi-server',
                routerLink: ['/apps/fmanager']
            }
        ];

        if (this.profile.user.role !== 'individual') {
            this.model = [
                {
                    items: enterpriseMenuItems
                }
            ];
        }
        if (this.profile.user.role === 'individual') {
            this.model = [
                {
                    items: individualMenuItems
                }
            ];
        }

        
    }
}
