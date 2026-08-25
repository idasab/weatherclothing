import { HttpTestingController, HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ForecastService } from './forecast.service';
import { SMHI_RESPONSE } from './testing/smhi-response.fixture';
import { Place, WeatherSnapshot } from './weather.models';

const STOCKHOLM: Place = { name: 'Stockholm', latitude: 59.3293, longitude: 18.0686 };
const MUMBAI: Place = { name: 'Mumbai', latitude: 19.076, longitude: 72.8777 };

/** Ett minimalt Open-Meteo-svar, tillräckligt för att kunna byggas till en snapshot. */
const OPEN_METEO_FORECAST = {
  current: {
    time: '2026-08-25T12:00',
    temperature_2m: 31,
    relative_humidity_2m: 70,
    apparent_temperature: 36,
    is_day: 1,
    precipitation: 0.4,
    weather_code: 61,
    wind_speed_10m: 4,
    wind_gusts_10m: 8,
  },
  hourly: {
    time: ['2026-08-25T11:00', '2026-08-25T12:00', '2026-08-25T13:00'],
    temperature_2m: [30, 31, 31],
    apparent_temperature: [35, 36, 36],
    precipitation_probability: [50, 60, null],
    precipitation: [0.2, 0.4, 0],
    wind_speed_10m: [4, 5, 5],
    wind_gusts_10m: [8, 9, 9],
    weather_code: [61, 61, 3],
    is_day: [1, 1, 1],
  },
  daily: { temperature_2m_max: [32, 33], temperature_2m_min: [27, 28], uv_index_max: [9, 10] },
};

const SUN_INFO = {
  hourly: {
    time: ['2026-08-25T10:00', '2026-08-25T11:00', '2026-08-25T12:00'],
    is_day: [1, 1, 0],
  },
  daily: { uv_index_max: [4.2, 5.6] },
};

describe('ForecastService', () => {
  let service: ForecastService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(ForecastService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function smhiRequest() {
    return http.expectOne((candidate) => candidate.url.includes('snow1g'));
  }

  function openMeteoRequests() {
    return http.match((candidate) => candidate.url.includes('api.open-meteo.com'));
  }

  describe('inom SMHI:s område', () => {
    let snapshot: WeatherSnapshot | undefined;

    beforeEach(() => {
      service.forecast(STOCKHOLM).subscribe((result) => (snapshot = result));
      smhiRequest().flush(SMHI_RESPONSE);
      openMeteoRequests()[0].flush(SUN_INFO);
    });

    it('bygger prognosen på SMHI', () => {
      expect(snapshot?.source).toBe('SMHI');
      expect(snapshot?.temperature).toBe(SMHI_RESPONSE.timeSeries[0].data.air_temperature);
      expect(snapshot?.condition.label).toBeTruthy();
    });

    it('tar tolv timmar framåt som underlag för råden', () => {
      // Fönstret för råden ska vara lika långt oavsett vad klockan är.
      expect(snapshot?.hours.length).toBe(12);
    });

    it('visar dygnets återstående timmar i timprognosen', () => {
      const localDate = (utc: string) => new Date(utc).toLocaleDateString('sv-SE');
      const today = localDate(SMHI_RESPONSE.timeSeries[0].time);

      const hours = snapshot?.hoursRestOfDay ?? [];
      expect(hours.length).toBeGreaterThan(2);
      expect(hours.every((hour) => localDate(hour.time) === today)).toBe(true);
    });

    it('bygger även morgondagens kväll', () => {
      expect(snapshot?.tomorrowEvening).toBeTruthy();
      expect(snapshot?.tomorrowEvening?.date).toBe(snapshot?.tomorrow?.date);
      expect(snapshot?.tomorrowEvening?.uvIndexMax).toBe(0);
    });

    it('sätter klockslag på timmarna', () => {
      for (const hour of snapshot?.hours ?? []) {
        expect(hour.label).toMatch(/^\d{2}:\d{2}$/);
      }
    });

    it('räknar ut känns-som själv, eftersom SMHI inte publicerar den', () => {
      // Fixturen är mild och nästan vindstill, då lämnas lufttemperaturen orörd.
      expect(snapshot?.apparentTemperature).toBe(snapshot?.temperature);
    });

    it('hämtar UV-index ur komplementet', () => {
      expect(snapshot?.uvIndexMax).toBe(SUN_INFO.daily.uv_index_max[0]);
    });

    it('läser dag och natt ur komplementet', () => {
      // Komplementet säger natt vid 12 UTC, dag timmarna före.
      const night = snapshot?.hours.find((hour) => hour.time.startsWith('2026-08-25T12'));
      expect(night?.isDay).toBe(false);
    });

    it('bygger även morgondagens råd ur samma serie', () => {
      const tomorrow = snapshot?.tomorrow;
      expect(tomorrow).toBeTruthy();

      const localDate = (utc: string) => new Date(utc).toLocaleDateString('sv-SE');
      const today = localDate(SMHI_RESPONSE.timeSeries[0].time);
      // Jasmines toBeGreaterThan vill ha tal, och datum jämförs som text här.
      expect((tomorrow?.date ?? '') > today).toBe(true);

      // Bara dagtimmar, och UV-indexet ska komma från morgondagens värde.
      for (const hour of tomorrow?.hours ?? []) {
        const localHour = new Date(hour.time).getHours();
        expect(localHour).toBeGreaterThanOrEqual(7);
        expect(localHour).toBeLessThanOrEqual(19);
      }
      expect(tomorrow?.uvIndexMax).toBe(SUN_INFO.daily.uv_index_max[1]);
    });

    it('räknar max och min på dygnets återstående timmar', () => {
      // Grupperingen sker på lokalt datum, inte UTC. Fixturen börjar 10:00 UTC,
      // så de sista tidsstegen tillhör nästa dygn i svensk tid och ska bort.
      const localDate = (utc: string) => new Date(utc).toLocaleDateString('sv-SE');
      const today = localDate(SMHI_RESPONSE.timeSeries[0].time);
      const temperatures = SMHI_RESPONSE.timeSeries
        .filter((entry) => localDate(entry.time) === today)
        .map((entry) => entry.data.air_temperature);

      expect(temperatures.length).toBeLessThan(SMHI_RESPONSE.timeSeries.length);
      expect(snapshot?.dayMax).toBe(Math.max(...temperatures));
      expect(snapshot?.dayMin).toBe(Math.min(...temperatures));
    });
  });

  it('visar prognosen utan solskyddsråd när komplementet faller bort', () => {
    let snapshot: WeatherSnapshot | undefined;
    service.forecast(STOCKHOLM).subscribe((result) => (snapshot = result));

    smhiRequest().flush(SMHI_RESPONSE);
    openMeteoRequests()[0].error(new ProgressEvent('fel'), { status: 500, statusText: 'Fel' });

    expect(snapshot?.source).toBe('SMHI');
    expect(snapshot?.uvIndexMax).toBe(0);
  });

  it('faller tillbaka på Open-Meteo när SMHI avvisar punkten', () => {
    let snapshot: WeatherSnapshot | undefined;
    service.forecast(STOCKHOLM).subscribe((result) => (snapshot = result));

    // Punkter i rektangeln men utanför det krökta rutnätet avvisas av SMHI.
    smhiRequest().error(new ProgressEvent('fel'), { status: 404, statusText: 'Not Found' });

    // forkJoin avbryter komplementanropet i samma stund som SMHI fallerar, så
    // det ligger kvar som cancelled och ska inte besvaras.
    const requests = openMeteoRequests();
    const cancelled = requests.filter((request) => request.cancelled);
    const live = requests.filter((request) => !request.cancelled);
    expect(cancelled.length).toBe(1);
    expect(live.length).toBe(1);
    live[0].flush(OPEN_METEO_FORECAST);

    expect(snapshot?.source).toBe('Open-Meteo');
    expect(snapshot?.temperature).toBe(OPEN_METEO_FORECAST.current.temperature_2m);
  });

  it('anropar inte SMHI alls för platser utanför området', () => {
    let snapshot: WeatherSnapshot | undefined;
    service.forecast(MUMBAI).subscribe((result) => (snapshot = result));

    http.expectNone((candidate) => candidate.url.includes('snow1g'));
    openMeteoRequests()[0].flush(OPEN_METEO_FORECAST);

    expect(snapshot?.source).toBe('Open-Meteo');
    expect(snapshot?.uvIndexMax).toBe(OPEN_METEO_FORECAST.daily.uv_index_max[0]);
    expect(snapshot?.hours.length).toBe(2);
  });
});
