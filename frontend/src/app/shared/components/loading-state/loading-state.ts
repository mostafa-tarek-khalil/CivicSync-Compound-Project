import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';


export type LoadingVariant = 'page' | 'section' | 'inline';


@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-state.html',
  styleUrl: './loading-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingStateComponent {
  readonly message = input('Loading…');
  readonly variant = input<LoadingVariant>('section');
}
