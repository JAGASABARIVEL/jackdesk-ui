import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-individual-level',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartModule, SelectModule],
  templateUrl: './individual-level.component.html',
  styleUrls: ['./individual-level.component.scss']
})
export class IndividualLevelComponent {

  _productivityData: any = {};

  @Input()
  set productivityData(value: any) {
    this._productivityData = value || {};
    this.prepareAppUsageChart();
    this.prepareTimelineCharts();
    this.prepareTopUsageAppCharts();
  }

  _selectedDuration: number = 0;

  @Input()
  set selectedDuration(value: number) {
    this._selectedDuration = value;
    this.prepareIdlePieChart();
  }

  get selectedDuration() {
    return this._selectedDuration;
  }

  // === Chart Data ===
  appUsageChartData: any;
  barChartOptions: any;

  idlePieChartData: any;
  pieChartOptions: any;

  productivityLineChartData: any;
  productivityLineChartOptions: any;

  topAppsOverTimeChartData: any;
  topAppsOverTimeChartOptions: any;

  totalSummary: any;
  topN = 3;

  // === Charts ===

  /** Bar chart for Top Apps */
  prepareAppUsageChart() {
    const apps = this._productivityData.top_apps || [];
    const appLabels = apps.map(entry => entry.app_name + " - " + entry.window_title);
    const durations = apps.map(entry => entry.total_minutes);

    this.appUsageChartData = {
      labels: appLabels,
      datasets: [
        {
          label: 'Usage Duration (minutes)',
          backgroundColor: '#42A5F5',
          data: durations
        }
      ]
    };

    this.barChartOptions = {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${context.raw} min`
          }
        },
        title: {
          display: true,
          text: 'Top App Usage'
        }
      },
      scales: {
        x: { title: { display: true, text: 'Minutes' }, beginAtZero: true },
        y: { title: { display: true, text: 'Application' } }
      }
    };
  }

  /** Line chart for productivity over time */
  prepareTimelineCharts() {
    const timeline = this._productivityData.timeline || [];

    const labels = timeline.map(t =>
      new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );

    this.productivityLineChartData = {
      labels,
      datasets: [
        {
          label: 'Productive',
          data: timeline.map(t => t.productive_minutes),
          borderColor: '#4CAF50',
          fill: false,
          tension: 0.1
        },
        {
          label: 'Unproductive',
          data: timeline.map(t => t.unproductive_minutes),
          borderColor: '#F44336',
          fill: false,
          tension: 0.1
        },
        {
          label: 'Neutral',
          data: timeline.map(t => t.neutral_minutes),
          borderColor: '#FFC107',
          fill: false,
          tension: 0.1
        },
        {
          label: 'AFK',
          data: timeline.map(t => t.afk_minutes),
          borderColor: '#9E9E9E',
          fill: false,
          tension: 0.1
        }
      ]
    };

    this.productivityLineChartOptions = {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Productivity Over Time' },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { title: { display: true, text: 'Time' } },
        y: { title: { display: true, text: 'Minutes' }, beginAtZero: true }
      }
    };
  }

  /** Idle vs Active Pie Chart */
  prepareIdlePieChart() {
    if (!this._productivityData.summary || !this.selectedDuration) return;

    const s = this._productivityData.summary;
    const active = s.productive_minutes + s.unproductive_minutes + s.neutral_minutes;
    const idle = this.selectedDuration - active;

    this.idlePieChartData = {
      labels: ['Idle Time', 'Active Time'],
      datasets: [
        {
          data: [idle, active],
          backgroundColor: ['#FF6384', '#36A2EB'],
          hoverBackgroundColor: ['#FF6384', '#36A2EB']
        }
      ]
    };

    this.pieChartOptions = {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: 'Active vs Idle Time' }
      }
    };

    this.totalSummary = {
      active: `${Math.round(active)} min`,
      idle: `${Math.round(idle)} min`,
      selectedDuration: `${Math.round(this.selectedDuration)} min`
    };
  }

  /** Trends for Top N Apps */
  prepareTopUsageAppCharts() {
    const apps = this._productivityData.top_apps || [];

    const topApps = apps.slice(0, this.topN);

    this.topAppsOverTimeChartData = {
      labels: topApps.map(a => a.app_name),
      datasets: [
        {
          label: 'Usage (minutes)',
          data: topApps.map(a => a.total_minutes),
          borderColor: '#42A5F5',
          backgroundColor: '#90CAF9'
        }
      ]
    };

    this.topAppsOverTimeChartOptions = {
      responsive: true,
      plugins: {
        title: { display: true, text: `Top ${this.topN} Apps` }
      }
    };
  }
}
