import { Component, OnDestroy, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SubscriptionPaymentManagerService } from '../../shared/services/apps-subscription.services';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProgressBarModule } from 'primeng/progressbar';
import { Subject, takeUntil } from 'rxjs';
import { SessionTimeoutService } from '../../shared/services/session-timeout.service';

@Component({
  selector: 'app-subscription-payment',
  imports: [
    CommonModule,

    ButtonModule,
    ToastModule,
    ProgressBarModule
  ],
  providers: [MessageService],
  templateUrl: './subscription.component.html',
  styleUrl: './subscription.component.scss'
})
export class SubscriptionAndPaymentComponent implements OnInit, OnDestroy {

    profile;
    logoutProgress = false;
    subscriptionStatus !: string;
    private destroy$ = new Subject<void>();


    constructor(
        private router: Router,
        private messageService: MessageService,
        private appSubscriptionService: SubscriptionPaymentManagerService,
        private sessionService: SessionTimeoutService,
    ) { }
    
    ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}


    ngOnInit(): void {
        this.profile = JSON.parse(localStorage.getItem('profile'));
        if (!this.profile) {
         this.router.navigate(['/apps/login']);
          return;
        }
        this.subscriptionStatus = !this.profile.user.is_subscription_complete? "Subscription has expired or not yet subscribed" : undefined
        this.subscriptionStatus = this.subscriptionStatus && !this.profile.user.is_payment_complete? "Payment is pending" : this.subscriptionStatus
    }

    start_subscription() {
        this.appSubscriptionService.start_subscription().pipe(takeUntil(this.destroy$)).subscribe(
            {
                next: () => {
                    this.appSubscriptionService.start_payment().pipe(takeUntil(this.destroy$)).subscribe(
                        {
                            next: () => {
                                this.logoutProgress = true;
                                setTimeout(() => {
                                    this.sessionService.stopWatching()
                                    localStorage.clear();
                                    this.logoutProgress = false;
                                    this.router.navigate([""]);
                                    return;
                                }, 2000);
                            },
                            error: (err) => {this.addToast("err", `Error while paying for subscription`);}
                        }
                    )
                },
                error: (err) => {this.addToast("err", `Error while subscribing for service`);}
            }
        );
    }

    addToast(category, msg) {
        switch (category) {
            case "err":
                this.messageService.add({ severity: 'error', summary: category, detail: msg, sticky: true });
                break;
            case "info":
                this.messageService.add({ severity: 'info', summary: category, detail: msg });
                break;
        }
        
    }

}
