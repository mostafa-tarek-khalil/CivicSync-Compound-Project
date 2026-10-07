import {
  ChangeDetectionStrategy,
  Component,
  input,
  output
} from '@angular/core';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-state.html',
  styleUrl: './error-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorStateComponent {
  readonly title = input('Something went wrong');
  readonly message = input('We could not load this data. Please try again.');
  readonly retryLabel = input('Try again');

  readonly retry = output<void>();

  onRetry(): void {
    this.retry.emit();
  }
}
