import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HOST } from '../../../environment';

@Injectable({
  providedIn: 'root'
})
export class EnhancedProductivityService {
  private baseUrl = `${HOST}/productivity`;

  constructor(private http: HttpClient) {}

  /**
   * Get comprehensive analytics for a user including focus time,
   * context switching, efficiency score, and actionable insights
   */
  getEnhancedUserAnalytics(userId: number, startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('start', startDate);
    if (endDate) params = params.set('end', endDate);

    return this.http.get(`${this.baseUrl}/analytics/user/${userId}`, { params });
  }

  /**
   * Get team-wide productivity trends and benchmarks
   */
  getTeamProductivityTrends(startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('start', startDate);
    if (endDate) params = params.set('end', endDate);

    return this.http.get(`${this.baseUrl}/analytics/team/trends`, { params });
  }

  /**
   * Get productivity goals and progress tracking
   */
  getProductivityGoals(startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('start', startDate);
    if (endDate) params = params.set('end', endDate);

    return this.http.get(`${this.baseUrl}/analytics/goals`, { params });
  }

  /**
   * Get detailed idle time analysis for a user
   */
  getIdleTimeAnalysis(userId: number, startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('start', startDate);
    if (endDate) params = params.set('end', endDate);

    return this.http.get(`${this.baseUrl}/analytics/idle/${userId}`, { params });
  }

  /**
   * Get idle time heatmap for a user
   */
  getIdleTimeHeatmap(userId: number, startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('start', startDate);
    if (endDate) params = params.set('end', endDate);

    return this.http.get(`${this.baseUrl}/analytics/idle/heatmap/${userId}`, { params });
  }

  /**
   * Get team-wide idle time comparison
   */
  getTeamIdleComparison(startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('start', startDate);
    if (endDate) params = params.set('end', endDate);

    return this.http.get(`${this.baseUrl}/analytics/team/idle`, { params });
  }

  /**
   * Get real-time activity status of all team members
   */
  getRealtimeStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/analytics/realtime/status`);
  }

  /**
   * Existing methods (keeping for backward compatibility)
   */
  employee_productivity(userId: number, startDate: string, endDate: string): Observable<any> {
    const params = new HttpParams()
      .set('start', startDate)
      .set('end', endDate);
    
    return this.http.get(`${this.baseUrl}/employee/${userId}`, { params });
  }

  leaderboard_productivity(startDate: string, endDate: string): Observable<any> {
    const params = new HttpParams()
      .set('start', startDate)
      .set('end', endDate);
    
    return this.http.get(`${this.baseUrl}/summary`, { params });
  }

  my_summary(startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('start', startDate);
    if (endDate) params = params.set('end', endDate);

    return this.http.get(`${this.baseUrl}/my_summary`, { params });
  }

  app_usage_summary(startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('start', startDate);
    if (endDate) params = params.set('end', endDate);

    return this.http.get(`${this.baseUrl}/apps`, { params });
  }


  // Attendance tracking
  getAttendanceSummary(userId: number, startDate: string, endDate: string): Observable<any> {
    const params = new HttpParams()
      .set('start', startDate)
      .set('end', endDate);
    return this.http.get(`${this.baseUrl}/payroll/attendance/${userId}`, { params });
  }

  // Login/Logout statistics
  getLoginLogoutStats(userId: number, startDate: string, endDate: string): Observable<any> {
    const params = new HttpParams()
      .set('start', startDate)
      .set('end', endDate);
    return this.http.get(`${this.baseUrl}/payroll/login-stats/${userId}`, { params });
  }

  // Weekly breakdown
  getWeeklyBreakdown(userId: number, startDate: string, endDate: string): Observable<any> {
    const params = new HttpParams()
      .set('start', startDate)
      .set('end', endDate);
    return this.http.get(`${this.baseUrl}/payroll/weekly/${userId}`, { params });
  }

  // Team payroll summary
  getTeamPayrollSummary(startDate: string, endDate: string): Observable<any> {
    const params = new HttpParams()
      .set('start', startDate)
      .set('end', endDate);
    return this.http.get(`${this.baseUrl}/payroll/team-summary`, { params });
  }

  // User detail (existing)
  getUserDetail(userId: number, startDate: string, endDate: string): Observable<any> {
    const params = new HttpParams()
      .set('start', startDate)
      .set('end', endDate);
    return this.http.get(`${this.baseUrl}/employee/${userId}`, { params });
  }

  // User app usage (NEW)
  getUserAppUsage(userId: number, startDate: string, endDate: string): Observable<any> {
    const params = new HttpParams()
      .set('start', startDate)
      .set('end', endDate);
    return this.http.get(`${this.baseUrl}/app-usage/${userId}`, { params });
  }
}
