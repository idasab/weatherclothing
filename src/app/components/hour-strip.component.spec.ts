import { ComponentFixture, TestBed } from '@angular/core/testing';
import { conditionForWmoCode } from '../core/weather-codes';
import { HourForecast } from '../core/weather.models';
import { HourStripComponent } from './hour-strip.component';

function hour(precipitationProbability: number, label: string): HourForecast {
  return {
    time: `2026-08-24T${label}`,
    label,
    temperature: 14,
    apparentTemperature: 14,
    precipitationProbability,
    precipitation: 0,
    condition: conditionForWmoCode(1),
    isDay: true,
  };
}

describe('HourStripComponent', () => {
  let fixture: ComponentFixture<HourStripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HourStripComponent] }).compileComponents();
    fixture = TestBed.createComponent(HourStripComponent);
  });

  function render(hours: HourForecast[]): HTMLElement {
    fixture.componentInstance.hours = hours;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('gömmer procenten helt när varje timme står på noll', () => {
    const element = render([hour(0, '15:00'), hour(0, '16:00'), hour(0, '17:00')]);

    expect(element.querySelectorAll('.rain').length).toBe(0);
    expect(element.querySelector('.legend')).toBeNull();
    // Temperaturerna ska så klart stå kvar.
    expect(element.querySelectorAll('.temp').length).toBe(3);
  });

  it('visar hela serien så snart en timme har risk', () => {
    const element = render([hour(0, '15:00'), hour(3, '16:00'), hour(0, '17:00')]);

    const values = Array.from(element.querySelectorAll('.rain')).map((node) => node.textContent?.trim());
    expect(values).toEqual(['0%', '3%', '0%']);
    expect(element.querySelector('.legend')?.textContent?.trim()).toBe('Risk för regn');
  });

  it('dämpar låga värden men behåller dem läsbara', () => {
    const element = render([hour(10, '15:00'), hour(60, '16:00')]);

    const [low, high] = Array.from(element.querySelectorAll('.rain'));
    expect(low.classList.contains('dry')).toBe(true);
    expect(high.classList.contains('dry')).toBe(false);
  });

  it('skriver ut Nu på den första timmen', () => {
    const element = render([hour(0, '15:00'), hour(0, '16:00')]);

    const times = Array.from(element.querySelectorAll('.time')).map((node) => node.textContent?.trim());
    expect(times).toEqual(['Nu', '16:00']);
  });
});
