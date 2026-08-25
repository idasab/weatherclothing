import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GarmentListComponent } from './components/garment-list.component';
import { HourStripComponent } from './components/hour-strip.component';
import { PlaceSearchComponent } from './components/place-search.component';
import { Advice, adviseFor } from './core/clothing-advisor';
import { GeocodingService } from './core/geocoding.service';
import { ForecastService } from './core/forecast.service';
import { LocationError, LocationService } from './core/location.service';
import { ForecastSource, Place, WeatherSnapshot } from './core/weather.models';
import { symbolFor } from './core/weather-codes';

// Versionen i nyckeln gör att en cache från en äldre datamodell ignoreras.
const CACHE_KEY = 'weather-clothing.snapshot.v2';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    GarmentListComponent,
    HourStripComponent,
    PlaceSearchComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  private readonly forecast = inject(ForecastService);
  private readonly geocoding = inject(GeocodingService);
  private readonly location = inject(LocationService);

  readonly snapshot = signal<WeatherSnapshot | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  /** Sant när felet beror på platsen, då hjälper det att peka på sökfältet. */
  readonly canSearchInstead = signal(false);

  readonly advice = computed<Advice | null>(() => {
    const snapshot = this.snapshot();
    return snapshot ? adviseFor(snapshot) : null;
  });

  readonly conditionLabel = computed(() => this.snapshot()?.condition.label ?? '');

  readonly symbol = computed(() => {
    const snapshot = this.snapshot();
    return snapshot ? symbolFor(snapshot.condition, snapshot.isDay) : '';
  });

  /** Vilken källa värdena kom från, så det syns vad appen bygger på. */
  readonly source = computed<ForecastSource | null>(() => this.snapshot()?.source ?? null);

  /** Styr bakgrundsgradienten så skärmen speglar vädret. */
  readonly theme = computed(() => {
    const snapshot = this.snapshot();
    if (!snapshot) {
      return 'clear-night';
    }

    const condition = snapshot.condition;
    if (condition.isThunder) {
      return 'thunder';
    }
    if (condition.isSnow) {
      return 'snow';
    }
    if (condition.isRain) {
      return 'rain';
    }
    if (!snapshot.isDay) {
      return 'clear-night';
    }
    if (snapshot.apparentTemperature >= 27) {
      return 'heat';
    }
    if (!condition.clearSky) {
      return 'cloud';
    }
    return 'clear-day';
  });

  /**
   * Kort sammanfattning för skärmläsare. En dold live-region som läser upp en
   * mening är bättre än att läsa upp varje kapsel i listorna, och när
   * paraplykortet togs bort försvann appens enda live-region med det.
   */
  readonly announcement = computed(() => {
    const snapshot = this.snapshot();
    const advice = this.advice();
    if (!snapshot || !advice) {
      return '';
    }

    const takeWith = advice.extras.length
      ? ` Ta med ${advice.extras.map((extra) => extra.label).join(', ')}.`
      : '';

    return (
      `${snapshot.place.name}, ${Math.round(snapshot.temperature)} grader, ` +
      `känns som ${Math.round(snapshot.apparentTemperature)}. ${advice.summary}${takeWith}`
    );
  });

  readonly updatedLabel = computed(() => {
    const snapshot = this.snapshot();
    if (!snapshot) {
      return '';
    }
    return new Date(snapshot.fetchedAt).toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  });

  ngOnInit(): void {
    const cached = this.readCache();
    if (cached) {
      // Visa senast kända väder direkt, hämta färskt i bakgrunden.
      this.snapshot.set(cached);
      void this.load(cached.place);
      return;
    }

    void this.locate();
  }

  async locate(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.canSearchInstead.set(false);

    try {
      const coordinates = await this.location.current();
      const place = await firstValueFrom(this.geocoding.describe(coordinates));
      await this.load(place);
    } catch (error) {
      if (error instanceof LocationError) {
        this.error.set(error.message);
        this.canSearchInstead.set(true);
      } else {
        this.error.set('Något gick fel när platsen skulle hämtas.');
      }
      this.loading.set(false);
    }
  }

  async show(place: Place): Promise<void> {
    this.error.set(null);
    this.canSearchInstead.set(false);
    await this.load(place);
  }

  async refresh(): Promise<void> {
    const current = this.snapshot();
    if (current) {
      await this.load(current.place);
      return;
    }
    await this.locate();
  }

  round(value: number): number {
    return Math.round(value);
  }

  private async load(place: Place): Promise<void> {
    this.loading.set(true);

    try {
      const snapshot = await firstValueFrom(this.forecast.forecast(place));
      this.snapshot.set(snapshot);
      this.error.set(null);
      this.writeCache(snapshot);
    } catch {
      // Har vi något cachat kvar är det bättre att visa det än ett tomt fel.
      this.error.set(
        this.snapshot()
          ? 'Kunde inte uppdatera prognosen. Visar senast hämtade värden.'
          : 'Kunde inte hämta väderdata. Kontrollera nätverket och försök igen.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  private readCache(): WeatherSnapshot | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as WeatherSnapshot;
      const usable = parsed?.place && parsed.condition?.label && Array.isArray(parsed.hours);
      return usable ? parsed : null;
    } catch {
      return null;
    }
  }

  private writeCache(snapshot: WeatherSnapshot): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
    } catch {
      // Privat läge eller fullt lager: cachen är en bonus, inte ett krav.
    }
  }
}
