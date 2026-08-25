import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GarmentListComponent } from './components/garment-list.component';
import { HourStripComponent } from './components/hour-strip.component';
import { PlaceSearchComponent } from './components/place-search.component';
import { WeatherIconComponent } from './components/weather-icon.component';
import { Advice, adviseFor } from './core/clothing-advisor';
import { ForecastService } from './core/forecast.service';
import { GeocodingService } from './core/geocoding.service';
import { LocationError, LocationService } from './core/location.service';
import {
  ForecastSource,
  HourForecast,
  Place,
  WeatherCondition,
  WeatherSnapshot,
} from './core/weather.models';
import { weatherIconFor } from './core/weather-codes';

// Versionen i nyckeln gör att en cache från en äldre datamodell ignoreras.
const CACHE_KEY = 'weather-clothing.snapshot.v4';

/** Hur långt man måste dra för att uppdateringen ska utlösas. */
const PULL_THRESHOLD = 70;

type Day = 'today' | 'tomorrow';

/** Det som visas på skärmen, oavsett vilken dag som är vald. */
interface DayView {
  temperature: number;
  apparentTemperature: number;
  windSpeed: number;
  windGusts: number;
  uvIndexMax: number;
  isDay: boolean;
  hours: HourForecast[];
  condition: WeatherCondition;
  dayMax: number;
  dayMin: number;
  /** Null i morgon: luftfuktighet finns bara för nuläget. */
  humidity: number | null;
  isTomorrow: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    GarmentListComponent,
    HourStripComponent,
    PlaceSearchComponent,
    WeatherIconComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  private readonly forecast = inject(ForecastService);
  private readonly geocoding = inject(GeocodingService);
  private readonly location = inject(LocationService);

  private pullStart: number | null = null;

  readonly snapshot = signal<WeatherSnapshot | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  /** Sant när felet beror på platsen, då hjälper det att peka på sökfältet. */
  readonly canSearchInstead = signal(false);
  readonly day = signal<Day>('today');
  /** Hur långt fingret dragit ner sidan, i pixlar. */
  readonly pull = signal(0);

  readonly hasTomorrow = computed(() => !!this.snapshot()?.tomorrow);
  readonly showingTomorrow = computed(() => this.day() === 'tomorrow' && this.hasTomorrow());
  readonly pullReady = computed(() => this.pull() >= PULL_THRESHOLD);

  /** Nuläget eller morgondagen, i en form både mallen och klädlogiken läser. */
  readonly view = computed<DayView | null>(() => {
    const snapshot = this.snapshot();
    if (!snapshot) {
      return null;
    }

    const tomorrow = snapshot.tomorrow;
    if (this.day() === 'tomorrow' && tomorrow) {
      return {
        temperature: tomorrow.temperature,
        apparentTemperature: tomorrow.apparentTemperature,
        windSpeed: tomorrow.windSpeed,
        windGusts: tomorrow.windGusts,
        uvIndexMax: tomorrow.uvIndexMax,
        isDay: tomorrow.isDay,
        hours: tomorrow.hours,
        condition: tomorrow.condition,
        dayMax: tomorrow.dayMax,
        dayMin: tomorrow.dayMin,
        humidity: null,
        isTomorrow: true,
      };
    }

    return {
      temperature: snapshot.temperature,
      apparentTemperature: snapshot.apparentTemperature,
      windSpeed: snapshot.windSpeed,
      windGusts: snapshot.windGusts,
      uvIndexMax: snapshot.uvIndexMax,
      isDay: snapshot.isDay,
      hours: snapshot.hours,
      condition: snapshot.condition,
      dayMax: snapshot.dayMax,
      dayMin: snapshot.dayMin,
      humidity: snapshot.humidity,
      isTomorrow: false,
    };
  });

  readonly advice = computed<Advice | null>(() => {
    const view = this.view();
    return view ? adviseFor(view) : null;
  });

  readonly conditionLabel = computed(() => this.view()?.condition.label ?? '');

  readonly weatherIcon = computed(() => {
    const view = this.view();
    return view ? weatherIconFor(view.condition, view.isDay) : 'cloudy';
  });

  /** Styr bakgrundsgradienten så skärmen speglar vädret för den valda dagen. */
  readonly theme = computed(() => {
    const view = this.view();
    if (!view) {
      return 'clear-night';
    }

    const condition = view.condition;
    if (condition.isThunder) {
      return 'thunder';
    }
    if (condition.isSnow) {
      return 'snow';
    }
    if (condition.isRain) {
      return 'rain';
    }
    if (!view.isDay) {
      return 'clear-night';
    }
    if (view.apparentTemperature >= 27) {
      return 'heat';
    }
    if (!condition.clearSky) {
      return 'cloud';
    }
    return 'clear-day';
  });

  /** Vilken källa värdena kom från, så det syns vad appen bygger på. */
  readonly source = computed<ForecastSource | null>(() => this.snapshot()?.source ?? null);

  /**
   * Kort sammanfattning för skärmläsare. En dold live-region som läser upp en
   * mening är bättre än att läsa upp varje kapsel i listorna.
   */
  readonly announcement = computed(() => {
    const snapshot = this.snapshot();
    const view = this.view();
    const advice = this.advice();
    if (!snapshot || !view || !advice) {
      return '';
    }

    const when = view.isTomorrow ? 'I morgon' : 'Nu';
    const takeWith = advice.extras.length
      ? ` Ta med ${advice.extras.map((extra) => extra.label).join(', ')}.`
      : '';

    return (
      `${when} i ${snapshot.place.name}, ${Math.round(view.temperature)} grader, ` +
      `känns som ${Math.round(view.apparentTemperature)}. ${advice.summary}${takeWith}`
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

  // Dra för att uppdatera. Egen implementation eftersom sidan inte rullar i
  // en behållare med webbläsarens egen dragfunktion, och för att appen som
  // hemskärmsapp inte har någon sådan alls.

  onTouchStart(event: TouchEvent): void {
    // Bara när sidan redan ligger i topp, annars är det vanlig rullning.
    const atTop = window.scrollY <= 0;
    this.pullStart = atTop && event.touches.length === 1 ? event.touches[0].clientY : null;
  }

  onTouchMove(event: TouchEvent): void {
    if (this.pullStart === null || this.loading()) {
      return;
    }

    const delta = event.touches[0].clientY - this.pullStart;
    if (delta <= 0) {
      this.pull.set(0);
      return;
    }

    // Halva fingerrörelsen, med tak: draget ska kännas trögt, inte elastiskt.
    this.pull.set(Math.min(delta * 0.5, PULL_THRESHOLD + 24));
    if (delta > 8 && event.cancelable) {
      event.preventDefault();
    }
  }

  onTouchEnd(): void {
    const pulled = this.pull();
    this.pullStart = null;
    this.pull.set(0);

    if (pulled >= PULL_THRESHOLD) {
      void this.refresh();
    }
  }

  private async load(place: Place): Promise<void> {
    this.loading.set(true);

    try {
      const snapshot = await firstValueFrom(this.forecast.forecast(place));
      this.snapshot.set(snapshot);
      this.error.set(null);
      // Ny plats visas alltid från i dag, oavsett vad som var valt förut.
      this.day.set('today');
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
