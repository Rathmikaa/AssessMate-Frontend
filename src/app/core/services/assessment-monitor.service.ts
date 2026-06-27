import { Injectable } from '@angular/core';
import { signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';

import { API_ORIGIN } from '../constants/api.constants';
import { AuthService } from './auth.service';

/** One flat shape covering both hub events — score/maxScore are simply
 *  absent on a "started" event rather than being a discriminated union,
 *  since Angular's template type-checker doesn't reliably narrow unions
 *  the way plain TypeScript code does. */
export interface MonitorEvent {
  type: 'CandidateStarted' | 'CandidateSubmitted';
  assessmentId: number;
  assessmentTitle: string;
  candidateId: number;
  candidateName: string;
  score?: number;
  maxScore?: number;
  at: string; // ISO date string
}

export type MonitorConnectionState = 'disconnected' | 'connecting' | 'connected';

/** Talks to AssessmentMonitorHub. Connection is explicit (connect() /
 *  disconnect()), not automatic on injection — only the Evaluator
 *  Dashboard opens one, and closes it when navigated away from. */
@Injectable({ providedIn: 'root' })
export class AssessmentMonitorService {
  private connection: signalR.HubConnection | null = null;

  readonly events = signal<MonitorEvent[]>([]);
  readonly connectionState = signal<MonitorConnectionState>('disconnected');

  constructor(private readonly auth: AuthService) {}

  connect(): void {
    if (this.connection) return; // already connecting/connected

    this.connectionState.set('connecting');

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_ORIGIN}/hubs/assessment-monitor`, {
        accessTokenFactory: () => this.auth.getToken() ?? '',
      })
      .withAutomaticReconnect()
      .build();

    this.connection.on('CandidateStarted', (data: Omit<MonitorEvent, 'type'>) =>
      this.pushEvent({ type: 'CandidateStarted', ...data }),
    );
    this.connection.on('CandidateSubmitted', (data: Omit<MonitorEvent, 'type'>) =>
      this.pushEvent({ type: 'CandidateSubmitted', ...data }),
    );

    this.connection.onreconnecting(() => this.connectionState.set('connecting'));
    this.connection.onreconnected(() => {
      this.connectionState.set('connected');
      this.connection?.invoke('JoinAdminGroup');
    });
    this.connection.onclose(() => this.connectionState.set('disconnected'));

    this.connection
      .start()
      .then(() => {
        this.connectionState.set('connected');
        return this.connection?.invoke('JoinAdminGroup');
      })
      .catch(() => this.connectionState.set('disconnected'));
  }

  disconnect(): void {
    this.connection?.stop();
    this.connection = null;
    this.connectionState.set('disconnected');
  }

  private pushEvent(event: MonitorEvent): void {
    // Cap it so a long-running dashboard tab doesn't grow this forever.
    this.events.set([event, ...this.events()].slice(0, 50));
  }
}