import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HourForecast, Place, WeatherSnapshot } from './weather.models';
import { conditionForWmoCode } from './weather-codes';

/** Hur många timmar framåt råden bygger på. */
const HOURS_AHEAD = 12;

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

interface ForecastResponse {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation_probability: (number | null)[];
    precipitation: number[];
    weather_code: number[];
    is_day: number[];
  };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    uv_index_max: (number | null)[];
  };
}

interface SunResponse {
  hourly: {
    time: string[];
    is_day: number[];
  };
  daily: {
    uv_index_max: (number | null)[];
  };
}

/**
 * Det UV-index och dygnsrytmen SMHI inte publicerar. Nycklarna är UTC-timmar
 * på formen "2026-08-24T13" så de kan matchas mot SMHI:s egna tidsstämplar.
 */
export interface SunInfo {
  uvIndexMax: number;
  dayByHour: Record<string, boolean>;
}

export const NO_SUN_INFO: SunInfo = { uvIndexMax: 0, dayByHour: {} };

/** Global prognoskälla: används utanför SMHI:s område, och som reserv. */
@Injectable({ providedIn: 'root' })
export class OpenMeteoService {
  private readonly http = inject(HttpClient);

  forecast(place: Place): Observable<WeatherSnapshot> {
    const params = new HttpParams({
      fromObject: {
        latitude: place.latitude,
        longitude: place.longitude,
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'is_day',
          'precipitation',
          'weather_code',
          'wind_speed_10m',
          'wind_gusts_10m',
        ].join(','),
        hourly: [
          'temperature_2m',
          'apparent_temperature',
          'precipitation_probability',
          'precipitation',
          'weather_code',
          'is_day',
        ].join(','),
        daily: ['temperature_2m_max', 'temperature_2m_min', 'uv_index_max'].join(','),
        timezone: 'auto',
        forecast_days: 2,
        wind_speed_unit: 'ms',
      },
    });

    return this.http
      .get<ForecastResponse>(FORECAST_URL, { params })
      .pipe(map((response) => this.toSnapshot(response, place)));
  }

  /** Kompletterar SMHI, därför UTC: tidsnycklarna ska kunna matchas ihop. */
  sunInfo(coordinates: { latitude: number; longitude: number }): Observable<SunInfo> {
    const params = new HttpParams({
      fromObject: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        hourly: 'is_day',
        daily: 'uv_index_max',
        timezone: 'UTC',
        forecast_days: 2,
      },
    });

    return this.http.get<SunResponse>(FORECAST_URL, { params }).pipe(
      map((response) => {
        const dayByHour: Record<string, boolean> = {};
        response.hourly.time.forEach((time, index) => {
          dayByHour[time.slice(0, 13)] = response.hourly.is_day[index] === 1;
        });

        return {
          uvIndexMax: response.daily.uv_index_max[0] ?? 0,
          dayByHour,
        };
      })
    );
  }

  private toSnapshot(response: ForecastResponse, place: Place): WeatherSnapshot {
    return {
      place,
      source: 'Open-Meteo',
      localTime: response.current.time,
      fetchedAt: new Date().toISOString(),
      temperature: response.current.temperature_2m,
      apparentTemperature: response.current.apparent_temperature,
      humidity: response.current.relative_humidity_2m,
      windSpeed: response.current.wind_speed_10m,
      windGusts: response.current.wind_gusts_10m,
      precipitation: response.current.precipitation,
      condition: conditionForWmoCode(response.current.weather_code),
      isDay: response.current.is_day === 1,
      dayMax: response.daily.temperature_2m_max[0],
      dayMin: response.daily.temperature_2m_min[0],
      uvIndexMax: response.daily.uv_index_max[0] ?? 0,
      hours: this.upcomingHours(response),
    };
  }

  /**
   * Plockar de närmaste timmarna genom att jämföra textsträngarna. Att gå via
   * Date hade tolkat tiderna i telefonens tidszon i stället för platsens.
   */
  private upcomingHours(response: ForecastResponse): HourForecast[] {
    const currentHour = response.current.time.slice(0, 13);
    const hourly = response.hourly;
    const hours: HourForecast[] = [];

    for (let index = 0; index < hourly.time.length; index += 1) {
      const time = hourly.time[index];
      if (time.slice(0, 13) < currentHour) {
        continue;
      }

      hours.push({
        time,
        label: time.slice(11, 16),
        temperature: hourly.temperature_2m[index],
        apparentTemperature: hourly.apparent_temperature[index],
        precipitationProbability: hourly.precipitation_probability[index] ?? 0,
        precipitation: hourly.precipitation[index] ?? 0,
        condition: conditionForWmoCode(hourly.weather_code[index]),
        isDay: hourly.is_day[index] === 1,
      });

      if (hours.length === HOURS_AHEAD) {
        break;
      }
    }

    return hours;
  }
}
