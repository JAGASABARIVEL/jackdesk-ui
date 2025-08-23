import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule, InputTextModule, ButtonModule, DividerModule],
  templateUrl: './header.component.html'
})
export class HeaderComponent {
  @Output() searchQuery = new EventEmitter<string>();
  @Output() compose = new EventEmitter<void>();

  search: string = '';

  constructor(
    private router: Router,
  ) { }

  onSearchChange() {
    this.searchQuery.emit(this.search);
  }

  onCloseMailbox() {
    this.router.navigate(["/apps"])
  }
}
