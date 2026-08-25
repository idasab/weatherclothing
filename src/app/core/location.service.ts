import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { Coordinates } from './weather.models';

export type LocationErrorKind = 'denied' | 'unavailable' | 'timeout';

export class LocationError extends Error {
  constructor(readonly kind: LocationErrorKind, message: string) {
    super(message);
    this.name = 'LocationError';
  }
}

/**
 * Capacitors Geolocation-plugin används i både webbläsaren och den byggda
 * iOS-appen: webbimplementationen lindar navigator.geolocation, den native
 * använder CoreLocation. Samma anrop fungerar alltså i båda lägena.
 */
@Injectable({ providedIn: 'root' })
export class LocationService {
  async current(): Promise<Coordinates> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch (error) {
      throw this.translate(error);
    }
  }

  private translate(error: unknown): LocationError {
    const raw = error as { code?: number; message?: string } | undefined;
    const message = (raw?.message ?? '').toLowerCase();

    // Webbläsarens GeolocationPositionError: 1 nekad, 2 otillgänglig, 3 timeout.
    if (raw?.code === 1 || message.includes('denied') || message.includes('permission')) {
      return new LocationError(
        'denied',
        'Appen fick inte tillgång till din plats. Sök på en ort i stället, eller slå på platstjänster i inställningarna.'
      );
    }

    if (raw?.code === 3 || message.includes('timeout')) {
      return new LocationError(
        'timeout',
        'Det tog för lång tid att hitta din position. Försök igen eller sök på en ort.'
      );
    }

    return new LocationError(
      'unavailable',
      'Din position går inte att läsa av just nu. Sök på en ort i stället.'
    );
  }
}
