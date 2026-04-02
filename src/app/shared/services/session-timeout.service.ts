import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface SessionConfig {
  idleTimeoutMs: number;      // e.g. 15 * 60 * 1000 (15 min)
  warningDurationMs: number;  // e.g. 60 * 1000 (60 sec countdown)
}

@Injectable({ providedIn: 'root' })
export class SessionTimeoutService implements OnDestroy {
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private destroy$ = new Subject<void>();

  // Stream that the dialog component subscribes to
  showWarning$ = new Subject<number>(); // emits remaining seconds
  forceLogout$ = new Subject<void>();

  private config: SessionConfig = {
    idleTimeoutMs: 12 * 60 * 60 * 1000,   // 12 hours
    warningDurationMs: 60 * 1000,
  };

  private readonly ACTIVITY_EVENTS = [
    'mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click'
  ];

  private warningIntervalSub: Subscription | null = null;
  private isWarningActive = false;

  constructor(private router: Router, private ngZone: NgZone) {}

  /**
   * Call this after successful login.
   */
  startWatching(config?: Partial<SessionConfig>): void {
    if (config) this.config = { ...this.config, ...config };
    this.unbindActivityListeners();
    this.bindActivityListeners();
    this.resetIdleTimer();
  }

  /**
   * Call this on logout or route guards.
   */
  stopWatching(): void {
    this.clearIdleTimer();
    this.unbindActivityListeners();
    this.stopWarningCountdown();
  }

  /**
   * Called when user clicks "Extend Session" in the dialog.
   */
  extendSession(): void {
    this.stopWarningCountdown();
    this.isWarningActive = false;
    this.bindActivityListeners();
    this.resetIdleTimer();
  }

  /**
   * Called when user clicks "Logout" in the dialog or timer runs out.
   */
  logout(): void {
    this.isWarningActive = false;
    this.stopWatching();
    localStorage.removeItem('profile'); // adjust key to yours
    //this.router.navigate(['/login']);
  }

  private resetIdleTimer(): void {
  this.clearIdleTimer();
  this.ngZone.runOutsideAngular(() => {
    this.idleTimer = setTimeout(() => {
      this.ngZone.run(() => this.onIdleTimeout());
    }, this.config.idleTimeoutMs); // ← full duration, no subtraction
  });
}

private onIdleTimeout(): void {
  if (this.isWarningActive) return;
  this.isWarningActive = true;
  this.unbindActivityListeners();
  this.startWarningCountdown(); // this owns the warningDurationMs window
}

  private startWarningCountdown(): void {
    let remaining = Math.floor(this.config.warningDurationMs / 1000);
    this.showWarning$.next(remaining);

    this.warningIntervalSub = interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        remaining--;
        this.showWarning$.next(remaining);
        if (remaining <= 0) {
          this.stopWarningCountdown();
          this.forceLogout$.next();
          this.logout();
        }
      });
  }

  private stopWarningCountdown(): void {
    this.warningIntervalSub?.unsubscribe();
    this.warningIntervalSub = null;
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private boundActivityHandler = () => this.onUserActivity();

  private bindActivityListeners(): void {
    this.ngZone.runOutsideAngular(() => {
      this.ACTIVITY_EVENTS.forEach(event =>
        document.addEventListener(event, this.boundActivityHandler, { passive: true })
      );
    });
  }

  private unbindActivityListeners(): void {
    this.ACTIVITY_EVENTS.forEach(event =>
      document.removeEventListener(event, this.boundActivityHandler)
    );
  }

  private onUserActivity(): void {
    if (!this.isWarningActive) {
      this.ngZone.run(() => this.resetIdleTimer());
    }
  }

  ngOnDestroy(): void {
    this.stopWatching();
    this.destroy$.next();
    this.destroy$.complete();
  }
}