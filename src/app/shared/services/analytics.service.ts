// shared/services/analytics.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HOST } from '../../../environment';

export interface MarketingDashboard {
  summary: {
    total_conversations: number;
    active_campaigns: number;
    avg_response_time: number;
    conversion_rate: number;
  };
  by_campaign: Array<{
    campaign_id: string;
    source: string;
    total: number;
    converted: number;
  }>;
  product_interest: Array<{
    product__name: string;
    product__id: number;
    count: number;
  }>;
}

export interface SalesDashboard {
  summary: {
    total_conversations: number;
    pipeline_value: number;
    avg_deal_size: number;
    win_rate: number;
  };
  pipeline: {
    by_stage: Array<{
      status: string;
      count: number;
      value: number;
    }>;
  };
  top_products: Array<{
    product__name: string;
    deal_count: number;
    total_value: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private baseUrl = `${HOST}/conversations/context/dashboard`;
  
  constructor(private http: HttpClient) {}
  
  getMarketingDashboard(days: number = 30): Observable<MarketingDashboard> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<MarketingDashboard>(`${this.baseUrl}/marketing/`, { params });
  }
  
  getSalesDashboard(days: number = 30): Observable<SalesDashboard> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<SalesDashboard>(`${this.baseUrl}/sales/`, { params });
  }
  
  getSupportDashboard(days: number = 30): Observable<any> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<any>(`${this.baseUrl}/support/`, { params });
  }
}