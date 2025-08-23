import { Component, EventEmitter, HostListener, OnInit, Output } from '@angular/core';
import { MegaMenuItem } from 'primeng/api';
import { MegaMenu } from 'primeng/megamenu';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { RippleModule } from 'primeng/ripple';
import { Router } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [MegaMenu, ButtonModule, CommonModule, RippleModule, PanelMenuModule ],
    templateUrl: './menu.component.html',
    styleUrl: './menu.component.scss'
})
export class MenuComponent implements OnInit {

    @Output() selectedMenuoption: EventEmitter<any> = new EventEmitter();

    items: MegaMenuItem[] | undefined;

    isMobile = false;

    constructor(private router: Router) { }
    ngOnInit() {
        this.items = [
            {
                label: 'Home',
                icon: "pi pi-home",
                root: true
            },
            {
                label: 'Products',
                icon: "pi pi-shop",
                root: true,
                items: [
                    [
                        {
                            items: [
                                {
                                    label: 'Marketing',
                                    icon: 'pi pi-megaphone',
                                    subtext: 'Create and schedule WhatsApp campaigns with whatsapp message templates to reach customers effectively.'
                                }
                            ]
                        }
                    ],
                    [
                        {
                            items: [
                                {
                                    label: 'Conversation',
                                    icon: 'pi pi-comments',
                                    subtext: 'Manage customer chats, assign conversations to team members, and track responses from a unified dashboard.'
                                }
                            ]
                        }
                    ],
                    [
                        {
                            items: [
                                {
                                    label: 'Cloud Storage',
                                    icon: 'pi pi-server',
                                    subtext: 'Securely store and organize attachments from customers and employees with easy access and file sharing.'
                                }
                            ]
                        }
                    ],
                    [
                    {
                        items: [{ image: 'https://primefaces.org/cdn/primeng/images/uikit/uikit-system.png', label: 'GET STARTED', subtext: 'Connect with clients in no time.' }]
                    }
                    ]
                ]
            },
            {
                label: 'Downloads',
                icon: "pi pi-download",
                root: true,
                items: [
                    [
                        {
                            items: [
                                {
                                    label: 'JackWatch Desktop',
                                    icon: 'pi pi-eye',
                                    subtext: 'Measure your productivity.'
                                },
                                {
                                    label: 'JackConnect Desktop',
                                    icon: 'pi pi-eye',
                                    subtext: 'Connect your accounts with any custom server to help sync your data.'
                                },
                            ]
                        }
                    ],
                ]
            },
            {
                label: 'Pricing',
                icon: "pi pi-indian-rupee",
                root: true
            },
            {
                label: 'Contact',
                icon: "pi pi-phone",
                root: true
            },
            {
                label: 'Join',
                icon: "pi pi-user",
                root: true,
            }
        ];
        
    }


    @HostListener('window:resize')
    onResize() {
      this.isMobile = window.innerWidth <= 768;
    }

    downloadJackWatchInstallerApplicationDesktop() {
  window.open("https://s3.us-east-1.amazonaws.com/jackdesk.com/desktop-apps/JackWatchInstaller.exe", "_blank");
}

downloadJackConnectApplicationDesktop() {
  window.open("https://s3.us-east-1.amazonaws.com/jackdesk.com/desktop-apps/JackConnect.exe", "_blank");
}
    

    onMenuSelect(item) {
        switch (item?.label) {
            case "JackWatch Desktop":
                this.downloadJackWatchInstallerApplicationDesktop();
                break;
            case "JackConnect Desktop":
                this.downloadJackConnectApplicationDesktop();
                break;
            case "Contact":
                this.selectedMenuoption.emit("contact");
                break;
            case "Pricing":
                this.selectedMenuoption.emit("subscriptions");
                break;
            case "GET STARTED":
                this.selectedMenuoption.emit("subscriptions");
                break;
            case "Join":
                this.router.navigate(['/apps/login']);
                break;
        }
    }
}