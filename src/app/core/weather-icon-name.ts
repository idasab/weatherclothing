/**
 * Namnen på vädersymbolerna. Ligger i kärnan så väderkodstabellerna kan namnge
 * en symbol utan att bero på komponenten som ritar den. Formerna finns i
 * components/weather-icon.component.ts.
 */
export type WeatherIconName =
  | 'sun'
  | 'moon'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'rain'
  | 'showers'
  | 'sleet'
  | 'snow'
  | 'thunder';
