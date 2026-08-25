import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { GarmentIconName } from '../core/garment-icon-name';


/**
 * Linjeritade plagg i ett 24×24-rutnät. Allt är banor, inga rect eller circle,
 * så komponenten kan rendera vilken ikon som helst med samma *ngFor.
 *
 * Två saker att hålla i minnet vid ändringar: ikonerna visas i 18 px i appen och
 * detaljer under ungefär en rutenhet försvinner där, och formerna måste skilja
 * sig strukturellt snarare än i detaljer — koftan har öppen framkant, jackan en
 * mittsöm, huvjackan en huva.
 */
const ICONS: Record<GarmentIconName, string[]> = {
  't-shirt': [
    'M9.2 3.6 L5.6 5.2 L3.6 10.2 L6.6 11.4 L7 20.4 H17 L17.4 11.4 L20.4 10.2 L18.4 5.2 L14.8 3.6',
    'M9.2 3.6 C10.3 6.2 13.7 6.2 14.8 3.6',
  ],
  'long-sleeve': [
    'M9.2 3.6 L5.4 5 L2.9 15.2 L6 16.2 L6.9 20.4 H17.1 L18 16.2 L21.1 15.2 L18.6 5 L14.8 3.6',
    'M9.2 3.6 C10.3 6.2 13.7 6.2 14.8 3.6',
  ],
  'tank-top': [
    'M8.8 3.6 L7.6 7 L7.2 20.4 H16.8 L16.4 7 L15.2 3.6',
    'M8.8 3.6 C10.4 6.4 13.6 6.4 15.2 3.6',
  ],
  knit: [
    'M9.2 3.6 L5.4 5 L2.9 15.2 L6 16.2 L6.9 20.4 H17.1 L18 16.2 L21.1 15.2 L18.6 5 L14.8 3.6',
    'M9.2 3.6 C10.3 6.2 13.7 6.2 14.8 3.6',
    'M6.95 17.9 H17.05',
  ],
  hoodie: [
    'M9 4.8 L5.4 6 L2.9 15.6 L6 16.6 L6.9 20.4 H17.1 L18 16.6 L21.1 15.6 L18.6 6 L15 4.8',
    'M9 4.8 C9.4 2 14.6 2 15 4.8 C13.8 6.4 10.2 6.4 9 4.8 Z',
    'M10.7 6.6 V9.8',
    'M13.3 6.6 V9.8',
  ],
  cardigan: [
    'M9.2 3.8 L5.4 5.2 L2.9 15.4 L6 16.4 L6.9 20.4 H17.1 L18 16.4 L21.1 15.4 L18.6 5.2 L14.8 3.8',
    'M9.2 3.8 C10.4 7.6 11 9 11.3 10.2 V20.4',
    'M14.8 3.8 C13.6 7.6 13 9 12.7 10.2 V20.4',
  ],
  jacket: [
    'M9.2 3.6 L5.4 5 L2.9 15.2 L6 16.2 L6.9 20.4 H17.1 L18 16.2 L21.1 15.2 L18.6 5 L14.8 3.6',
    'M9.4 3.6 L12 6.2 L14.6 3.6',
    'M12 6.2 V20.4',
  ],
  'winter-jacket': [
    'M8.8 4.4 L4.9 5.8 L2.6 15.6 L5.9 16.6 L6.7 20.4 H17.3 L18.1 16.6 L21.4 15.6 L19.1 5.8 L15.2 4.4',
    'M9.2 4.4 L12 7 L14.8 4.4',
    'M12 7 V20.4',
    'M7.6 12.8 H9.8',
    'M14.2 12.8 H16.4',
  ],
  'hooded-jacket': [
    'M9 4.8 L5.4 6 L2.9 15.6 L6 16.6 L6.9 20.4 H17.1 L18 16.6 L21.1 15.6 L18.6 6 L15 4.8',
    'M9 4.8 C9.6 1.9 14.4 1.9 15 4.8',
    'M9.4 4.8 L12 6.8 L14.6 4.8',
    'M12 6.8 V20.4',
  ],
  'base-layer': [
    'M7.6 3.6 H16.4 L15.8 20.4 H13.4 L12 12.6 L10.6 20.4 H8.2 Z',
    'M7.7 6 H16.3',
    'M8.4 18.4 H10.5',
    'M13.5 18.4 H15.6',
  ],
  trousers: ['M5.8 3.6 H18.2 L17.2 20.4 H13.8 L12 13.4 L10.2 20.4 H6.8 Z', 'M5.9 6.4 H18.1'],
  shorts: ['M5.8 5.4 H18.2 L17.4 15.8 H13.8 L12 11.2 L10.2 15.8 H6.6 Z', 'M5.9 7.8 H18.1'],
  socks: [
    'M9 3.8 H14.8 V12.6 H17.8 C19.1 12.6 20.1 13.6 20.1 14.9 V16 C20.1 17.3 19.1 18.2 17.8 18.2 H11.3 C10 18.2 9 17.3 9 16 Z',
    'M9.1 6 H14.7',
    'M9.1 7.7 H14.7',
  ],
  shoes: [
    'M2.6 17.6 V14.8 C2.6 13.4 4.2 13 6.2 12.6 L9.8 8.8 L12.4 11.8 C16 12.2 19.8 13.4 21.4 15.6 V17.6 Z',
  ],
  boots: [
    'M8.2 4 H15 V13 H19.6 C20.8 13 21.6 13.9 21.6 15 V17.6 H8.2 Z',
    'M8.3 6.6 H14.9',
    'M8.2 15.6 H21.5',
  ],
  sandals: [
    'M12 4.2 C15.4 4.2 17.6 7.4 17.6 12 C17.6 16.6 15.4 19.8 12 19.8 C8.6 19.8 6.4 16.6 6.4 12 C6.4 7.4 8.6 4.2 12 4.2 Z',
    'M12 10.6 L8.6 5.8',
    'M12 10.6 L15.4 5.8',
    'M12 10.6 V13.4',
  ],
  beanie: [
    'M4.8 14.8 C4.8 7.6 8.4 5 12 5 C15.6 5 19.2 7.6 19.2 14.8',
    'M5.3 14.8 H18.7 C19.5 14.8 20.2 15.5 20.2 16.3 C20.2 17.1 19.5 17.8 18.7 17.8 H5.3 C4.5 17.8 3.8 17.1 3.8 16.3 C3.8 15.5 4.5 14.8 5.3 14.8 Z',
    'M10.7 3.4 C10.7 2.7 11.3 2.1 12 2.1 C12.7 2.1 13.3 2.7 13.3 3.4 C13.3 4.1 12.7 4.7 12 4.7 C11.3 4.7 10.7 4.1 10.7 3.4 Z',
  ],
  mittens: [
    'M8 20.4 V11.6 C8 8.6 9.8 6.6 12.4 6.6 C15 6.6 16.8 8.6 16.8 11.6 V20.4 Z',
    'M8 13.4 C6.2 12.6 5 13.4 5 15 C5 16.6 6.4 17.4 8 16.9',
    'M8 17.9 H16.8',
  ],
  scarf: [
    'M5.6 6.6 H18.4 C18.4 8.9 15.6 10.6 12 10.6 C8.4 10.6 5.6 8.9 5.6 6.6 Z',
    'M10.3 10.4 L9.8 19.4 H13.6 L13.1 10.4',
    'M9.8 19.4 H13.6',
  ],
  'sun-hat': [
    'M7.6 12.4 C7.6 7.6 9.6 5.4 12 5.4 C14.4 5.4 16.4 7.6 16.4 12.4',
    'M3.6 12.8 C3.6 14.6 7.4 15.8 12 15.8 C16.6 15.8 20.4 14.6 20.4 12.8 C20.4 11.8 17 11.2 12 11.2 C7 11.2 3.6 11.8 3.6 12.8 Z',
  ],
  sunglasses: [
    'M6.2 9.2 H8.6 C10 9.2 11.2 10.4 11.2 11.8 V12.8 C11.2 14.2 10 15.4 8.6 15.4 H6.2 C4.8 15.4 3.6 14.2 3.6 12.8 V11.8 C3.6 10.4 4.8 9.2 6.2 9.2 Z',
    'M15.4 9.2 H17.8 C19.2 9.2 20.4 10.4 20.4 11.8 V12.8 C20.4 14.2 19.2 15.4 17.8 15.4 H15.4 C14 15.4 12.8 14.2 12.8 12.8 V11.8 C12.8 10.4 14 9.2 15.4 9.2 Z',
    'M11.2 11.4 C11.6 10.9 12.4 10.9 12.8 11.4',
    'M3.6 10.4 L1.8 8.8',
    'M20.4 10.4 L22.2 8.8',
  ],
  sunscreen: [
    'M8 9.8 H16 V19.4 C16 20 15.5 20.5 14.9 20.5 H9.1 C8.5 20.5 8 20 8 19.4 Z',
    'M10.4 9.8 V7.2 H13.6 V9.8',
    'M10 4.4 H14 V7.2 H10 Z',
    'M12 13 V16.2',
    'M10.4 14.6 H13.6',
  ],
  bottle: [
    'M8.6 8.6 H15.4 V19.3 C15.4 20 14.8 20.6 14.1 20.6 H9.9 C9.2 20.6 8.6 20 8.6 19.3 Z',
    'M10.6 8.6 V6 H13.4 V8.6',
    'M10.2 3.4 H13.8 V6 H10.2 Z',
    'M8.7 12.4 H15.3',
  ],
  umbrella: [
    'M3.6 12.6 C3.6 7.6 7.4 4.2 12 4.2 C16.6 4.2 20.4 7.6 20.4 12.6 Z',
    'M12 12.6 V17.6 C12 19.2 10.9 20.2 9.5 20.2 C8.4 20.2 7.6 19.6 7.4 18.7',
  ],
};

@Component({
  selector: 'app-garment-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path *ngFor="let path of paths" [attr.d]="path"></path>
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
export class GarmentIconComponent {
  @Input({ required: true }) name!: GarmentIconName;
  @Input() size = 18;

  get paths(): string[] {
    return ICONS[this.name] ?? [];
  }

  /**
   * Tunnare linje när ikonen ritas stor, så vikten ser lika ut i alla storlekar.
   */
  get strokeWidth(): number {
    return this.size >= 28 ? 1.6 : 1.8;
  }
}
