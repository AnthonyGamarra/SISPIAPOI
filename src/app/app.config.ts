import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { tokenInterceptor } from './core/interceptors/token.interceptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { ToastrModule } from 'ngx-toastr';
import { provideAnimations } from '@angular/platform-browser/animations';
import { importProvidersFrom } from '@angular/core';
import { RecaptchaV3Module, RECAPTCHA_V3_SITE_KEY } from 'ng-recaptcha';
import Aura from '@primeng/themes/aura';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(RecaptchaV3Module),
      { provide: RECAPTCHA_V3_SITE_KEY, useValue: '6LfJ-TkpAAAAAGk-luwLSzw3ihrxMprK85ckCalL' },
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    provideHttpClient(withInterceptors([tokenInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
        theme: {
            preset: Aura,
            options: {
              darkModeSelector: 'none'  // Desactiva modo oscuro automático
            }
        }
    }),
    provideAnimations(), // necesario para Toastr
    importProvidersFrom(
      ToastrModule.forRoot({
        positionClass: 'toast-top-center',
        timeOut: 3000,
        closeButton: true,
        progressBar: true,
        newestOnTop: true,
      })
    )
  ]
};
