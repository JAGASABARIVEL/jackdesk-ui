import { CommonModule } from '@angular/common';
import { Component, model, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { LoadingService } from './shared/services/loading.services';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { LayoutService } from './layout/service/app.layout.service';
import { SessionTimeoutDialogComponent } from './auth/session/session-timeout/session-timeout-dialog.component';
import { SessionTimeoutService } from './shared/services/session-timeout.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    SessionTimeoutDialogComponent
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
    private router: Router,
    private sessionService: SessionTimeoutService
  ) { }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.progressSpinnerSubscription.unsubscribe();
  }

  profile !: any;
  ngOnInit(): void {
    this.profile = JSON.parse(localStorage.getItem('profile'));
    if (this.profile) {
      this.router.navigate(['/apps/chat']);
      //this.sessionService.stopWatching();
      //this.sessionService.startWatching({
      //      idleTimeoutMs: 12 * 60 * 60 * 1000,   // 12 hours
      //      warningDurationMs: 60 * 1000,     // 60 second warning
      //    });
    }
    //this.initSates() // This would clear the old states
    //localStorage.clear() // This would clear old persistence For example, Handle page reload which would remove the profile and user would be take to login
    this.progressSpinnerSubscription = this.loadingService.loading$.pipe(takeUntil(this.destroy$)).subscribe(state => this.loading.set(state));
  }

  initSates() {
    //this.layoutService.clearNotifications();
    this.layoutService.menuItemsCache.update((prev)=>[]);
  }
}
