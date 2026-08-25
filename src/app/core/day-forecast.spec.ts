import { DatedHour, eveningFrom, tomorrowFrom } from './day-forecast';
import { conditionForWmoCode } from './weather-codes';
import { HourForecast } from './weather.models';

const CLEAR = conditionForWmoCode(1);
const CLOUDY = conditionForWmoCode(3);
const RAIN = conditionForWmoCode(63);
const THUNDER = conditionForWmoCode(95);

function dated(
  date: string,
  hourOfDay: number,
  overrides: Partial<HourForecast> = {}
): DatedHour {
  const label = `${String(hourOfDay).padStart(2, '0')}:00`;

  return {
    date,
    hourOfDay,
    hour: {
      time: `${date}T${label}`,
      label,
      temperature: 10,
      apparentTemperature: 10,
      precipitationProbability: 0,
      precipitation: 0,
      windSpeed: 3,
      windGusts: 6,
      condition: CLEAR,
      isDay: true,
      ...overrides,
    },
  };
}

/** Ett dygn med tolv dagtimmar, 07–18. */
function fullDay(date: string, overrides: (hour: number) => Partial<HourForecast> = () => ({})) {
  return Array.from({ length: 12 }, (_, index) => dated(date, 7 + index, overrides(7 + index)));
}

describe('tomorrowFrom', () => {
  it('ger null när serien inte räcker bortom i dag', () => {
    expect(tomorrowFrom(fullDay('2026-08-25'), '2026-08-25', 3)).toBeNull();
  });

  it('ger null när morgondagen bara har ett par timmar', () => {
    const series = [...fullDay('2026-08-25'), dated('2026-08-26', 7), dated('2026-08-26', 8)];

    expect(tomorrowFrom(series, '2026-08-25', 3)).toBeNull();
  });

  it('väljer nästa dygn, inte det närmast bortom det', () => {
    const series = [...fullDay('2026-08-26'), ...fullDay('2026-08-27')];

    expect(tomorrowFrom(series, '2026-08-25', 3)?.date).toBe('2026-08-26');
  });

  it('tar värdena från tiden man går ut', () => {
    const series = [
      ...fullDay('2026-08-26', (hour) => ({ temperature: hour === 8 ? 14 : 25 })),
    ];

    // Åtta på morgonen får representera dagen, inte middagsvärmen.
    expect(tomorrowFrom(series, '2026-08-25', 3)?.temperature).toBe(14);
  });

  it('räknar max och min på hela dygnet', () => {
    const series = [
      ...fullDay('2026-08-26', (hour) => ({ temperature: hour })),
      dated('2026-08-26', 3, { temperature: -4 }),
    ];

    const tomorrow = tomorrowFrom(series, '2026-08-25', 3);
    expect(tomorrow?.dayMax).toBe(18);
    expect(tomorrow?.dayMin).toBe(-4);
  });

  it('tar vinden som dagens högsta, eftersom paraplyet fälls av den värsta byn', () => {
    const series = fullDay('2026-08-26', (hour) => ({
      windSpeed: hour === 15 ? 11 : 2,
      windGusts: hour === 15 ? 19 : 4,
    }));

    const tomorrow = tomorrowFrom(series, '2026-08-25', 3);
    expect(tomorrow?.windSpeed).toBe(11);
    expect(tomorrow?.windGusts).toBe(19);
  });

  it('visar dagens värsta väder, inte vädret vid åtta', () => {
    const series = fullDay('2026-08-26', (hour) => ({
      condition: hour === 8 ? CLEAR : hour === 14 ? RAIN : CLOUDY,
    }));

    expect(tomorrowFrom(series, '2026-08-25', 3)?.condition.isRain).toBe(true);
  });

  it('låter åska gå före regn i dagens sammanfattning', () => {
    const series = fullDay('2026-08-26', (hour) => ({
      condition: hour === 12 ? RAIN : hour === 16 ? THUNDER : CLOUDY,
    }));

    expect(tomorrowFrom(series, '2026-08-25', 3)?.condition.isThunder).toBe(true);
  });

  it('behåller bara dagtimmarna', () => {
    const series = [
      dated('2026-08-26', 2),
      ...fullDay('2026-08-26'),
      dated('2026-08-26', 23),
    ];

    const hours = tomorrowFrom(series, '2026-08-25', 3)?.hours ?? [];
    expect(hours.length).toBe(12);
    expect(hours.map((hour) => hour.label)).not.toContain('02:00');
    expect(hours.map((hour) => hour.label)).not.toContain('23:00');
  });

  it('bär UV-indexet vidare, så solskyddsråden gäller rätt dag', () => {
    expect(tomorrowFrom(fullDay('2026-08-26'), '2026-08-25', 7.5)?.uvIndexMax).toBe(7.5);
  });
});

describe('eveningFrom', () => {
  /** Ett dygn från klockan tolv, med kvällstimmar 18–23. */
  function fromNoon(overrides: (hour: number) => Partial<HourForecast> = () => ({})) {
    return Array.from({ length: 12 }, (_, index) =>
      dated('2026-08-25', 12 + index, overrides(12 + index))
    );
  }

  it('ger null när kvällen redan har börjat', () => {
    const series = Array.from({ length: 5 }, (_, index) => dated('2026-08-25', 19 + index));

    // Är klockan redan 19 täcker nulägets råd kvällen.
    expect(eveningFrom(series, '2026-08-25')).toBeNull();
  });

  it('ger null när bara en kvällstimme återstår i serien', () => {
    const series = [dated('2026-08-25', 12), dated('2026-08-25', 18)];

    expect(eveningFrom(series, '2026-08-25')).toBeNull();
  });

  it('tar den kallaste timmen, inte den första', () => {
    const series = fromNoon((hour) => ({
      temperature: hour === 22 ? 4 : 15,
      apparentTemperature: hour === 22 ? 2 : 15,
    }));

    const evening = eveningFrom(series, '2026-08-25');
    expect(evening?.apparentTemperature).toBe(2);
    expect(evening?.temperature).toBe(4);
  });

  it('utelämnar UV-index, eftersom solskyddsråd inte hör till kvällen', () => {
    expect(eveningFrom(fromNoon(), '2026-08-25')?.uvIndexMax).toBe(0);
  });

  it('behåller bara kvällstimmarna', () => {
    const evening = eveningFrom(fromNoon(), '2026-08-25');

    expect(evening?.hours.map((hour) => hour.label)).toEqual([
      '18:00',
      '19:00',
      '20:00',
      '21:00',
      '22:00',
      '23:00',
    ]);
  });

  it('visar kvällens värsta väder', () => {
    const series = fromNoon((hour) => ({ condition: hour === 20 ? RAIN : CLEAR }));

    expect(eveningFrom(series, '2026-08-25')?.condition.isRain).toBe(true);
  });

  it('tar vinden som kvällens högsta', () => {
    const series = fromNoon((hour) => ({ windGusts: hour === 21 ? 17 : 3 }));

    expect(eveningFrom(series, '2026-08-25')?.windGusts).toBe(17);
  });

  it('bryr sig inte om morgondagens kväll', () => {
    const series = [...fromNoon(), dated('2026-08-26', 20), dated('2026-08-26', 21)];

    const evening = eveningFrom(series, '2026-08-25');
    expect(evening?.hours.every((hour) => hour.time.startsWith('2026-08-25'))).toBe(true);
  });
});
