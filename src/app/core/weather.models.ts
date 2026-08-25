import { WeatherIconName } from './weather-icon-name';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Place extends Coordinates {
  name: string;
  admin1?: string;
  country?: string;
}

/** Vilken prognoskälla värdena kommer från, visas längst ner i appen. */
export type ForecastSource = 'SMHI' | 'Open-Meteo';

/**
 * Vädersituationen, redan översatt från källans egen kodskala. SMHI använder
 * Wsymb2 (1–27) och Open-Meteo WMO-koder, så koderna stannar i sina respektive
 * moduler och resten av appen ser bara den här formen.
 */
export interface WeatherCondition {
  label: string;
  icon: WeatherIconName;
  /** Klart eller nästan klart, styr om natten ska visa måne i stället för sol. */
  clearSky: boolean;
  isRain: boolean;
  isSnow: boolean;
  isThunder: boolean;
}

export interface HourForecast {
  /** Tidpunkten i källans format: UTC med Z från SMHI, platslokal från Open-Meteo. */
  time: string;
  /** "15:00", färdig att visa. */
  label: string;
  temperature: number;
  apparentTemperature: number;
  precipitationProbability: number;
  /** Millimeter under timmen. */
  precipitation: number;
  /** m/s */
  windSpeed: number;
  /** m/s. Behövs per timme för att kunna bedöma paraply för en hel dag framåt. */
  windGusts: number;
  condition: WeatherCondition;
  isDay: boolean;
}

/**
 * En hel dag framåt, för rådet om i morgon. Fälten är desamma som klädlogiken
 * läser ur en ögonblicksbild, så samma adviseFor kan användas för båda.
 */
export interface DayForecast {
  /** Lokalt datum, "2026-08-26". */
  date: string;
  /** Värdena vid tiden man går ut, inte dygnsmedel. */
  temperature: number;
  apparentTemperature: number;
  windSpeed: number;
  windGusts: number;
  precipitation: number;
  condition: WeatherCondition;
  isDay: boolean;
  dayMax: number;
  dayMin: number;
  uvIndexMax: number;
  /** Dagtimmarna, ungefär 07–19. */
  hours: HourForecast[];
}

export interface WeatherSnapshot {
  place: Place;
  source: ForecastSource;
  /** Tidpunkten värdena gäller, i källans format. */
  localTime: string;
  /** När vi hämtade datan, för "uppdaterad"-texten och cachen. */
  fetchedAt: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  /** m/s */
  windSpeed: number;
  /** m/s */
  windGusts: number;
  precipitation: number;
  condition: WeatherCondition;
  isDay: boolean;
  dayMax: number;
  dayMin: number;
  /** 0 när källan inte kan ge UV-index, då utgår solskyddsråden. */
  uvIndexMax: number;
  /**
   * De närmaste tolv timmarna. Underlaget för råden, och det fönstret ska vara
   * lika långt oavsett vad klockan är — annars blir paraplybeskedet tunt sent
   * på kvällen.
   */
  hours: HourForecast[];
  /** Resten av dygnet, för timprognosen. Visning, inte underlag för råd. */
  hoursRestOfDay: HourForecast[];
  /** Null när kvällen redan är här eller passerad. */
  evening: DayForecast | null;
  /** Null när prognosen inte räcker till i morgon. */
  tomorrow: DayForecast | null;
  /** Morgondagens kväll, samma sak men för nästa dygn. */
  tomorrowEvening: DayForecast | null;
}
