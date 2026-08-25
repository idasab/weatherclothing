import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Coordinates } from './weather.models';

/**
 * SMHI:s öppna data, modellen SNOW (Swedish National Operational Weather
 * forecast). Nationell modell med finare upplösning över Sverige än de globala
 * modellerna, och den ger både nedbördssannolikhet och byvind.
 * https://opendata.smhi.se/metfcst/snow1gv1
 */
const BASE_URL =
  'https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point';

/**
 * Modellområdets omskrivna rektangel. Rutnätet är krökt, så en punkt kan ligga
 * i rektangeln men utanför själva området — då svarar API:et med fel och vi
 * faller tillbaka på den globala källan.
 */
const BOUNDS = { minLatitude: 49.5, maxLatitude: 75.5, minLongitude: -18.5, maxLongitude: 54.5 };

/** SMHI markerar saknade värden med 9999. */
const MISSING = 9999;

interface SmhiResponse {
  timeSeries: {
    time: string;
    data: Record<string, number>;
  }[];
}

export interface SmhiHour {
  /** UTC med Z, som SMHI levererar den. */
  timeUtc: string;
  temperature: number;
  windSpeed: number;
  windGusts: number;
  humidity: number;
  precipitation: number;
  precipitationProbability: number;
  symbolCode: number;
}

@Injectable({ providedIn: 'root' })
export class SmhiService {
  private readonly http = inject(HttpClient);

  /** Grovsållning så vi slipper anropa SMHI för platser långt utanför området. */
  covers(coordinates: Coordinates): boolean {
    return (
      coordinates.latitude >= BOUNDS.minLatitude &&
      coordinates.latitude <= BOUNDS.maxLatitude &&
      coordinates.longitude >= BOUNDS.minLongitude &&
      coordinates.longitude <= BOUNDS.maxLongitude
    );
  }

  /** Hela tidsserien, timme för timme. Anroparen tar de timmar den behöver. */
  hours(coordinates: Coordinates): Observable<SmhiHour[]> {
    // Fler än sex decimaler ger HTTP 404, och GPS:en lämnar gärna fler.
    const longitude = Number(coordinates.longitude.toFixed(6));
    const latitude = Number(coordinates.latitude.toFixed(6));

    return this.http
      .get<SmhiResponse>(`${BASE_URL}/lon/${longitude}/lat/${latitude}/data.json`)
      .pipe(map((response) => response.timeSeries.map((entry) => this.toHour(entry))));
  }

  private toHour(entry: SmhiResponse['timeSeries'][number]): SmhiHour {
    const data = entry.data;

    return {
      timeUtc: entry.time,
      temperature: this.value(data['air_temperature']),
      windSpeed: this.value(data['wind_speed']),
      windGusts: this.value(data['wind_speed_of_gust']),
      humidity: this.value(data['relative_humidity']),
      precipitation: this.value(data['precipitation_amount_mean']),
      precipitationProbability: this.value(data['probability_of_precipitation']),
      symbolCode: this.value(data['symbol_code']),
    };
  }

  private value(raw: number | undefined): number {
    return raw === undefined || raw === MISSING ? 0 : raw;
  }
}
