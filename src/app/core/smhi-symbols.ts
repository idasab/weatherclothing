import { WeatherCondition } from './weather.models';

/**
 * SMHI:s vädersymbol Wsymb2, 1–27. Namnen är SMHI:s egna, översatta till
 * svenska enligt parametertabellen i deras dokumentation.
 * https://opendata.smhi.se/metfcst/snow1gv1/parameters
 */
const UNKNOWN: WeatherCondition = {
  label: 'Okänt väder',
  symbol: '❔',
  clearSky: false,
  isRain: false,
  isSnow: false,
  isThunder: false,
};

function dry(label: string, symbol: string, clearSky = false): WeatherCondition {
  return { label, symbol, clearSky, isRain: false, isSnow: false, isThunder: false };
}

function rain(label: string, symbol: string): WeatherCondition {
  return { label, symbol, clearSky: false, isRain: true, isSnow: false, isThunder: false };
}

/** Snöblandat regn räknas som både regn och snö: paraply hjälper inte. */
function sleet(label: string, symbol: string): WeatherCondition {
  return { label, symbol, clearSky: false, isRain: true, isSnow: true, isThunder: false };
}

function snow(label: string, symbol: string): WeatherCondition {
  return { label, symbol, clearSky: false, isRain: false, isSnow: true, isThunder: false };
}

function thunder(label: string, symbol: string): WeatherCondition {
  return { label, symbol, clearSky: false, isRain: true, isSnow: false, isThunder: true };
}

const SYMBOLS: Record<number, WeatherCondition> = {
  1: dry('Klart', '☀️', true),
  2: dry('Nästan klart', '🌤️', true),
  3: dry('Växlande molnighet', '⛅'),
  4: dry('Halvklart', '⛅'),
  5: dry('Molnigt', '☁️'),
  6: dry('Mulet', '☁️'),
  7: dry('Dimma', '🌫️'),
  8: rain('Lätta regnskurar', '🌦️'),
  9: rain('Måttliga regnskurar', '🌧️'),
  10: rain('Kraftiga regnskurar', '🌧️'),
  11: thunder('Åskskurar', '⛈️'),
  12: sleet('Lätta byar av snöblandat regn', '🌨️'),
  13: sleet('Måttliga byar av snöblandat regn', '🌨️'),
  14: sleet('Kraftiga byar av snöblandat regn', '🌨️'),
  15: snow('Lätta snöbyar', '🌨️'),
  16: snow('Måttliga snöbyar', '❄️'),
  17: snow('Kraftiga snöbyar', '❄️'),
  18: rain('Lätt regn', '🌦️'),
  19: rain('Måttligt regn', '🌧️'),
  20: rain('Kraftigt regn', '🌧️'),
  21: thunder('Åska', '⛈️'),
  22: sleet('Lätt snöblandat regn', '🌨️'),
  23: sleet('Måttligt snöblandat regn', '🌨️'),
  24: sleet('Kraftigt snöblandat regn', '🌨️'),
  25: snow('Lätt snöfall', '🌨️'),
  26: snow('Måttligt snöfall', '❄️'),
  27: snow('Kraftigt snöfall', '❄️'),
};

export function conditionForSmhiSymbol(code: number): WeatherCondition {
  return SYMBOLS[code] ?? UNKNOWN;
}
