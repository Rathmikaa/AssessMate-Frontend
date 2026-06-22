import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

interface PlaceholderData {
  title: string;
  description: string;
}

@Component({
  selector: 'app-placeholder-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './placeholder-page.html',
})
export class PlaceholderPage {
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = toSignal(this.route.data, { initialValue: this.route.snapshot.data });

  readonly data = computed(() => this.routeData() as PlaceholderData);
}
