import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

export interface ChartSlice {
  label: string;
  value: number;
  color: string;
}

export interface ChartPoint {
  label: string;
  value: number;
}

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chart.html',
  styleUrl: './chart.css'
})
export class ChartComponent implements OnChanges {

  @Input() type: 'donut' | 'bars' | 'line' = 'donut';

  @Input() slices: ChartSlice[] = [];

  @Input() points: ChartPoint[] = [];

  @Input() height = 220;

  donutSegments: { color: string; dash: string; offset: number }[] = [];

  donutTotal = 0;

  get hasData(): boolean {
    if (this.type === 'line') {
      return this.points.some(point => point.value > 0);
    }

    return this.slices.some(slice => slice.value > 0);
  }

  get maxValue(): number {
    const values =
      this.type === 'line'
        ? this.points.map(point => point.value)
        : this.slices.map(slice => slice.value);

    return Math.max(1, ...values);
  }

  barHeight(value: number): number {
    return Math.round((value / this.maxValue) * 100);
  }

  get linePath(): string {
    if (this.points.length === 0) {
      return '';
    }

    const width = 100;
    const step = this.points.length > 1 ? width / (this.points.length - 1) : 0;

    return this.points
      .map((point, index) => {
        const x = index * step;
        const y = 100 - (point.value / this.maxValue) * 100;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }

  ngOnChanges(): void {
    if (this.type !== 'donut') {
      return;
    }

    this.buildDonut();
  }

  private buildDonut(): void {
    const total = this.slices.reduce((sum, slice) => sum + slice.value, 0);

    this.donutTotal = total;

    if (total === 0) {
      this.donutSegments = [];
      return;
    }

    this.donutSegments = this.slices
      .filter(slice => slice.value > 0)
      .map(slice => {
        const share = (slice.value / total) * 100;

        return {
          color: slice.color,
          dash: `${share.toFixed(3)} ${(100 - share).toFixed(3)}`,
          offset: 0,
        };
      });

    let running = 0;

    this.donutSegments = this.donutSegments.map(segment => {
      const rotation = (running / 100) * 360;
      running += parseFloat(segment.dash);

      return { ...segment, offset: rotation };
    });
  }

  percent(value: number): string {
    if (this.donutTotal === 0) {
      return '0%';
    }

    return `${Math.round((value / this.donutTotal) * 100)}%`;
  }
}