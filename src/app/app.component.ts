import { CommonModule } from '@angular/common';
import { Component, model, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingService } from './shared/services/loading.services';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { AppLayoutComponent } from './layout/app.layout.component';
import { LayoutService } from './layout/service/app.layout.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'JackDesk';
  private destroy$ = new Subject<void>();

  loading = model(false);
  progressSpinnerSubscription: Subscription;

  constructor(
    private loadingService: LoadingService,
    private layoutService: LayoutService,
  ) { }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.progressSpinnerSubscription.unsubscribe();
  }

  ngOnInit(): void {
    //this.initSates() // This would clear the old states
    //localStorage.clear() // This would clear old persistence For example, Handle page reload which would remove the profile and user would be take to login
    this.progressSpinnerSubscription = this.loadingService.loading$.pipe(takeUntil(this.destroy$)).subscribe(state => this.loading.set(state));
  }

  initSates() {
    //this.layoutService.clearNotifications();
    this.layoutService.menuItemsCache.update((prev)=>[]);
  }
}
