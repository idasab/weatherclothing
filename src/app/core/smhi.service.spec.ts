import { HttpTestingController, HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SmhiHour, SmhiService } from './smhi.service';
import { SMHI_RESPONSE } from './testing/smhi-response.fixture';

describe('SmhiService', () => {
  let service: SmhiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(SmhiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('covers', () => {
    it('godkänner svenska koordinater', () => {
      expect(service.covers({ latitude: 59.33, longitude: 18.07 })).toBe(true);
      expect(service.covers({ latitude: 67.86, longitude: 20.23 })).toBe(true);
    });

    it('avvisar platser långt utanför modellområdet', () => {
      expect(service.covers({ latitude: 19.08, longitude: 72.88 })).toBe(false);
      expect(service.covers({ latitude: 40.42, longitude: -3.7 })).toBe(false);
      expect(service.covers({ latitude: 64.15, longitude: -21.94 })).toBe(false);
    });
  });

  describe('hours', () => {
    function load(coordinates = { latitude: 59.3293, longitude: 18.0686 }): SmhiHour[] {
      let hours: SmhiHour[] = [];
      service.hours(coordinates).subscribe((result) => (hours = result));

      const request = http.expectOne((candidate) => candidate.url.includes('snow1g'));
      request.flush(SMHI_RESPONSE);

      return hours;
    }

    it('avrundar koordinaterna till sex decimaler i adressen', () => {
      // Fler decimaler ger HTTP 404, och GPS:en lämnar gärna fler.
      service.hours({ latitude: 59.32932345678, longitude: 18.06861234567 }).subscribe();

      const request = http.expectOne((candidate) => candidate.url.includes('snow1g'));
      expect(request.request.url).toContain('/lon/18.068612/lat/59.329323/');
      request.flush(SMHI_RESPONSE);
    });

    it('läser hela tidsserien', () => {
      expect(load().length).toBe(SMHI_RESPONSE.timeSeries.length);
    });

    it('plockar ut de parametrar appen bygger på', () => {
      const first = load()[0];
      const source = SMHI_RESPONSE.timeSeries[0].data;

      expect(first.timeUtc).toBe(SMHI_RESPONSE.timeSeries[0].time);
      expect(first.temperature).toBe(source.air_temperature);
      expect(first.windSpeed).toBe(source.wind_speed);
      expect(first.windGusts).toBe(source.wind_speed_of_gust);
      expect(first.humidity).toBe(source.relative_humidity);
      expect(first.precipitation).toBe(source.precipitation_amount_mean);
      expect(first.precipitationProbability).toBe(source.probability_of_precipitation);
      expect(first.symbolCode).toBe(source.symbol_code);
    });

    it('tolkar tiderna som UTC med Z', () => {
      for (const hour of load()) {
        expect(hour.timeUtc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/);
      }
    });

    it('ger rimliga värden rakt igenom', () => {
      for (const hour of load()) {
        expect(hour.temperature).toBeGreaterThan(-60);
        expect(hour.temperature).toBeLessThan(60);
        expect(hour.precipitationProbability).toBeGreaterThanOrEqual(0);
        expect(hour.precipitationProbability).toBeLessThanOrEqual(100);
        expect(hour.symbolCode).toBeGreaterThanOrEqual(1);
        expect(hour.symbolCode).toBeLessThanOrEqual(27);
      }
    });

    it('nollar SMHI:s saknade-värde 9999', () => {
      let hours: SmhiHour[] = [];
      service.hours({ latitude: 59.33, longitude: 18.07 }).subscribe((result) => (hours = result));

      http.expectOne((candidate) => candidate.url.includes('snow1g')).flush({
        timeSeries: [
          {
            time: '2026-08-25T10:00:00Z',
            data: { air_temperature: 9999, wind_speed: 9999, symbol_code: 3 },
          },
        ],
      });

      expect(hours[0].temperature).toBe(0);
      expect(hours[0].windSpeed).toBe(0);
      // Parametrar som inte finns med i svaret ska också bli noll, inte undefined.
      expect(hours[0].humidity).toBe(0);
    });
  });
});
