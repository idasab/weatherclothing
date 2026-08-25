import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { weatherIconFor } from '../core/weather-codes';
import { WeatherIconComponent } from './weather-icon.component';
import { WeatherIconName } from '../core/weather-icon-name';
import { HourForecast } from '../core/weather.models';

/** Under den här procenten visas ingen siffra alls. */
const RISK_FLOOR = 10;

@Component({
  selector: 'app-hour-strip',
  standalone: true,
  imports: [CommonModule, WeatherIconComponent],
  template: `
    <section class="card">
      <header>
        <h2 class="card-heading">{{ heading }}</h2>
        <span class="legend" *ngIf="hasRainRisk">Risk för regn</span>
      </header>
      <ol>
        <li *ngFor="let hour of hours; let first = index">
          <span class="time">{{ showNow && first === 0 ? 'Nu' : hour.label }}</span>
          <app-weather-icon class="symbol" [name]="icon(hour)" [size]="20"></app-weather-icon>
          <span class="temp">{{ round(hour.temperature) }}°</span>
          <span
            *ngIf="hasRainRisk"
            class="rain"
            [class.dry]="hour.precipitationProbability < 20"
            [attr.aria-label]="riskLabel(hour) ? riskLabel(hour) + ' risk för nedbörd' : null"
          >
            {{ riskLabel(hour) }}
          </span>
        </li>
      </ol>
    </section>
  `,
  styles: [
    `
      header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
      }

      .legend {
        font-size: 10.5px;
        letter-spacing: 0.3px;
        color: var(--text-faint);
      }

      ol {
        display: flex;
        gap: 2px;
        margin: 14px -20px -6px;
        padding: 0 20px 6px;
        list-style: none;
        overflow-x: auto;
        scroll-snap-type: x proximity;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
      }

      ol::-webkit-scrollbar {
        display: none;
      }

      li {
        display: flex;
        flex: 0 0 auto;
        flex-direction: column;
        align-items: center;
        gap: 7px;
        min-width: 54px;
        padding: 4px 4px 2px;
        scroll-snap-align: start;
      }

      .time {
        font-size: 11px;
        letter-spacing: 0.2px;
        color: var(--text-faint);
      }

      .symbol {
        display: inline-flex;
      }

      .temp {
        font-size: 14px;
        font-weight: 400;
      }

      .rain {
        font-size: 10.5px;
        color: var(--text-muted);
      }

      .rain.dry {
        color: var(--text-faint);
      }
    `,
  ],
})
export class HourStripComponent {
  @Input({ required: true }) hours!: HourForecast[];
  @Input() heading = 'Närmaste timmarna';
  /** Falskt för en kommande dag, där ingen timme är "nu". */
  @Input() showNow = true;

  /**
   * Under tio procent visas ingen siffra. Ett värde som 3 % läses lätt som
   * "ingen risk", och då är en tom ruta ärligare än en missvisande siffra.
   * Når ingen timme upp till tröskeln försvinner hela kolumnen med etikett.
   */
  get hasRainRisk(): boolean {
    return this.hours.some((hour) => hour.precipitationProbability >= RISK_FLOOR);
  }

  riskLabel(hour: HourForecast): string {
    return hour.precipitationProbability >= RISK_FLOOR
      ? `${Math.round(hour.precipitationProbability)}%`
      : '';
  }

  icon(hour: HourForecast): WeatherIconName {
    return weatherIconFor(hour.condition, hour.isDay);
  }

  round(value: number): number {
    return Math.round(value);
  }
}
