import { WeatherIconName } from './weather-icon-name';
import { WeatherCondition } from './weather.models';

/**
 * WMO-väderkoder som Open-Meteo returnerar, översatta till svenska.
 * https://open-meteo.com/en/docs
 */
const UNKNOWN: WeatherCondition = {
  label: 'Okänt väder',
  icon: 'cloudy',
  clearSky: false,
  isRain: false,
  isSnow: false,
  isThunder: false,
};

function clear(label: string, icon: WeatherIconName, clearSky = true): WeatherCondition {
  return { label, icon, clearSky, isRain: false, isSnow: false, isThunder: false };
}

function rain(label: string, icon: WeatherIconName): WeatherCondition {
  return { label, icon, clearSky: false, isRain: true, isSnow: false, isThunder: false };
}

function snow(label: string, icon: WeatherIconName): WeatherCondition {
  return { label, icon, clearSky: false, isRain: false, isSnow: true, isThunder: false };
}

function thunder(label: string, icon: WeatherIconName): WeatherCondition {
  return { label, icon, clearSky: false, isRain: true, isSnow: false, isThunder: true };
}

const CONDITIONS: Record<number, WeatherCondition> = {
  0: clear('Klart', 'sun'),
  1: clear('Mestadels klart', 'sun'),
  2: clear('Halvklart', 'partly-cloudy', false),
  3: clear('Mulet', 'cloudy', false),
  45: clear('Dimma', 'fog', false),
  48: clear('Underkyld dimma', 'fog', false),
  51: rain('Lätt duggregn', 'rain'),
  53: rain('Duggregn', 'rain'),
  55: rain('Tätt duggregn', 'rain'),
  56: rain('Underkylt duggregn', 'rain'),
  57: rain('Tätt underkylt duggregn', 'rain'),
  61: rain('Lätt regn', 'rain'),
  63: rain('Regn', 'rain'),
  65: rain('Kraftigt regn', 'rain'),
  66: rain('Underkylt regn', 'rain'),
  67: rain('Kraftigt underkylt regn', 'rain'),
  71: snow('Lätt snöfall', 'snow'),
  73: snow('Snöfall', 'snow'),
  75: snow('Kraftigt snöfall', 'snow'),
  77: snow('Kornsnö', 'snow'),
  80: rain('Lätta regnskurar', 'showers'),
  81: rain('Regnskurar', 'showers'),
  82: rain('Kraftiga regnskurar', 'showers'),
  85: snow('Lätta snöbyar', 'snow'),
  86: snow('Snöbyar', 'snow'),
  95: thunder('Åska', 'thunder'),
  96: thunder('Åska med hagel', 'thunder'),
  99: thunder('Kraftig åska med hagel', 'thunder'),
};

export function conditionForWmoCode(code: number): WeatherCondition {
  return CONDITIONS[code] ?? UNKNOWN;
}

/** Måne i stället för sol när det är natt och himlen är klar. */
export function weatherIconFor(condition: WeatherCondition, isDay: boolean): WeatherIconName {
  if (!isDay && condition.clearSky) {
    return 'moon';
  }
  return condition.icon;
}
