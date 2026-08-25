import { AdviceInput, adviseFor } from './clothing-advisor';
import { conditionForSmhiSymbol } from './smhi-symbols';
import { conditionForWmoCode } from './weather-codes';
import { HourForecast } from './weather.models';

const CLEAR = conditionForWmoCode(1);
const RAIN = conditionForWmoCode(63);
const SNOW = conditionForWmoCode(73);
const THUNDER = conditionForWmoCode(95);

function hour(overrides: Partial<HourForecast> = {}): HourForecast {
  return {
    time: '2026-08-24T15:00',
    label: '15:00',
    temperature: 12,
    apparentTemperature: 11,
    precipitationProbability: 0,
    precipitation: 0,
    windSpeed: 3,
    windGusts: 5,
    condition: CLEAR,
    isDay: true,
    ...overrides,
  };
}

function conditions(overrides: Partial<AdviceInput> = {}): AdviceInput {
  return {
    temperature: 12,
    apparentTemperature: 11,
    windSpeed: 3,
    windGusts: 5,
    uvIndexMax: 2,
    isDay: true,
    hours: [hour(), hour({ label: '16:00' })],
    ...overrides,
  };
}

describe('adviseFor', () => {
  it('säger nej till paraply när prognosen är torr', () => {
    const advice = adviseFor(conditions());

    expect(advice.umbrella.level).toBe('none');
    expect(advice.umbrella.reason).toBe('');
    expect(advice.extras.map((extra) => extra.label)).not.toContain('Paraply');
    // Torrt väder ska inte lägga någon paraplyrad under "Värt att veta".
    expect(advice.notes.some((note) => note.toLowerCase().includes('paraply'))).toBe(false);
  });

  it('säger ja till paraply när nedbördsrisken är hög', () => {
    const advice = adviseFor(
      conditions({
        hours: [
          hour({ condition: RAIN, precipitationProbability: 80, precipitation: 1.2 }),
          hour({
            label: '16:00',
            condition: RAIN,
            precipitationProbability: 60,
            precipitation: 0.8,
          }),
        ],
      })
    );

    expect(advice.umbrella.level).toBe('yes');
    expect(advice.umbrella.reason).toContain('80 %');
    expect(advice.extras.map((extra) => extra.label)).toContain('Paraply');
    // Motiveringen ligger först bland anteckningarna.
    expect(advice.notes[0]).toContain('80 %');
  });

  it('nöjer sig med ett kanske vid måttlig risk', () => {
    const advice = adviseFor(conditions({ hours: [hour({ precipitationProbability: 35 })] }));

    expect(advice.umbrella.level).toBe('maybe');
    expect(advice.extras.map((extra) => extra.label)).toContain('Litet paraply');
  });

  it('rekommenderar regnjacka i stället för paraply när det blåser hårt', () => {
    const advice = adviseFor(
      conditions({
        windSpeed: 11,
        windGusts: 16,
        hours: [hour({ condition: RAIN, precipitationProbability: 90, precipitation: 2 })],
      })
    );

    expect(advice.umbrella.level).toBe('raincoat');
    expect(advice.umbrella.reason).toContain('vänder ett paraply ut och in');
    expect(advice.notes[0]).toContain('16 m/s');

    const labels = advice.extras.map((extra) => extra.label);
    // Listan får inte säga paraply när rådet är regnjacka.
    expect(labels).toContain('Regnjacka');
    expect(labels).not.toContain('Paraply');
    expect(labels).not.toContain('Vindtätt ytterlager');
  });

  it('byter paraply mot luva när det snöar', () => {
    const advice = adviseFor(
      conditions({
        temperature: -3,
        apparentTemperature: -7,
        hours: [
          hour({
            condition: SNOW,
            apparentTemperature: -7,
            precipitationProbability: 90,
            precipitation: 0.6,
          }),
        ],
      })
    );

    expect(advice.umbrella.level).toBe('hood');
    const labels = advice.extras.map((extra) => extra.label);
    expect(labels).toContain('Jacka med luva');
    expect(labels).toContain('Mössa');
    expect(labels).toContain('Vantar');
  });

  it('låter åska gå före både blåst och regnmängd', () => {
    const advice = adviseFor(
      conditions({
        windGusts: 18,
        hours: [hour({ condition: THUNDER, precipitationProbability: 95, precipitation: 4 })],
      })
    );

    expect(advice.umbrella.level).toBe('raincoat');
    expect(advice.umbrella.reason).toContain('åskväder');
    expect(advice.notes.some((note) => note.includes('inomhus'))).toBe(true);
  });

  it('läser snö likadant oavsett om källan är SMHI eller Open-Meteo', () => {
    // SMHI 26 är måttligt snöfall, 23 måttligt snöblandat regn, WMO 73 snöfall.
    for (const condition of [conditionForSmhiSymbol(26), conditionForSmhiSymbol(23), SNOW]) {
      const advice = adviseFor(
        conditions({
          hours: [hour({ condition, precipitationProbability: 80, precipitation: 0.8 })],
        })
      );

      expect(advice.umbrella.level).toBe('hood');
    }
  });

  it('väljer klädzon utifrån känns-som-temperaturen, inte termometern', () => {
    const advice = adviseFor(conditions({ temperature: 8, apparentTemperature: 1 }));

    expect(advice.band).toBe('Kallt');
    expect(advice.notes.some((note) => note.includes('känns som'))).toBe(true);
  });

  it('varnar för att kvällen blir kallare', () => {
    const advice = adviseFor(
      conditions({
        apparentTemperature: 18,
        hours: [hour({ apparentTemperature: 18 }), hour({ label: '22:00', apparentTemperature: 9 })],
      })
    );

    expect(advice.notes.some((note) => note.includes('kallare'))).toBe(true);
  });

  it('utelämnar anteckningen om kallare kväll när den visas separat', () => {
    const hours = [hour({ apparentTemperature: 18 }), hour({ label: '22:00', apparentTemperature: 9 })];
    const conditionsWithDrop = conditions({ apparentTemperature: 18, hours });

    const utan = adviseFor(conditionsWithDrop);
    const med = adviseFor(conditionsWithDrop, { eveningShownSeparately: true });

    expect(utan.notes.some((note) => note.includes('kallare'))).toBe(true);
    expect(med.notes.some((note) => note.includes('kallare'))).toBe(false);
    // Övriga anteckningar ska inte påverkas.
    expect(med.notes.length).toBe(utan.notes.length - 1);
  });

  it('föreslår solskydd när UV-indexet är högt', () => {
    const advice = adviseFor(conditions({ apparentTemperature: 26, uvIndexMax: 8 }));

    const labels = advice.extras.map((extra) => extra.label);
    expect(labels).toContain('Solglasögon');
    expect(labels).toContain('Solskyddsfaktor');
    expect(labels).toContain('Keps eller hatt');
    expect(advice.band).toBe('Riktigt varmt');
  });

  it('utelämnar solskyddsråd när källan saknar UV-index', () => {
    const advice = adviseFor(conditions({ apparentTemperature: 26, uvIndexMax: 0 }));

    expect(advice.extras.map((extra) => extra.label)).not.toContain('Solglasögon');
  });
});
