import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { WeatherIconName } from '../core/weather-icon-name';

/** En form i en vädersymbol: antingen fylld eller ritad som linje. */
interface IconPart {
  d: string;
  fill?: string;
  stroke?: string;
  width?: number;
}

/**
 * Färgade vädersymboler i ett 24×24-rutnät. Till skillnad från plaggikonerna
 * bär de egna färger i stället för currentColor: solen ska vara gul och
 * dropparna blå även i en app som annars är dämpad.
 *
 * Banorna är genererade ur ett provblad, inte skrivna för hand, och sedan
 * granskade i 58, 24 och 18 px. Flingorna är det känsligaste: för ljusa
 * försvinner de mot den off-white bottnen, för stora blir de grus i timstripen.
 */
const ICONS: Record<WeatherIconName, IconPart[]> = {
  sun: [
    { d: 'M19.40 12.00L22.60 12.00M17.23 17.23L19.50 19.50M12.00 19.40L12.00 22.60M6.77 17.23L4.50 19.50M4.60 12.00L1.40 12.00M6.77 6.77L4.50 4.50M12.00 4.60L12.00 1.40M17.23 6.77L19.50 4.50', stroke: '#eec14e', width: 2 },
    { d: 'M12 6.6a5.4 5.4 0 1 1 0 10.8 5.4 5.4 0 0 1 0-10.8z', fill: '#eec14e' },
  ],
  moon: [
    { d: 'M14.8 3.4a9 9 0 1 0 5.8 15.2 7.4 7.4 0 0 1-5.8-15.2z', fill: '#c9cfda' },
  ],
  'partly-cloudy': [
    { d: 'M15.00 9.40L17.80 9.40M13.36 13.36L15.34 15.34M9.40 15.00L9.40 17.80M5.44 13.36L3.46 15.34M3.80 9.40L1.00 9.40M5.44 5.44L3.46 3.46M9.40 3.80L9.40 1.00M13.36 5.44L15.34 3.46', stroke: '#eec14e', width: 2 },
    { d: 'M9.4 5.7a3.7 3.7 0 1 1 0 7.4 3.7 3.7 0 0 1 0-7.4z', fill: '#eec14e' },
    { d: 'M10 19h7.4a3.2 3.2 0 0 0 .4-6.4 4.7 4.7 0 0 0-8.9-1 3.3 3.3 0 0 0 1.1 7.4z', fill: '#b9bfc8' },
  ],
  cloudy: [
    { d: 'M5.4 13.6h8.2a3.4 3.4 0 0 0 .4-6.8 5 5 0 0 0-9.5-1.1 3.5 3.5 0 0 0 .9 7.9z', fill: '#b9bfc8' },
    { d: 'M7.6 18.4h9.1a3.9 3.9 0 0 0 .5-7.8 5.7 5.7 0 0 0-10.8-1.3 4 4 0 0 0 1.2 9.1z', fill: '#98a0aa' },
  ],
  fog: [
    { d: 'M7.6 18.4h9.1a3.9 3.9 0 0 0 .5-7.8 5.7 5.7 0 0 0-10.8-1.3 4 4 0 0 0 1.2 9.1z', fill: '#b9bfc8' },
    { d: 'M5.4 20.6h13.2M7.6 22.8h8.8', stroke: '#a9b0b9', width: 1.7 },
  ],
  rain: [
    { d: 'M7.6 18.4h9.1a3.9 3.9 0 0 0 .5-7.8 5.7 5.7 0 0 0-10.8-1.3 4 4 0 0 0 1.2 9.1z', fill: '#b9bfc8' },
    { d: 'M8.6 19.6c1.5 1.9 1.5 2.6 0 3.6-1.5-1-1.5-1.7 0-3.6z', fill: '#6f9cc6' },
    { d: 'M12 20.4c1.5 1.9 1.5 2.6 0 3.6-1.5-1-1.5-1.7 0-3.6z', fill: '#6f9cc6' },
    { d: 'M15.4 19.6c1.5 1.9 1.5 2.6 0 3.6-1.5-1-1.5-1.7 0-3.6z', fill: '#6f9cc6' },
  ],
  showers: [
    { d: 'M13.20 8.00L15.60 8.00M11.79 11.39L13.49 13.09M8.40 12.80L8.40 15.20M5.01 11.39L3.31 13.09M3.60 8.00L1.20 8.00M5.01 4.61L3.31 2.91M8.40 3.20L8.40 0.80M11.79 4.61L13.49 2.91', stroke: '#eec14e', width: 2 },
    { d: 'M8.4 4.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4z', fill: '#eec14e' },
    { d: 'M10 19h7.4a3.2 3.2 0 0 0 .4-6.4 4.7 4.7 0 0 0-8.9-1 3.3 3.3 0 0 0 1.1 7.4z', fill: '#b9bfc8' },
    { d: 'M12.4 20.2c1.5 1.9 1.5 2.6 0 3.6-1.5-1-1.5-1.7 0-3.6z', fill: '#6f9cc6' },
    { d: 'M15.8 19.4c1.5 1.9 1.5 2.6 0 3.6-1.5-1-1.5-1.7 0-3.6z', fill: '#6f9cc6' },
  ],
  sleet: [
    { d: 'M7.6 18.4h9.1a3.9 3.9 0 0 0 .5-7.8 5.7 5.7 0 0 0-10.8-1.3 4 4 0 0 0 1.2 9.1z', fill: '#b9bfc8' },
    { d: 'M9 19.6c1.5 1.9 1.5 2.6 0 3.6-1.5-1-1.5-1.7 0-3.6z', fill: '#6f9cc6' },
    { d: 'M15.20 18.10L15.20 23.50M12.86 19.45L17.54 22.15M17.54 19.45L12.86 22.15', stroke: '#a9c8e2', width: 1.75 },
  ],
  snow: [
    { d: 'M7.6 18.4h9.1a3.9 3.9 0 0 0 .5-7.8 5.7 5.7 0 0 0-10.8-1.3 4 4 0 0 0 1.2 9.1z', fill: '#b9bfc8' },
    { d: 'M8.80 18.10L8.80 23.50M6.46 19.45L11.14 22.15M11.14 19.45L6.46 22.15', stroke: '#a9c8e2', width: 1.75 },
    { d: 'M15.20 18.10L15.20 23.50M12.86 19.45L17.54 22.15M17.54 19.45L12.86 22.15', stroke: '#a9c8e2', width: 1.75 },
  ],
  thunder: [
    { d: 'M7.6 18.4h9.1a3.9 3.9 0 0 0 .5-7.8 5.7 5.7 0 0 0-10.8-1.3 4 4 0 0 0 1.2 9.1z', fill: '#98a0aa' },
    { d: 'M12.6 18.2l-3.4 0 2.2 2.6-1.4 3.2 4.6-3.8-2.4 0 1.6-2z', fill: '#e6a23c' },
  ],
};

@Component({
  selector: 'app-weather-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        *ngFor="let part of parts"
        [attr.d]="part.d"
        [attr.fill]="part.fill ?? 'none'"
        [attr.stroke]="part.stroke ?? null"
        [attr.stroke-width]="part.width ?? null"
        stroke-linecap="round"
      ></path>
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }

      svg {
        display: block;
      }
    `,
  ],
})
export class WeatherIconComponent {
  @Input({ required: true }) name!: WeatherIconName;
  @Input() size = 24;

  get parts(): IconPart[] {
    return ICONS[this.name] ?? [];
  }
}
