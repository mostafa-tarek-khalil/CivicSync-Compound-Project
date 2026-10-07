import {
  ChangeDetectionStrategy,
  Component,
  input,
  output
} from '@angular/core';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  readonly title = input('Nothing here yet');
  readonly message = input('');
  
  readonly icon = input('inbox');

  readonly actionLabel = input('');

  readonly action = output<void>();

  onAction(): void {
    this.action.emit();
  }
}
