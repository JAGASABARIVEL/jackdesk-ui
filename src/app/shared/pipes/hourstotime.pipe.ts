import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'hoursToTime'
})
export class HoursToTimePipe implements PipeTransform {
  transform(hours: number | null | undefined): string {
    if (hours === null || hours === undefined || hours === 0) {
      return '0 min';
    }

    const totalMinutes = Math.round(hours * 60);
    const wholeHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (wholeHours === 0) {
      return `${minutes} min`;
    } else if (minutes === 0) {
      return `${wholeHours} hr`;
    } else {
      return `${wholeHours} hr ${minutes} min`;
    }
  }
}