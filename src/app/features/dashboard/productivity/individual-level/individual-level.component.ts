import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-individual-level',
  imports: [
    CommonModule,
    FormsModule,
    ChartModule,
    SelectModule
  ],
  templateUrl: './individual-level.component.html',
  styleUrl: './individual-level.component.scss'
})
export class IndividualLevelComponent {

_productivityData: any = {}

@Input()
set productivityData(value) {
  this._productivityData = value;
  this.prepareAppUsageChart();
  this.prepareIdleAppUsageLineChart();
  this.prepareProductivityCharts();
  this.prepareTopUsageAppCharts();
}


_selectedDuration: any = {}

@Input()
set selectedDuration(value) {
  this._selectedDuration = value;
  this.prepareIdlePieChart();
  this.prepareProductivityCharts();
}

get selectedDuration() {
  return this._selectedDuration;
}

ngOnInit() {
  
}

appUsageChartData: any;
barChartOptions: any;
prepareAppUsageChart() {
  const appUsage = this._productivityData.app_usage

  const appLabels = appUsage.map(entry => entry.app_name + " - " + entry.window_title);
  const durations = appUsage.map(entry => entry.duration);

  this.appUsageChartData = {
    labels: appLabels,
    datasets: [
      {
        label: 'Usage Duration (minutes)',
        backgroundColor: '#42A5F5',
        data: durations.map(d => +(d / 60).toFixed(2)) // Convert to minutes
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
        label: function (context) {
          return `${context.dataset.label}: ${context.raw} min`;
        }
      }
    },
    title: {
      display: true,
      text: 'App usage distribution'
    },
  },
  scales: {
    x: { title: { display: true, text: 'Minutes' }, beginAtZero: true },
    y: { title: { display: true, text: 'Application' } },
  }
};

}


idleAppLineChartData: any;
lineAppChartOptions: any;
prepareIdleAppUsageLineChart() {
  const afkEvents = this._productivityData.afk_events || [];
  const appUsage = this._productivityData.app_usage || [];

  // STEP 1: Determine time range
  const allTimestamps = [
    ...afkEvents.map(e => new Date(e.start_time).getTime()),
    ...appUsage.map(e => new Date(e.start_time).getTime())
  ];
  const minTime = Math.min(...allTimestamps);
  const maxTime = Math.max(...allTimestamps);

  const intervalMs = 60 * 1000; // 1 minute interval
  const timeline: number[] = [];
  for (let t = minTime; t <= maxTime; t += intervalMs) {
    timeline.push(t);
  }

  const timeLabels = timeline.map(ts =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  // STEP 2: Prepare datasets
  const idleDurations: number[] = [];
  const activeDurations: number[] = [];
  const activeAppTitlesPerSlot: string[] = [];

  timeline.forEach(ts => {
    const nextTs = ts + intervalMs;

    // === IDLE TIME: Collect & Merge Overlapping AFK Segments ===
    const afkSegments: { start: number, end: number }[] = [];

    afkEvents.forEach(afk => {
      if (!afk.is_afk) return;

      const start = new Date(afk.start_time).getTime();
      const end = start + afk.duration * 1000;

      // If the AFK overlaps with this slot
      if (start < nextTs && end > ts) {
        afkSegments.push({
          start: Math.max(start, ts),
          end: Math.min(end, nextTs)
        });
      }
    });

    // Merge overlapping segments
    afkSegments.sort((a, b) => a.start - b.start);
    const mergedSegments: { start: number, end: number }[] = [];

    for (const seg of afkSegments) {
      if (mergedSegments.length === 0) {
        mergedSegments.push(seg);
      } else {
        const last = mergedSegments[mergedSegments.length - 1];
        if (seg.start <= last.end) {
          last.end = Math.max(last.end, seg.end); // merge
        } else {
          mergedSegments.push(seg);
        }
      }
    }

    // Sum non-overlapping AFK time
    const totalAfkMs = mergedSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
    idleDurations.push(+(totalAfkMs / 60000).toFixed(2)); // convert to minutes

    // === ACTIVE APP USAGE ===
    const activeApps = appUsage.filter(app => {
      const appStart = new Date(app.start_time).getTime();
      const appEnd = appStart + app.duration * 1000;
      return appStart < nextTs && appEnd > ts;
    });

    const activeDurationSec = activeApps.reduce((sum, app) => {
      const appStart = new Date(app.start_time).getTime();
      const appEnd = appStart + app.duration * 1000;
      const overlapStart = Math.max(appStart, ts);
      const overlapEnd = Math.min(appEnd, nextTs);
      return sum + Math.max(0, overlapEnd - overlapStart);
    }, 0);

    const activeDurationMin = +(activeDurationSec / 60000).toFixed(2);
    activeDurations.push(activeDurationMin);

    const titles = activeApps.map(app =>
      `${app.app_name} - ${app.window_title} (${(app.duration / 60).toFixed(2)} min)`
    );
    activeAppTitlesPerSlot.push(titles.join('\n') || 'No active apps');
  });

  // STEP 3: Plot line chart
  this.idleAppLineChartData = {
    labels: timeLabels,
    datasets: [
      {
        label: 'Idle Time (min)',
        data: idleDurations,
        borderColor: '#FF6384',
        fill: false,
        tension: 0.1
      },
      {
        label: 'Active App Usage (min)',
        data: activeDurations,
        borderColor: '#4BC0C0',
        fill: false,
        tension: 0.1
      }
    ]
  };

  this.lineAppChartOptions = {
    responsive: true,
    scales: {
      x: { title: { display: true, text: 'Time' } },
      y: {
        title: { display: true, text: 'Duration (minutes)' },
        beginAtZero: true,
        ticks: {
          precision: 1,
          stepSize: 1
        }
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const index = context.dataIndex;
            const datasetLabel = context.dataset.label || '';
            const value = context.parsed.y;

            if (datasetLabel === 'Active App Usage (min)') {
              const titles = activeAppTitlesPerSlot[index];
              return `${datasetLabel}: ${value} min\n${titles}`;
            }

            return `${datasetLabel}: ${value} min`;
          }
        }
      },
      title: {
        display: true,
        text: 'App usage vs Idle time'
      }
    }
  };
}









idlePieChartData: any;
pieChartOptions: any;

prepareIdlePieChart() {
  const afkEvents = this._productivityData.afk_events;
  const appUsage = this._productivityData.app_usage
  



  let totalIdle = 0;
  let totalNonIdle = 0;
  appUsage.forEach(e => {
    totalNonIdle += e.duration;
  });
  //afkEvents.forEach(e => {
  //  if (e.is_afk) totalIdle += e.duration;
  //});
  totalIdle =  this.selectedDuration - totalNonIdle
  

  // Active time breakdown
let hours = Math.floor(totalNonIdle / 3600);
let minutes = Math.floor((totalNonIdle % 3600) / 60);
const activeDurationLabel = `${hours}h ${minutes}m`;

// Idle time breakdown
hours = Math.floor(totalIdle / 3600);
minutes = Math.floor((totalIdle % 3600) / 60);
const idleDurationLabel = `${hours}h ${minutes}m`;

// Convert both to minutes (numeric) for Chart.js
const activeMinutes = Math.round(totalNonIdle / 60);
const idleMinutes = Math.round(totalIdle / 60);

this.idlePieChartData = {
  labels: ['Idle Time', 'Active Time'],
  datasets: [{
    data: [idleMinutes, activeMinutes], // ✅ must be numbers
    backgroundColor: ['#FF6384', '#36A2EB'],
    hoverBackgroundColor: ['#FF6384', '#36A2EB']
  }]
};

this.pieChartOptions = {
  responsive: true,
  plugins: {
    legend: { position: 'top' },
    tooltip: {
      callbacks: {
        label: function (context) {
          if (context.dataIndex === 0) {
            return `${context.label}: ${idleDurationLabel}`;
          }
          return `${context.label}: ${activeDurationLabel}`;
        }
      }
    },
    title: {
      display: true,
      text: 'Active vs Idle pie'
    }
  }
};

}

// Assumes this._productivityData is already populated
// Includes: Idle vs App Usage, Context Switches, Cumulative Active Time, Top N App Usage

totalSummary: any;
idleVsAppLineChartData: any;
productivitylineChartOptions: any;
contextSwitchChartData: any;
productivityContextlineChartOptions: any;
cumulativeActiveChartData: any;
productivityCumulativelineChartOptions: any;
topAppsOverTimeChartData: any;
productivityTopApplineChartOptions: any;
stackedAreaChartData: any;
stackedAreaChartOptions: any;
topN = 3;





prepareProductivityCharts() {
  const afkEvents = this._productivityData.afk_events || [];
  const appUsage = this._productivityData.app_usage || [];

  // Merge and sort all events by start time
  const allEvents = [
    ...afkEvents.map(e => ({
      time: new Date(e.start_time).getTime(),
      label: new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'afk',
      duration: e.duration,
      is_afk: e.is_afk
    })),
    ...appUsage.map(e => ({
      time: new Date(e.start_time).getTime(),
      label: new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'app',
      duration: e.duration,
      app_name: e.app_name,
      window_title: e.window_title
    }))
  ];


  // STEP 1: Create timeline based on min/max time
  const allTimestamps = [
    ...afkEvents.map(e => new Date(e.start_time).getTime()),
    ...appUsage.map(e => new Date(e.start_time).getTime())
  ];

  const minTime = Math.min(...allTimestamps);
  const maxTime = Math.max(...allTimestamps);
  const intervalMs = 60 * 1000; // 1 minute

  const timeline: number[] = [];
  for (let t = minTime; t <= maxTime; t += intervalMs) {
    timeline.push(t);
  }

  const timeLabels = timeline.map(ts =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  const sortedEvents = allEvents.sort((a, b) => a.time - b.time);
  //const timeLabels = sortedEvents.map(e => e.label);

  const idleDurations: (number | null)[] = [];
  const activeDurations: (number | null)[] = [];
  const activeDurationsInSeconds: (number | null)[] = [];

  sortedEvents.forEach(e => {
    if (e.type === 'afk' && e.is_afk) {
      idleDurations.push(+((e.duration || 0) / 60).toFixed(2));
      activeDurations.push(null);
    } else if (e.type === 'app') {
      activeDurations.push(+((e.duration || 0) / 60).toFixed(2));
      activeDurationsInSeconds.push(+((e.duration || 0)));
      idleDurations.push(null);
    } else {
      activeDurations.push(null);
      idleDurations.push(null);
    }
  });

  // 1. Idle vs Active chart
  this.idleVsAppLineChartData = {
    labels: timeLabels,
    datasets: [
      {
        label: 'Idle Time (min)',
        data: idleDurations,
        borderColor: '#FF6384',
        fill: false,
        tension: 0.1,
        spanGaps: true
      },
      {
        label: 'Active App Usage (min)',
        data: activeDurations,
        borderColor: '#4BC0C0',
        fill: false,
        tension: 0.1,
        spanGaps: true
      }
    ]
  };

  // 2. Context Switches Over Time
const contextSwitchesPerMinute: number[] = [];

timeline.forEach((ts, index) => {
  const nextTs = ts + intervalMs;
  let lastAppKey = '';
  let switchCount = 0;

  // Get all app usage events overlapping this time slot
  const eventsInInterval = appUsage.filter(app => {
    const start = new Date(app.start_time).getTime();
    const end = start + app.duration * 1000;
    return start < nextTs && end > ts;
  });

  // Sort them by actual start time for accurate switching
  const sorted = eventsInInterval.sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  sorted.forEach(app => {
    const key = app.app_name + ' - ' + app.window_title;
    if (key !== lastAppKey) {
      switchCount++;
      lastAppKey = key;
    }
  });

  contextSwitchesPerMinute.push(switchCount);
});

this.contextSwitchChartData = {
  labels: timeLabels,
  datasets: [
    {
      label: 'Context Switches Per Minute',
      data: contextSwitchesPerMinute,
      borderColor: '#FFA726',
      fill: false,
      tension: 0.1
    }
  ]
};



  // 3. Cumulative Active Time
  let cumulative = 0;
  const cumulativeActive = activeDurations.map(d => {
    if (d != null) cumulative += d;
    return +cumulative.toFixed(2);
  });

  this.cumulativeActiveChartData = {
    labels: timeLabels,
    datasets: [
      {
        label: 'Cumulative Active Time (min)',
        data: cumulativeActive,
        borderColor: '#66BB6A',
        fill: false,
        tension: 0.1
      }
    ]
  };

  

  // 5. Shared chart options
  this.productivityCumulativelineChartOptions = {
    responsive: true,
    spanGaps: true,
    plugins: {
      tooltip: {
        mode: 'index',
        intersect: false
      },
      title: {
      display: true,
      text: 'Cumulative Active Time'
    },
    },
    
    scales: {
      x: {
        title: { display: true, text: 'Time' },
        ticks: { autoSkip: true, maxTicksLimit: 20 }
      },
      y: {
        title: { display: true, text: 'Duration (minutes)' },
        beginAtZero: true
      }
    }
  };

  

  // 5. Shared chart options
  this.productivityContextlineChartOptions = {
    responsive: true,
    spanGaps: true,
    plugins: {
      tooltip: {
        mode: 'index',
        intersect: false
      },
      title: {
      display: true,
      text: 'Context Switches'
    }
    },
    scales: {
      x: {
        title: { display: true, text: 'Time' },
        ticks: { autoSkip: true, maxTicksLimit: 20 }
      },
      y: {
        title: { display: true, text: 'Number of Context' },
        beginAtZero: true
      }
    }
  };


  const totalActiveTimeInSeconds = activeDurationsInSeconds.reduce((a, b) => a + b, 0);
  let hours = Math.floor(totalActiveTimeInSeconds / 3600);
  let minutes = Math.floor((totalActiveTimeInSeconds % 3600) / 60);
  const activeDurationLabel = `${hours}h ${minutes}m`;
  //const totalIdleTime = idleDurations.reduce((a, b) => a + b, 0).toFixed(2);
  //const totalActiveTime = activeDurations.reduce((a, b) => a + b, 0).toFixed(2);
  const totalIdleTimeInSeconds = this.selectedDuration - totalActiveTimeInSeconds;
  hours = Math.floor(totalIdleTimeInSeconds / 3600);
  minutes = Math.floor((totalIdleTimeInSeconds % 3600) / 60);
  const idleDurationLabel = `${hours}h ${minutes}m`;

  hours = Math.floor(this.selectedDuration / 3600);
  minutes = Math.floor((this.selectedDuration % 3600) / 60);
  const selectedDurationLabel = `${hours}h ${minutes}m`;

this.totalSummary = {
  active: activeDurationLabel,
  idle: idleDurationLabel,
  selectedDuration: selectedDurationLabel
};





}





prepareTopUsageAppCharts() {
  const appUsage = this._productivityData.app_usage || [];
  const intervalMs = 60 * 1000; // 1 minute

  // STEP 1: Create timeline based on min/max start and end times
  const allStartTimes = appUsage.map(e => new Date(e.start_time).getTime());
  const allEndTimes = appUsage.map(e => new Date(e.start_time).getTime() + e.duration * 1000);

  const minTime = Math.min(...allStartTimes);
  const maxTime = Math.max(...allEndTimes);

  const timeline: number[] = [];
  for (let t = minTime; t <= maxTime; t += intervalMs) {
    timeline.push(t);
  }

  const timeLabels = timeline.map(ts =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  // STEP 2: Get Top N apps by total duration
  const totalDurationsByApp: { [key: string]: number } = {};
  appUsage.forEach(app => {
    const key = `${app.app_name} - ${app.window_title}`;
    totalDurationsByApp[key] = (totalDurationsByApp[key] || 0) + app.duration;
  });

  const topApps = Object.entries(totalDurationsByApp)
    .sort((a, b) => b[1] - a[1])
    .slice(0, this.topN)
    .map(([key]) => key);

  // STEP 3: Generate per-minute usage data for each top app
  const appLineDatasets = topApps.map((appKey, index) => {
    const data = timeline.map(ts => {
      const nextTs = ts + intervalMs;

      const matchingApps = appUsage.filter(app => {
        const key = `${app.app_name} - ${app.window_title}`;
        if (key !== appKey) return false;

        const start = new Date(app.start_time).getTime();
        const end = start + app.duration * 1000;

        // Check if app usage overlaps with this time slot
        return start < nextTs && end > ts;
      });

      const overlapMs = matchingApps.reduce((sum, app) => {
        const start = new Date(app.start_time).getTime();
        const end = start + app.duration * 1000;

        const overlapStart = Math.max(start, ts);
        const overlapEnd = Math.min(end, nextTs);
        return sum + Math.max(0, overlapEnd - overlapStart);
      }, 0);

      return +(overlapMs / 1000 / 60).toFixed(2); // Convert ms → minutes
    });

    return {
      label: appKey,
      data,
      borderColor: [
        '#AB47BC', // Purple
  '#26C6DA', // Cyan
  '#EF5350', // Red
  '#FFA726', // Orange
  '#66BB6A', // Green
  '#42A5F5', // Blue
  '#FF7043', // Deep Orange
  '#9CCC65', // Light Green
  '#5C6BC0', // Indigo
  '#EC407A'][index % this.topN],
      fill: false,
      tension: 0.1,
      spanGaps: true
    };
  });

  // STEP 4: Assign to chart data
  this.topAppsOverTimeChartData = {
    labels: timeLabels,
    datasets: appLineDatasets
  };

  // STEP 5: Chart options
  this.productivityTopApplineChartOptions = {
    responsive: true,
    spanGaps: true,
    plugins: {
      tooltip: {
        mode: 'index',
        intersect: false
      },
      title: {
        display: true,
        text: `Top ${this.topN} App Usage Trends`
      }
    },
    scales: {
      x: {
        title: { display: true, text: 'Time' },
        ticks: { autoSkip: true, maxTicksLimit: 20 }
      },
      y: {
        title: { display: true, text: 'Duration (minutes)' },
        beginAtZero: true,
        ticks: {
          precision: 1
        }
      }
    }
  };
}






}
