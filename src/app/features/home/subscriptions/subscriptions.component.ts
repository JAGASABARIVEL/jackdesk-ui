import { Component, OnDestroy, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SubscriptionPaymentManagerService } from '../../../shared/services/apps-subscription.services';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';


@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule
  ],
  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.scss'
})
export class SubscriptionsComponent implements OnInit, OnDestroy {

  availableSubscriptions !: any;
  private destroy$ = new Subject<void>();


  constructor(private router: Router, private subscriptionService: SubscriptionPaymentManagerService) { }

  ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}


  ngOnInit() {
    this.subscriptionService.list_all_suscriptions().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {this.availableSubscriptions = data; this.setupPlans();},
      error: (err) => console.error("Fteching of subscription failed ", err)
    })
  }

  
  freePlanDescription: string;
  freePlanPrice: string;
  freePlanFeatures: string[];

  enterprisePlanDescription: string;
  enterprisePlanPrice: string;
  enterprisePlanFeatures: string[];


  setupPlans() {
    // Free plan is 'manage_files'
    const freePlan = this.availableSubscriptions.find(sub => sub.app === 'manage_files');
    if (freePlan) {
      this.freePlanDescription = freePlan.description;
      this.freePlanPrice = '0';
      this.freePlanFeatures = freePlan.metadata.features;
    }

    // Enterprise plan includes all subscriptions
    this.enterprisePlanDescription = '*Includes all features from community plan';
    this.enterprisePlanPrice = '8000';  // Adjust this as needed
    this.enterprisePlanFeatures = this.availableSubscriptions.reduce((acc, sub) => {
      return acc.concat(sub.metadata.features);
    }, []);
  }

  onBuyNowClick() {
    this.router.navigate(["/apps/login"]);
    return;
  }

}
