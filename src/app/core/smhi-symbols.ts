import { WeatherIconName } from './weather-icon-name';
import { WeatherCondition } from './weather.models';

/**
 * SMHI:s vädersymbol Wsymb2, 1–27. Namnen är SMHI:s egna, översatta till
 * svenska enligt parametertabellen i deras dokumentation.
 * https://opendata.smhi.se/metfcst/snow1gv1/parameters
 */
const UNKNOWN: WeatherCondition = {
  label: 'Okänt väder',
  icon: 'cloudy',
  clearSky: false,
  isRain: false,
  isSnow: false,
  isThunder: false,
};

function dry(label: string, icon: WeatherIconName, clearSky = false): WeatherCondition {
  return { label, icon, clearSky, isRain: false, isSnow: false, isThunder: false };
}

function rain(label: string, icon: WeatherIconName): WeatherCondition {
  return { label, icon, clearSky: false, isRain: true, isSnow: false, isThunder: false };
}

/** Snöblandat regn räknas som både regn och snö: paraply hjälper inte. */
function sleet(label: string, icon: WeatherIconName): WeatherCondition {
  return { label, icon, clearSky: false, isRain: true, isSnow: true, isThunder: false };
}

function snow(label: string, icon: WeatherIconName): WeatherCondition {
  return { label, icon, clearSky: false, isRain: false, isSnow: true, isThunder: false };
}

function thunder(label: string, icon: WeatherIconName): WeatherCondition {
  return { label, icon, clearSky: false, isRain: true, isSnow: false, isThunder: true };
}

const SYMBOLS: Record<number, WeatherCondition> = {
  1: dry('Klart', 'sun', true),
  2: dry('Nästan klart', 'sun', true),
  3: dry('Växlande molnighet', 'partly-cloudy'),
  4: dry('Halvklart', 'partly-cloudy'),
  5: dry('Molnigt', 'cloudy'),
  6: dry('Mulet', 'cloudy'),
  7: dry('Dimma', 'fog'),
  8: rain('Lätta regnskurar', 'showers'),
  9: rain('Måttliga regnskurar', 'showers'),
  10: rain('Kraftiga regnskurar', 'showers'),
  11: thunder('Åskskurar', 'thunder'),
  12: sleet('Lätta byar av snöblandat regn', 'sleet'),
  13: sleet('Måttliga byar av snöblandat regn', 'sleet'),
  14: sleet('Kraftiga byar av snöblandat regn', 'sleet'),
  15: snow('Lätta snöbyar', 'snow'),
  16: snow('Måttliga snöbyar', 'snow'),
  17: snow('Kraftiga snöbyar', 'snow'),
  18: rain('Lätt regn', 'rain'),
  19: rain('Måttligt regn', 'rain'),
  20: rain('Kraftigt regn', 'rain'),
  21: thunder('Åska', 'thunder'),
  22: sleet('Lätt snöblandat regn', 'sleet'),
  23: sleet('Måttligt snöblandat regn', 'sleet'),
  24: sleet('Kraftigt snöblandat regn', 'sleet'),
  25: snow('Lätt snöfall', 'snow'),
  26: snow('Måttligt snöfall', 'snow'),
  27: snow('Kraftigt snöfall', 'snow'),
};

export function conditionForSmhiSymbol(code: number): WeatherCondition {
  return SYMBOLS[code] ?? UNKNOWN;
}
