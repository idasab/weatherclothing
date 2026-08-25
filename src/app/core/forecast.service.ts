import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { apparentTemperature } from './apparent-temperature';
import { DatedHour, tomorrowFrom } from './day-forecast';
import { NO_SUN_INFO, OpenMeteoService, SunInfo } from './open-meteo.service';
import { conditionForSmhiSymbol } from './smhi-symbols';
import { SmhiHour, SmhiService } from './smhi.service';
import { HourForecast, Place, WeatherSnapshot } from './weather.models';

/** Hur många timmar framåt dagens råd bygger på. */
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
    const dated = series.map((hour) => this.toDatedHour(hour, sun));
    const today = dated[0].date;
    const restOfToday = dated.filter((entry) => entry.date === today);
    const temperatures = restOfToday.map((entry) => entry.hour.temperature);

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
      hours: dated.slice(0, HOURS_AHEAD).map((entry) => entry.hour),
      tomorrow: tomorrowFrom(dated, today, sun.uvIndexMaxTomorrow),
    };
  }

  /**
   * SMHI stämplar tiderna i UTC, så datum och timme räknas om till enhetens
   * tidszon. För en svensk prognos läst i Sverige blir det svensk tid, vilket är
   * hela poängen.
   */
  private toDatedHour(hour: SmhiHour, sun: SunInfo): DatedHour {
    const local = new Date(hour.timeUtc);

    return {
      date: local.toLocaleDateString('sv-SE'),
      hourOfDay: local.getHours(),
      hour: this.toHourForecast(hour, sun, local),
    };
  }

  private toHourForecast(hour: SmhiHour, sun: SunInfo, local: Date): HourForecast {
    return {
      time: hour.timeUtc,
      label: local.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
      temperature: hour.temperature,
      apparentTemperature: apparentTemperature(hour.temperature, hour.windSpeed, hour.humidity),
      precipitationProbability: hour.precipitationProbability,
      precipitation: hour.precipitation,
      windSpeed: hour.windSpeed,
      windGusts: hour.windGusts,
      condition: conditionForSmhiSymbol(hour.symbolCode),
      isDay: this.isDay(hour, sun),
    };
  }

  private isDay(hour: SmhiHour, sun: SunInfo): boolean {
    return sun.dayByHour[hour.timeUtc.slice(0, 13)] ?? true;
  }
}
