import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeng/themes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import Lara from '@primeng/themes/lara';
import { SocialAuthServiceConfig, GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { environment } from '../environment';

import { routes } from './app.routes';
import { loadingInterceptor } from './shared/interceptors/loading.interceptor';
import { authInterceptor } from './shared/interceptors/auth.interceptor';


const MyLara = definePreset(Lara, {
  semantic: {
    primary: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#667eea', // closest solid match to your gradient start
      600: '#5a6fd6',
      700: '#4c5ec1',
      800: '#3e4dab',
      900: '#2f3c96'
    },
    secondary: {
      500: '#764ba2'
    },
    success: {
      500: '#22c55e'
    },
    info: {
      500: '#0ea5e9'
    },
    warn: {
      500: '#f59e0b'
    },
    danger: {
      500: '#ef4444'
    }
  }
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor, loadingInterceptor])
    ),
    // provideAnimations(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    providePrimeNG({
      ripple: true,
      theme: {
        preset: MyLara
      }
    }),
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false, // Set to true if you want auto-login
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(
              environment.googleClientId
            ),
          }
        ]
      } as SocialAuthServiceConfig
    }
  ]
};
