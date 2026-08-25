import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Garment } from '../core/clothing-advisor';
import { GarmentIconComponent } from './garment-icon.component';

@Component({
  selector: 'app-garment-list',
  standalone: true,
  imports: [CommonModule, GarmentIconComponent],
  template: `
    <section class="card">
      <header>
        <h2 class="card-heading">{{ heading }}</h2>
        <p *ngIf="note">{{ note }}</p>
      </header>
      <ul>
        <li *ngFor="let garment of garments">
          <app-garment-icon class="icon" [name]="garment.icon"></app-garment-icon>
          <span class="label">{{ garment.label }}</span>
        </li>
      </ul>
    </section>
  `,
  styles: [
    `
      header {
        margin-bottom: 14px;
      }

      header p {
        margin: 7px 0 0;
        font-size: 14px;
        line-height: 1.5;
        color: var(--text-muted);
      }

      ul {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      li {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 13px 8px 11px;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--surface-soft);
      }

      .icon {
        /* Ritas i 18 px: linjeteckningen kollapsar under det. */
        color: var(--text);
        opacity: 0.78;
      }

      .label {
        font-size: 13.5px;
        line-height: 1.2;
      }
    `,
  ],
})
export class GarmentListComponent {
  @Input({ required: true }) heading!: string;
  @Input({ required: true }) garments!: Garment[];
  @Input() note?: string;
}
