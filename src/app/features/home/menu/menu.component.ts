import { Component, EventEmitter, HostListener, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './menu.component.html',
    styleUrl: './menu.component.scss'
})
export class MenuComponent implements OnInit {

    @Output() selectedMenuoption: EventEmitter<any> = new EventEmitter();

    mobileMenuOpen = false;
    isScrolled = false;

    constructor(private router: Router) { }

    ngOnInit() {
        // Initialization if needed
    }

    @HostListener('window:scroll')
    onWindowScroll() {
        this.isScrolled = window.scrollY > 20;
    }

    toggleMobileMenu() {
        this.mobileMenuOpen = !this.mobileMenuOpen;
    }

    scrollToSection(sectionId: string) {
        this.selectedMenuoption.emit(sectionId);
        this.mobileMenuOpen = false;
    }

    navigateToLogin() {
        this.router.navigate(['/apps/login']);
        this.mobileMenuOpen = false;
    }
}