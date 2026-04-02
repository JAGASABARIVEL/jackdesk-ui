import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionTimeoutService } from '../../../shared/services/session-timeout.service';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-session-timeout-dialog',
  templateUrl: './session-timeout-dialog.component.html',
  styleUrls: ['./session-timeout-dialog.component.scss'],
  imports: [
    CommonModule,
    DialogModule,
    ProgressBarModule,
    ButtonModule
  ]
})
export class SessionTimeoutDialogComponent implements OnInit, OnDestroy {
  visible = false;
  isExpired = false;
  remainingSeconds = 60;
  private destroy$ = new Subject<void>();

  constructor(
    public sessionService: SessionTimeoutService,
    private router: Router
) {}

  ngOnInit(): void {
    this.sessionService.showWarning$
      .pipe(takeUntil(this.destroy$))
      .subscribe(seconds => {
        this.remainingSeconds = seconds;
        this.visible = true;
        this.isExpired = false;
      });

    this.sessionService.forceLogout$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.visible = true;
        this.isExpired = true;
      });
  }

  acknowledgeExpiry(): void {
  this.visible = false;
  this.isExpired = false;
  this.router.navigate(['']); // navigate only after user clicks OK
}

  extend(): void {
    this.visible = false;
    this.sessionService.extendSession();
  }

  logout(): void {
    this.visible = false;
    this.sessionService.logout();
  }

  get progressValue(): number {
    return (this.remainingSeconds / 60) * 100;
  }

  get isUrgent(): boolean {
    return this.remainingSeconds <= 15;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}