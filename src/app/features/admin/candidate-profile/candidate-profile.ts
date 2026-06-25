import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { ApiFailure } from '../../../core/models/api-response.model';
import { CandidateDetail } from '../../../core/models/candidate.model';
import { CandidateService } from '../../../core/services/candidate.service';

@Component({
  selector: 'app-candidate-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe],
  templateUrl: './candidate-profile.html',
})
export class CandidateProfile {
  private readonly route = inject(ActivatedRoute);
  private readonly candidateService = inject(CandidateService);

  readonly candidate = signal<CandidateDetail | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.candidateService.getById(id).subscribe({
      next: (detail) => {
        this.candidate.set(detail);
        this.loading.set(false);
      },
      error: (failure: ApiFailure) => {
        this.loadError.set(failure.errorMessages.join(' '));
        this.loading.set(false);
      },
    });
  }
}