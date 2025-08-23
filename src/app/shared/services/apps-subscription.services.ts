import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HOST } from '../../../environment'

@Injectable({
  providedIn: 'root'
})
export class SubscriptionPaymentManagerService {

  manage_subscripotions_url = `${HOST}/subscriptions/`
  subscribe_uri = "active";
  payment_uri = "payment"
  profile;

  constructor(private http: HttpClient) { }

  list_all_suscriptions() {
    return this.http.get(`${this.manage_subscripotions_url}subscriptions`);
  }

  start_subscription(payload={}) {
    return this.http.post(`${this.manage_subscripotions_url}${this.subscribe_uri}`, payload=payload);
  }

  start_payment(payload={}) {
    return this.http.post(`${this.manage_subscripotions_url}${this.payment_uri}`, payload=payload);
  }

}