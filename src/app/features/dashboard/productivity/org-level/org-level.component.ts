import { Component, Input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';

@Component({
  selector: 'app-org-level',
  imports: [
    ChartModule,
    TableModule,
    ButtonModule,
    ToolbarModule,
    InputGroupAddonModule,
    InputGroupModule,
    InputTextModule,
  ],
  templateUrl: './org-level.component.html',
  styleUrl: './org-level.component.scss'
})
export class OrgLevelComponent {

  

_productivityData = []

@Input()
set productivityData(value) {
  this._productivityData = value;
  this.prepareScoreChart();
  this.prepareStackedTimeChart();

}


onSearchInput(event: Event, dt: Table): void {
    const inputElement = event.target as HTMLInputElement;
    const searchValue = inputElement.value;
    dt.filterGlobal(searchValue, 'contains');
  }

  scoreChartData: any;
barOptions: any;

ngOnInit() {
  
}


prepareScoreChart() {
  const users = this._productivityData.map(x => x.user);
  const scores = this._productivityData.map(x => x.score);

  this.scoreChartData = {
    labels: users,
    datasets: [
      {
        label: 'Score',
        backgroundColor: '#42A5F5',
        data: scores
      }
    ]
  };

  this.barOptions = {
    indexAxis: 'y',
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { title: { display: true, text: 'Score' }, beginAtZero: true },
      y: { title: { display: true, text: 'User' } },
    },
    responsive: true
  };
}

timeChartData: any;
stackedOptions: any;

prepareStackedTimeChart() {
  const users = this._productivityData.map(x => x.user);
  const productive = this._productivityData.map(x => x.productive_time_minutes);
  const afk = this._productivityData.map(x => x.afk_time_minutes);

  this.timeChartData = {
    labels: users,
    datasets: [
      {
        label: 'Productive',
        backgroundColor: '#66BB6A',
        data: productive
      },
      {
        label: 'Idle',
        backgroundColor: '#EF5350',
        data: afk
      }
    ]
  };

  this.stackedOptions = {
    indexAxis: 'y',
    plugins: {
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    responsive: true,
    scales: {
      
      x: {
        stacked: true,
        title: { display: true, text: 'Minutes' },
        beginAtZero: true
      },
      y: {
        stacked: true,
        title: { display: true, text: 'User' }
      },
    }
  };
}



downloadCSV() {
  const header = ['User', 'Productive Time (min)', 'AFK Time (min)', 'Score'];
  const rows = this._productivityData.map(row => [
    row.user,
    row.productive_time_minutes,
    row.afk_time_minutes,
    row.score
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [header, ...rows]
      .map(e => e.map(String).map(x => `"${x}"`).join(','))
      .join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `jackdesk_leaderboard_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}



}
