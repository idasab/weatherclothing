import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { apparentTemperature } from './apparent-temperature';
import { NO_SUN_INFO, OpenMeteoService, SunInfo } from './open-meteo.service';
import { conditionForSmhiSymbol } from './smhi-symbols';
import { SmhiHour, SmhiService } from './smhi.service';
import { HourForecast, Place, WeatherSnapshot } from './weather.models';

/** Hur många timmar framåt råden bygger på. */
const HOURS_AHEAD = 12;

/**
 * Väljer prognoskälla efter plats: SMHI:s nationella modell när platsen ligger
 * i dess område, annars den globala källan. SMHI publicerar varken
 * känns-som-temperatur eller UV-index, så det första räknar vi ut själva och
 * det andra hämtas som komplement från Open-Meteo.
 */
@Injectable({ providedIn: 'root' })
export class ForecastService {
  private readonly smhi = inject(SmhiService);
  private readonly openMeteo = inject(OpenMeteoService);

  forecast(place: Place): Observable<WeatherSnapshot> {
    if (!this.smhi.covers(place)) {
      return this.openMeteo.forecast(place);
    }

    return forkJoin({
      hours: this.smhi.hours(place),
      // Utan komplement blir det inga solskyddsråd, men prognosen står kvar.
      sun: this.openMeteo.sunInfo(place).pipe(catchError(() => of(NO_SUN_INFO))),
    }).pipe(
      map(({ hours, sun }) => this.toSnapshot(place, hours, sun)),
      // Punkter i rektangeln men utanför det krökta rutnätet avvisas av SMHI,
      // och då är den globala källan rätt svar snarare än ett felmeddelande.
      catchError(() => this.openMeteo.forecast(place))
    );
  }

  private toSnapshot(place: Place, series: SmhiHour[], sun: SunInfo): WeatherSnapshot {
    if (!series.length) {
      throw new Error('Tom tidsserie från SMHI');
    }

    const current = series[0];
    const restOfToday = this.restOfToday(series);
    const temperatures = restOfToday.map((hour) => hour.temperature);

    return {
      place,
      source: 'SMHI',
      localTime: current.timeUtc,
      fetchedAt: new Date().toISOString(),
      temperature: current.temperature,
      apparentTemperature: apparentTemperature(
        current.temperature,
        current.windSpeed,
        current.humidity
      ),
      humidity: current.humidity,
      windSpeed: current.windSpeed,
      windGusts: current.windGusts,
      precipitation: current.precipitation,
      condition: conditionForSmhiSymbol(current.symbolCode),
      isDay: this.isDay(current, sun),
      dayMax: Math.max(...temperatures),
      dayMin: Math.min(...temperatures),
      uvIndexMax: sun.uvIndexMax,
      hours: series.slice(0, HOURS_AHEAD).map((hour) => this.toHourForecast(hour, sun)),
    };
  }

  private toHourForecast(hour: SmhiHour, sun: SunInfo): HourForecast {
    return {
      time: hour.timeUtc,
      label: this.label(hour.timeUtc),
      temperature: hour.temperature,
      apparentTemperature: apparentTemperature(hour.temperature, hour.windSpeed, hour.humidity),
      precipitationProbability: hour.precipitationProbability,
      precipitation: hour.precipitation,
      condition: conditionForSmhiSymbol(hour.symbolCode),
      isDay: this.isDay(hour, sun),
    };
  }

  /**
   * SMHI stämplar tiderna i UTC, så de räknas om till enhetens tidszon. För en
   * svensk prognos läst i Sverige blir det svensk tid, vilket är hela poängen.
   */
  private label(timeUtc: string): string {
    return new Date(timeUtc).toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Prognosen börjar vid nuvarande timme, så högsta och lägsta värdet gäller
   * dygnets återstående timmar — morgonens minimum finns inte i serien.
   */
  private restOfToday(series: SmhiHour[]): SmhiHour[] {
    const today = new Date(series[0].timeUtc).toLocaleDateString('sv-SE');
    return series.filter(
      (hour) => new Date(hour.timeUtc).toLocaleDateString('sv-SE') === today
    );
  }

  private isDay(hour: SmhiHour, sun: SunInfo): boolean {
    return sun.dayByHour[hour.timeUtc.slice(0, 13)] ?? true;
  }
}
