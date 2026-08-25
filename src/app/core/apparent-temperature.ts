/**
 * Känns-som-temperatur för källor som inte räknar ut den själva, som SMHI.
 *
 * I kylan används JAG/TI-formeln för vindkyla, samma som SMHI själva anger som
 * vindkyla, och i värmen Steadmans skuggformel där luftfuktigheten är det som
 * spelar roll. I det tempererade spannet däremellan lämnas lufttemperaturen
 * orörd: formlerna är inte giltiga där, och skillnaden ändrar ändå inte vad man
 * behöver ha på sig.
 */

/** Under den här temperaturen räknar vi vindkyla. */
const WIND_CHILL_MAX_TEMPERATURE = 10;
/** JAG/TI kräver mer vind än så för att gälla, i km/h. */
const WIND_CHILL_MIN_WIND_KMH = 4.8;
/** Över den här temperaturen räknar vi in luftfuktigheten. */
const HEAT_MIN_TEMPERATURE = 27;

function windChill(temperature: number, windSpeedKmh: number): number {
  const factor = Math.pow(windSpeedKmh, 0.16);
  return (
    13.12 + 0.6215 * temperature - 11.37 * factor + 0.3965 * temperature * factor
  );
}

function steadmanApparent(
  temperature: number,
  windSpeedMs: number,
  relativeHumidity: number
): number {
  // Vattenångans tryck i hPa enligt Magnus-formeln.
  const vapourPressure =
    (relativeHumidity / 100) *
    6.105 *
    Math.exp((17.27 * temperature) / (237.7 + temperature));

  return temperature + 0.33 * vapourPressure - 0.7 * windSpeedMs - 4;
}

export function apparentTemperature(
  temperature: number,
  windSpeedMs: number,
  relativeHumidity: number
): number {
  const windSpeedKmh = windSpeedMs * 3.6;

  if (temperature <= WIND_CHILL_MAX_TEMPERATURE && windSpeedKmh > WIND_CHILL_MIN_WIND_KMH) {
    return windChill(temperature, windSpeedKmh);
  }

  if (temperature >= HEAT_MIN_TEMPERATURE) {
    return steadmanApparent(temperature, windSpeedMs, relativeHumidity);
  }

  return temperature;
}
