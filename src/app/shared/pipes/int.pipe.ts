import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'toInt' })
export class ToIntPipe implements PipeTransform {
  transform(value: number | string, mode: 'round' | 'floor' | 'trunc' = 'trunc'): number {
    const num = Number(value) || 0;
    if (mode === 'round') return Math.round(num);
    if (mode === 'floor') return Math.floor(num);
    return Math.trunc(num);
  }
}
