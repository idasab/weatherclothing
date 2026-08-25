import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { symbolFor } from '../core/weather-codes';
import { HourForecast } from '../core/weather.models';

@Component({
  selector: 'app-hour-strip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <header>
        <h2 class="card-heading">Närmaste timmarna</h2>
        <span class="legend" *ngIf="hasRainRisk">Risk för regn</span>
      </header>
      <ol>
        <li *ngFor="let hour of hours; let first = index">
          <span class="time">{{ first === 0 ? 'Nu' : hour.label }}</span>
          <span class="symbol" aria-hidden="true">{{ symbol(hour) }}</span>
          <span class="temp">{{ round(hour.temperature) }}°</span>
          <span
            *ngIf="hasRainRisk"
            class="rain"
            [class.dry]="hour.precipitationProbability < 20"
            [attr.aria-label]="hour.precipitationProbability + ' procent risk för nedbörd'"
          >
            {{ round(hour.precipitationProbability) }}%
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
        font-size: 17px;
        line-height: 1;
        opacity: 0.85;
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

  /**
   * Står det noll på varje timme bär kolumnen ingen information, och då är den
   * bara brus. Räcker det till en enda procent visas hela serien igen.
   */
  get hasRainRisk(): boolean {
    return this.hours.some((hour) => hour.precipitationProbability > 0);
  }

  symbol(hour: HourForecast): string {
    return symbolFor(hour.condition, hour.isDay);
  }

  round(value: number): number {
    return Math.round(value);
  }
}
