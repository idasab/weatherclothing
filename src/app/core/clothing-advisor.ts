import { GarmentIconName } from './garment-icon-name';
import { HourForecast } from './weather.models';

export type UmbrellaLevel = 'none' | 'maybe' | 'yes' | 'raincoat' | 'hood';

/**
 * Det klädlogiken faktiskt behöver veta. Både WeatherSnapshot och DayForecast
 * uppfyller formen, så samma funktion ger råd för i dag och för i morgon.
 */
export interface AdviceInput {
  temperature: number;
  apparentTemperature: number;
  windSpeed: number;
  windGusts: number;
  uvIndexMax: number;
  isDay: boolean;
  hours: HourForecast[];
}

export interface Garment {
  icon: GarmentIconName;
  label: string;
}

export interface UmbrellaVerdict {
  level: UmbrellaLevel;
  /** Motiveringen som hamnar under "Värt att veta". Tom när inget behövs. */
  reason: string;
}

export interface Advice {
  /** Kort namn på temperaturzonen, t.ex. "Kyligt". */
  band: string;
  /** En rad som sammanfattar hur det känns ute. */
  summary: string;
  umbrella: UmbrellaVerdict;
  /** Lager på kroppen, underst först. */
  layers: Garment[];
  /** Tillbehör: mössa, vantar, solglasögon och liknande. */
  extras: Garment[];
  /** Extra påpekanden, t.ex. att kvällen blir kallare. */
  notes: string[];
}

interface Band {
  /** Övre gräns (exklusiv) för känns-som-temperaturen. */
  below: number;
  band: string;
  summary: string;
  layers: Garment[];
}

/**
 * Zonerna utgår från känns-som-temperatur, inte termometern, eftersom vind och
 * fukt är det som avgör vad man faktiskt behöver på sig.
 */
const BANDS: Band[] = [
  {
    below: -12,
    band: 'Extremkyla',
    summary: 'Täck all bar hud och håll utetiden kort.',
    layers: [
      { icon: 'socks', label: 'Ullsockor' },
      { icon: 'base-layer', label: 'Termounderställ' },
      { icon: 'knit', label: 'Ulltröja eller fleece' },
      { icon: 'winter-jacket', label: 'Vinterjacka' },
      { icon: 'trousers', label: 'Termobyxor' },
      { icon: 'boots', label: 'Vinterkängor' },
    ],
  },
  {
    below: -5,
    band: 'Sträng kyla',
    summary: 'Ordentlig vinterklädsel, flera lager.',
    layers: [
      { icon: 'base-layer', label: 'Termounderställ' },
      { icon: 'knit', label: 'Ulltröja eller fleece' },
      { icon: 'winter-jacket', label: 'Vinterjacka' },
      { icon: 'trousers', label: 'Fodrade byxor' },
      { icon: 'boots', label: 'Vinterkängor' },
    ],
  },
  {
    below: 0,
    band: 'Minusgrader',
    summary: 'Vinterjacka och täck händer och huvud.',
    layers: [
      { icon: 'long-sleeve', label: 'Långärmad tröja' },
      { icon: 'knit', label: 'Stickad tröja' },
      { icon: 'winter-jacket', label: 'Vinterjacka' },
      { icon: 'trousers', label: 'Långbyxor' },
      { icon: 'boots', label: 'Varma skor' },
    ],
  },
  {
    below: 5,
    band: 'Kallt',
    summary: 'Vadderad jacka och ett lager under.',
    layers: [
      { icon: 'long-sleeve', label: 'Långärmad tröja' },
      { icon: 'hoodie', label: 'Tröja eller hoodie' },
      { icon: 'winter-jacket', label: 'Vadderad jacka' },
      { icon: 'trousers', label: 'Långbyxor' },
      { icon: 'shoes', label: 'Täckta skor' },
    ],
  },
  {
    below: 10,
    band: 'Kyligt',
    summary: 'Jacka på, gärna med en tröja under.',
    layers: [
      { icon: 'long-sleeve', label: 'Långärmad tröja' },
      { icon: 'knit', label: 'Tröja eller kofta' },
      { icon: 'jacket', label: 'Jacka' },
      { icon: 'trousers', label: 'Långbyxor' },
      { icon: 'shoes', label: 'Täckta skor' },
    ],
  },
  {
    below: 15,
    band: 'Svalt',
    summary: 'Tunn jacka räcker en bit.',
    layers: [
      { icon: 'long-sleeve', label: 'Långärmad tröja' },
      { icon: 'jacket', label: 'Tunn jacka eller kofta' },
      { icon: 'trousers', label: 'Långbyxor' },
      { icon: 'shoes', label: 'Sneakers' },
    ],
  },
  {
    below: 19,
    band: 'Milt',
    summary: 'Skjortväder med något tunt över.',
    layers: [
      { icon: 't-shirt', label: 'T-shirt eller skjorta' },
      { icon: 'cardigan', label: 'Tunn kofta över axeln' },
      { icon: 'trousers', label: 'Långbyxor' },
      { icon: 'shoes', label: 'Sneakers' },
    ],
  },
  {
    below: 24,
    band: 'Varmt',
    summary: 'Kortärmat hela dagen.',
    layers: [
      { icon: 't-shirt', label: 'T-shirt' },
      { icon: 'trousers', label: 'Tunna byxor eller shorts' },
      { icon: 'shoes', label: 'Lätta skor' },
    ],
  },
  {
    below: 29,
    band: 'Riktigt varmt',
    summary: 'Lätt och luftigt, håll dig i skuggan.',
    layers: [
      { icon: 'tank-top', label: 'Tunn t-shirt eller linne' },
      { icon: 'shorts', label: 'Shorts eller klänning' },
      { icon: 'sandals', label: 'Sandaler' },
    ],
  },
  {
    below: Number.POSITIVE_INFINITY,
    band: 'Hetta',
    summary: 'Undvik middagssolen och drick mer än du tror.',
    layers: [
      { icon: 'tank-top', label: 'Linne i tunt tyg' },
      { icon: 'shorts', label: 'Shorts eller klänning' },
      { icon: 'sandals', label: 'Sandaler' },
    ],
  },
];

/** Regnstatistik för perioden vi ger råd om. */
interface RainOutlook {
  maxProbability: number;
  totalPrecipitation: number;
  /** Snö i prognosen: då är paraply fel verktyg oavsett mängd. */
  hasSnow: boolean;
  hasThunder: boolean;
  /** Timmen då nedbörden är mest sannolik, för formuleringen "kring kl 15". */
  peakLabel: string | null;
  /** Sant när toppen ligger i den pågående timmen — då säger vi "just nu". */
  peakIsNow: boolean;
}

function rainOutlook(hours: HourForecast[]): RainOutlook {
  const outlook: RainOutlook = {
    maxProbability: 0,
    totalPrecipitation: 0,
    hasSnow: false,
    hasThunder: false,
    peakLabel: null,
    peakIsNow: false,
  };

  for (const [index, hour] of hours.entries()) {
    outlook.totalPrecipitation += hour.precipitation;
    if (hour.condition.isSnow) {
      outlook.hasSnow = true;
    }
    if (hour.condition.isThunder) {
      outlook.hasThunder = true;
    }
    if (hour.precipitationProbability > outlook.maxProbability) {
      outlook.maxProbability = hour.precipitationProbability;
      outlook.peakLabel = hour.label;
      outlook.peakIsNow = index === 0;
    }
  }

  return outlook;
}

function bandFor(apparentTemperature: number): Band {
  return BANDS.find((candidate) => apparentTemperature < candidate.below) ?? BANDS[BANDS.length - 1];
}

function umbrellaVerdict(input: AdviceInput, outlook: RainOutlook): UmbrellaVerdict {
  const wet = outlook.maxProbability >= 30 || outlook.totalPrecipitation >= 0.3;
  const risk = Math.round(outlook.maxProbability);
  const fromWhen = outlook.peakIsNow
    ? ' Störst risk just nu.'
    : outlook.peakLabel
      ? ` Störst risk kring ${outlook.peakLabel}.`
      : '';

  // Snö först: ett paraply gör ingen nytta, och råder man till det blir rådet fel.
  if (wet && outlook.hasSnow) {
    return {
      level: 'hood',
      reason: `Paraply hjälper inte i snön — mössa och luva fungerar bättre.${fromWhen}`,
    };
  }

  if (wet && outlook.hasThunder) {
    return {
      level: 'raincoat',
      reason: `Regnjacka slår paraply i åskväder.${fromWhen}`,
    };
  }

  // Ett paraply som viks ut och in är sämre än inget paraply alls.
  if (wet && input.windGusts >= 12) {
    return {
      level: 'raincoat',
      reason:
        `Vindbyar på ${Math.round(input.windGusts)} m/s vänder ett paraply ut och in — ` +
        `därför regnjacka i stället.${fromWhen}`,
    };
  }

  if (outlook.maxProbability >= 55 || outlook.totalPrecipitation >= 1.5) {
    return {
      level: 'yes',
      reason: `${risk} % risk för nedbörd de närmaste timmarna.${fromWhen}`,
    };
  }

  if (wet) {
    return {
      level: 'maybe',
      reason: `${risk} % risk för nedbörd — ett litet paraply i väskan räcker.${fromWhen}`,
    };
  }

  return { level: 'none', reason: '' };
}

/**
  * Vad man faktiskt bär med sig, givet beskedet. Här står aldrig "paraply" när
  * rådet är att låta paraplyet vara — listan och kortet ska säga samma sak.
  */
function rainGearFor(level: UmbrellaLevel): Garment | null {
  switch (level) {
    case 'yes':
      return { icon: 'umbrella', label: 'Paraply' };
    case 'maybe':
      return { icon: 'umbrella', label: 'Litet paraply' };
    case 'raincoat':
      return { icon: 'hooded-jacket', label: 'Regnjacka' };
    case 'hood':
      return { icon: 'hooded-jacket', label: 'Jacka med luva' };
    default:
      return null;
  }
}

function extrasFor(
  input: AdviceInput,
  outlook: RainOutlook,
  umbrella: UmbrellaVerdict
): Garment[] {
  const feels = input.apparentTemperature;
  const extras: Garment[] = [];

  // Regnutrustningen först: det är den man glömmer i hallen.
  const rainGear = rainGearFor(umbrella.level);
  if (rainGear) {
    extras.push(rainGear);
  }

  if (feels < 0) {
    extras.push({ icon: 'scarf', label: 'Halsduk' });
  }
  if (feels < 5) {
    extras.push({ icon: 'mittens', label: feels < -8 ? 'Tumvantar' : 'Vantar' });
  }
  if (feels < 8) {
    extras.push({ icon: 'beanie', label: 'Mössa' });
  }
  if (input.windSpeed >= 8 && umbrella.level !== 'raincoat') {
    extras.push({ icon: 'jacket', label: 'Vindtätt ytterlager' });
  }
  if (outlook.totalPrecipitation >= 0.3 && feels < 14) {
    extras.push({ icon: 'boots', label: 'Vattentäta skor' });
  }
  if (input.isDay && input.uvIndexMax >= 3) {
    extras.push({ icon: 'sunglasses', label: 'Solglasögon' });
  }
  if (input.uvIndexMax >= 5) {
    extras.push({ icon: 'sunscreen', label: 'Solskyddsfaktor' });
  }
  if (input.uvIndexMax >= 7) {
    extras.push({ icon: 'sun-hat', label: 'Keps eller hatt' });
  }
  if (feels >= 25) {
    extras.push({ icon: 'bottle', label: 'Vattenflaska' });
  }

  return extras;
}

function notesFor(
  input: AdviceInput,
  outlook: RainOutlook,
  umbrella: UmbrellaVerdict
): string[] {
  const notes: string[] = [];
  const feels = input.apparentTemperature;

  // Varför regnutrustningen i "Ta med" ser ut som den gör. Torrt väder säger
  // ingenting alls, så listan förblir tyst när det inte finns något att göra.
  if (umbrella.reason) {
    notes.push(umbrella.reason);
  }

  const coldestAhead = input.hours.reduce(
    (lowest, hour) => Math.min(lowest, hour.apparentTemperature),
    feels
  );
  if (feels - coldestAhead >= 5) {
    notes.push(
      `Det blir omkring ${Math.round(feels - coldestAhead)}° kallare senare — ta med ett extra lager.`
    );
  }

  const gap = input.temperature - feels;
  if (gap >= 4) {
    notes.push(
      `Termometern visar ${Math.round(input.temperature)}°, men vinden gör att det känns som ${Math.round(feels)}°.`
    );
  } else if (gap <= -4) {
    notes.push(
      `Fukten gör att det känns varmare än ${Math.round(input.temperature)}° — klä dig som i ${Math.round(feels)}°.`
    );
  }

  if (input.windGusts >= 17) {
    notes.push(`Vindbyar upp till ${Math.round(input.windGusts)} m/s — håll i hatten.`);
  }

  if (input.uvIndexMax >= 8) {
    notes.push(`UV-index ${Math.round(input.uvIndexMax)} i dag — solen bränner snabbt.`);
  }

  if (feels <= -10) {
    notes.push('Bar hud kan frysa på några minuter i den här kylan.');
  }

  if (outlook.hasThunder) {
    notes.push('Åskskurar i prognosen — planera för att kunna komma inomhus.');
  }

  return notes;
}

/** Översätter väderförhållanden till konkreta klädråd. */
export function adviseFor(input: AdviceInput): Advice {
  const outlook = rainOutlook(input.hours);
  const band = bandFor(input.apparentTemperature);
  const umbrella = umbrellaVerdict(input, outlook);

  return {
    band: band.band,
    summary: band.summary,
    umbrella,
    layers: band.layers,
    extras: extrasFor(input, outlook, umbrella),
    notes: notesFor(input, outlook, umbrella),
  };
}
