import { apparentTemperature } from './apparent-temperature';

describe('apparentTemperature', () => {
  it('räknar vindkyla i kylan', () => {
    // 0° med 5 m/s ger omkring -5° enligt JAG/TI, samma formel som SMHI anger.
    expect(apparentTemperature(0, 5, 80)).toBeCloseTo(-4.9, 0);
  });

  it('gör kylan värre med hårdare vind', () => {
    const svagVind = apparentTemperature(-5, 2, 80);
    const hårdVind = apparentTemperature(-5, 12, 80);

    expect(hårdVind).toBeLessThan(svagVind);
  });

  it('lämnar lufttemperaturen orörd när det är nästan vindstilla', () => {
    // Under 4,8 km/h är vindkyleformeln inte giltig.
    expect(apparentTemperature(2, 1, 80)).toBe(2);
  });

  it('lämnar det tempererade spannet orört', () => {
    expect(apparentTemperature(18, 4, 55)).toBe(18);
  });

  it('gör fuktig hetta varmare än termometern', () => {
    const fuktigt = apparentTemperature(32, 2, 75);

    expect(fuktigt).toBeGreaterThan(32);
    // Torr hetta känns svalare än fuktig vid samma temperatur.
    expect(fuktigt).toBeGreaterThan(apparentTemperature(32, 2, 25));
  });
});
