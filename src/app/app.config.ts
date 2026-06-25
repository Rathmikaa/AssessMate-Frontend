import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Handles the "closed the laptop, came back hours later" case — see
    // AuthService.initializeSession() for why this needs to run before
    // any route guard checks isAuthenticated().
    provideAppInitializer(() => {
      const auth = inject(AuthService);
      return auth.initializeSession();
    }),
  ],
};