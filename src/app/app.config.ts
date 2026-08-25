import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    // Service workern ger appen ett offlineskal: utan den krävde starten
    // nätverk, vilket är fel felläge för en app man tittar på innan man går ut.
    // Den är avstängd i utvecklingsläge, där ng serve inte bygger någon.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
