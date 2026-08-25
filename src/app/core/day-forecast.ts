import { DayForecast, HourForecast, WeatherCondition } from './weather.models';

/** Timmarna vi ger råd om för en kommande dag: när man faktiskt är ute. */
const DAY_START = 7;
const DAY_END = 19;

/** Timmen man klär på sig och går ut, och som därför får representera dagen. */
const DRESSING_HOUR = 8;

/** Kvällen: från att eftermiddagen tar slut till att dygnet gör det. */
const EVENING_START = 18;
const EVENING_END = 23;

/** Färre kvällstimmar än så är inte en kväll värd ett eget råd. */
const MINIMUM_EVENING_HOURS = 2;

/** Färre timmar än så är inte en dag, och då hoppar vi över rådet helt. */
const MINIMUM_HOURS = 4;

/** En timme med sin plats i lokal tid, uträknad av den källa den kom från. */
export interface DatedHour {
  hour: HourForecast;
  /** Lokalt datum, "2026-08-26". */
  date: string;
  /** Lokal timme, 0–23. */
  hourOfDay: number;
}

/**
 * Hur illa vädret är. Används för att välja dagens symbol: ett dygn med en
 * regnskur ska visa regn, inte den sol som råkade ligga vid åtta på morgonen.
 */
function severity(condition: WeatherCondition): number {
  if (condition.isThunder) {
    return 4;
  }
  if (condition.isSnow) {
    return 3;
  }
  if (condition.isRain) {
    return 2;
  }
  return condition.clearSky ? 0 : 1;
}

/**
 * Bygger morgondagens prognos ur en tidsserie. Värdena tas från tiden man går
 * ut, utom vind och byar som tas som dagens högsta — det är de som avgör om ett
 * paraply håller, och då är det värsta stunden som räknas.
 */
export function tomorrowFrom(
  dated: DatedHour[],
  today: string,
  uvIndexMax: number
): DayForecast | null {
  const dates = dated.map((entry) => entry.date).filter((date) => date > today);
  if (!dates.length) {
    return null;
  }

  const tomorrow = dates.reduce((earliest, date) => (date < earliest ? date : earliest));
  const wholeDay = dated.filter((entry) => entry.date === tomorrow);
  const daytime = wholeDay.filter(
    (entry) => entry.hourOfDay >= DAY_START && entry.hourOfDay <= DAY_END
  );

  const hours = daytime.length >= MINIMUM_HOURS ? daytime : wholeDay;
  if (hours.length < MINIMUM_HOURS) {
    return null;
  }

  const representative = hours.reduce((closest, entry) =>
    Math.abs(entry.hourOfDay - DRESSING_HOUR) < Math.abs(closest.hourOfDay - DRESSING_HOUR)
      ? entry
      : closest
  );

  const worst = hours.reduce((worstSoFar, entry) =>
    severity(entry.hour.condition) > severity(worstSoFar.hour.condition) ? entry : worstSoFar
  );

  const temperatures = wholeDay.map((entry) => entry.hour.temperature);

  return {
    date: tomorrow,
    temperature: representative.hour.temperature,
    apparentTemperature: representative.hour.apparentTemperature,
    windSpeed: Math.max(...hours.map((entry) => entry.hour.windSpeed)),
    windGusts: Math.max(...hours.map((entry) => entry.hour.windGusts)),
    precipitation: representative.hour.precipitation,
    condition: worst.hour.condition,
    isDay: true,
    dayMax: Math.max(...temperatures),
    dayMin: Math.min(...temperatures),
    uvIndexMax,
    hours: hours.map((entry) => entry.hour),
  };
}

/**
 * Kvällens prognos, för de timmar som återstår av kvällen i dag.
 *
 * Urvalet skiljer sig medvetet från morgondagens: här tas den kallaste timmen
 * som representant, inte klockan åtta. Frågan på kvällen är inte "hur är det
 * ute nu" utan "kommer jag att frysa på vägen hem", och då är det värsta värdet
 * det ärliga. UV-index sätts till noll — solskyddsråd hör inte hit.
 */
export function eveningFrom(dated: DatedHour[], today: string): DayForecast | null {
  // Är kvällen redan här täcker nulägets råd den, och kortet blir en dubblett.
  if (dated.length && dated[0].hourOfDay >= EVENING_START) {
    return null;
  }

  const hours = dated.filter(
    (entry) =>
      entry.date === today &&
      entry.hourOfDay >= EVENING_START &&
      entry.hourOfDay <= EVENING_END
  );

  if (hours.length < MINIMUM_EVENING_HOURS) {
    return null;
  }

  const coldest = hours.reduce((worst, entry) =>
    entry.hour.apparentTemperature < worst.hour.apparentTemperature ? entry : worst
  );

  const worstWeather = hours.reduce((worstSoFar, entry) =>
    severity(entry.hour.condition) > severity(worstSoFar.hour.condition) ? entry : worstSoFar
  );

  const temperatures = hours.map((entry) => entry.hour.temperature);

  return {
    date: today,
    temperature: coldest.hour.temperature,
    apparentTemperature: coldest.hour.apparentTemperature,
    windSpeed: Math.max(...hours.map((entry) => entry.hour.windSpeed)),
    windGusts: Math.max(...hours.map((entry) => entry.hour.windGusts)),
    precipitation: coldest.hour.precipitation,
    condition: worstWeather.hour.condition,
    isDay: coldest.hour.isDay,
    dayMax: Math.max(...temperatures),
    dayMin: Math.min(...temperatures),
    uvIndexMax: 0,
    hours: hours.map((entry) => entry.hour),
  };
}
