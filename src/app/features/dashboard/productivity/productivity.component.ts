import { CommonModule, formatDate } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { IndividualLevelComponent } from './individual-level/individual-level.component';
import { Router } from '@angular/router';
import { OrgLevelComponent } from './org-level/org-level.component';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UserManagerService } from '../../../shared/services/user-manager.service';
import { ProductivityService } from '../../../shared/services/productivity.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-productivity',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IndividualLevelComponent,
    OrgLevelComponent,

    TabsModule,
    ButtonModule,
        ToolbarModule,
        SelectModule,
        DatePickerModule,
  ],
  templateUrl: './productivity.component.html',
  styleUrl: './productivity.component.scss'
})
export class ProductivityComponent implements OnInit, OnDestroy {


  profile !: any;
  employeeProductivityData = null
  private destroy$ = new Subject<void>();


leaderboardData = null;

  fromDates: Date;
  toDates: Date;
  selected_duration;
  selected_user = undefined;

  constructor(private router: Router, private userManagerService: UserManagerService, private productivityService: ProductivityService) { }

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
    else {
      this.loadEmployees();
    }
  }

  registeredUsers = []
  loadEmployees() {
    this.userManagerService.list_users().pipe(takeUntil(this.destroy$)).subscribe(data => {
      this.registeredUsers = data;
    });
  }

  
  getProductivityData() {
    this.employeeProductivityData = null
    this.leaderboardData = null
    this.selected_duration = null;

    const fromDate = this.fromDates.toISOString(); //formatDate(this.fromDates), 'yyyy-MM-dd HH:mm:ss', 'en-IN');
    const toDate = this.toDates.toISOString();//formatDate(this.toDates, 'yyyy-MM-dd HH:mm:ss', 'en-IN');

    const fromDateRaw = this.fromDates; //formatDate(this.fromDates), 'yyyy-MM-dd HH:mm:ss', 'en-IN');
    const toDateRaw = this.toDates;//formatDate(this.toDates, 'yyyy-MM-dd HH:mm:ss', 'en-IN');
    // Get the difference in milliseconds
    const diffMs = toDateRaw.getTime() - fromDateRaw.getTime();
    // Convert to seconds
    this.selected_duration = diffMs / 1000;
    this.selected_duration = diffMs / (1000 * 60);   // store in minutes

    this.productivityService.employee_productivity(this.selected_user, fromDate, toDate).pipe(takeUntil(this.destroy$)).subscribe(
      {
        next: (data) => {this.employeeProductivityData = data; console.log("Productivity Data ", data)},
        error: () => console.error("Could not get productivity data")
      }
    )

    this.productivityService.leaderboard_productivity(fromDate, toDate).pipe(takeUntil(this.destroy$)).subscribe(
      {
        next: (data) => this.leaderboardData = data,
        error: () => console.error("Could not get productivity data")
      }
    )

  }






}
