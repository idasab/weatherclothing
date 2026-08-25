import { WeatherCondition } from './weather.models';

/**
 * WMO-väderkoder som Open-Meteo returnerar, översatta till svenska.
 * https://open-meteo.com/en/docs
 */
const UNKNOWN: WeatherCondition = {
  label: 'Okänt väder',
  symbol: '❔',
  clearSky: false,
  isRain: false,
  isSnow: false,
  isThunder: false,
};

function clear(label: string, symbol: string, clearSky = true): WeatherCondition {
  return { label, symbol, clearSky, isRain: false, isSnow: false, isThunder: false };
}

function rain(label: string, symbol: string): WeatherCondition {
  return { label, symbol, clearSky: false, isRain: true, isSnow: false, isThunder: false };
}

function snow(label: string, symbol: string): WeatherCondition {
  return { label, symbol, clearSky: false, isRain: false, isSnow: true, isThunder: false };
}

function thunder(label: string, symbol: string): WeatherCondition {
  return { label, symbol, clearSky: false, isRain: true, isSnow: false, isThunder: true };
}

const CONDITIONS: Record<number, WeatherCondition> = {
  0: clear('Klart', '☀️'),
  1: clear('Mestadels klart', '🌤️'),
  2: clear('Halvklart', '⛅', false),
  3: clear('Mulet', '☁️', false),
  45: clear('Dimma', '🌫️', false),
  48: clear('Underkyld dimma', '🌫️', false),
  51: rain('Lätt duggregn', '🌦️'),
  53: rain('Duggregn', '🌦️'),
  55: rain('Tätt duggregn', '🌧️'),
  56: rain('Underkylt duggregn', '🌧️'),
  57: rain('Tätt underkylt duggregn', '🌧️'),
  61: rain('Lätt regn', '🌦️'),
  63: rain('Regn', '🌧️'),
  65: rain('Kraftigt regn', '🌧️'),
  66: rain('Underkylt regn', '🌧️'),
  67: rain('Kraftigt underkylt regn', '🌧️'),
  71: snow('Lätt snöfall', '🌨️'),
  73: snow('Snöfall', '❄️'),
  75: snow('Kraftigt snöfall', '❄️'),
  77: snow('Kornsnö', '🌨️'),
  80: rain('Lätta regnskurar', '🌦️'),
  81: rain('Regnskurar', '🌧️'),
  82: rain('Kraftiga regnskurar', '🌧️'),
  85: snow('Lätta snöbyar', '🌨️'),
  86: snow('Snöbyar', '❄️'),
  95: thunder('Åska', '⛈️'),
  96: thunder('Åska med hagel', '⛈️'),
  99: thunder('Kraftig åska med hagel', '⛈️'),
};

export function conditionForWmoCode(code: number): WeatherCondition {
  return CONDITIONS[code] ?? UNKNOWN;
}

/** Måne i stället för sol när det är natt och himlen är klar. */
export function symbolFor(condition: WeatherCondition, isDay: boolean): string {
  if (!isDay && condition.clearSky) {
    return '🌙';
  }
  return condition.symbol;
}
