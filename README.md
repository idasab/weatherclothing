# Klädvädret

Webbapp som hämtar lokalt väder och svarar på två frågor: vad du ska ha på dig,
och om du behöver ta med paraply. Byggd för att kunna paketeras som iOS-app med
Capacitor, men fungerar lika bra som webbapp eller sparad på hemskärmen.

## Versioner och varför

| Del | Version | Varför just den |
| --- | --- | --- |
| Angular | 16.2 | Kravet är `^16.14.0 \|\| >=18.10.0`, alltså öppet uppåt, så det fungerar på Node 20.18.0. Angular 21 kräver `^20.19.0 \|\| ^22.12.0 \|\| ^24.0.0` och startar inte här. |
| Capacitor | 7 | Kräver Node `>=20.0.0`. Capacitor 8 kräver Node 22 och är därför inte valbart. |
| Väderdata i Norden | SMHI SNOW (`snow1g` v1) | Sveriges nationella prognosmodell, finare upplösning över Sverige än globala modeller. Gratis, ingen nyckel, öppen CORS. |
| Väderdata globalt | Open-Meteo | Gratis, ingen nyckel, täcker hela världen. Kompletterar även SMHI med UV-index. |

Angular 16 är utanför Angulars officiellt testade Node-matris (den listar Node
16 och 18), men `engines` tillåter Node 20 och CLI:n kör utan invändningar.

## Kom igång

```bash
npm install
```

```bash
npm start
```

Appen svarar på http://localhost:4200. Testerna, 38 stycken:

```bash
npm run test:ci
```

Produktionsbygge hamnar i `dist/weather-clothing`:

```bash
npm run build
```

## Tester

38 test i fyra filer. Fördelningen är medveten:

- **[clothing-advisor.spec.ts](src/app/core/clothing-advisor.spec.ts)** täcker
  klädlogiken, som är appens egentliga innehåll: paraplybeskedets ordning,
  klädzonerna och att listan aldrig säger paraply när rådet är regnjacka.
- **[apparent-temperature.spec.ts](src/app/core/apparent-temperature.spec.ts)**
  täcker vindkyla och fuktig hetta, alltså formlerna som avgör vilken zon man
  hamnar i.
- **[smhi.service.spec.ts](src/app/core/smhi.service.spec.ts)** och
  **[forecast.service.spec.ts](src/app/core/forecast.service.spec.ts)** kör mot
  ett sparat, verkligt SMHI-svar i
  [testing/smhi-response.fixture.ts](src/app/core/testing/smhi-response.fixture.ts).
  Poängen är att en formatändring hos SMHI ska bli ett rött test i stället för en
  tom skärm i mobilen — deras gamla API stängdes 31 mars 2026, så det är inte en
  hypotetisk risk. Testerna täcker också att komplementanropet får falla bort,
  att SMHI-fel leder vidare till Open-Meteo, och att SMHI inte anropas alls
  utanför modellområdet.
- **[hour-strip.component.spec.ts](src/app/components/hour-strip.component.spec.ts)**
  täcker regeln att en timkolumn med bara nollor göms helt.

Två saker testerna redan avslöjade: `forkJoin` avbryter komplementanropet i
samma stund som SMHI fallerar, och att max/min grupperas på lokalt datum, inte
UTC-datum.

## Väderkällor

Appen väljer källa efter plats, eftersom ingen enskild källa är bäst överallt.

**SMHI SNOW** (Swedish National Operational Weather forecast) används när platsen
ligger i modellens område. Den ger lufttemperatur, vind, byvind, luftfuktighet,
nedbördsmängd, *nedbördssannolikhet* och vädersymbol (Wsymb2, 1–27) per timme.
Området är ett krökt rutnät över Nordeuropa; appen gör först en grov
rektangelkontroll (lat 49,5–75,5, lon −18,5–54,5) för att slippa onödiga anrop,
och punkter som ligger i rektangeln men utanför rutnätet avvisas av API:et — då
tas den globala källan i stället. Modellen täcker alltså även Norge, Danmark och
Finland, och används där den är giltig.

**Open-Meteo** används utanför området, som reserv om SMHI inte svarar, och som
komplement till SMHI för två saker SMHI inte publicerar: UV-index (som styr
solglasögon- och solskyddsråden) och dygnsrytmen dag/natt (som avgör om
nattsymbolen ska visas). Komplementanropet hämtas i UTC så tidsnycklarna kan
matchas mot SMHI:s tidsstämplar. Faller det bort visas prognosen ändå, men utan
solskyddsråd.

**Känns-som-temperaturen** publicerar SMHI inte heller, så den räknas ut i
[apparent-temperature.ts](src/app/core/apparent-temperature.ts): JAG/TI-formeln
för vindkyla under 10°, Steadmans skuggformel med luftfuktighet över 27°, och
lufttemperaturen orörd däremellan där ingen av formlerna är giltig. Utomlands
används Open-Meteos eget värde, som väger in solinstrålning.

Två skillnader mellan källorna är värda att känna till. SMHI:s tidsserie börjar
vid nuvarande timme, så "max / min" gäller dygnets återstående timmar, medan
Open-Meteo ger hela kalenderdygnet. Och SMHI stämplar tiderna i UTC, som räknas
om till enhetens tidszon, medan Open-Meteo levererar platsens lokaltid direkt —
läser du en svensk prognos från utlandet visas timmarna i din egen tidszon.

Noterat för framtiden: SMHI:s gamla API `pmp3g` version 2 stängdes 31 mars 2026
och ersattes av `snow1g` version 1, som den här appen använder.

## Så fungerar råden

All logik ligger i [clothing-advisor.ts](src/app/core/clothing-advisor.ts) som
ren TypeScript utan Angular-beroenden, vilket gör den lätt att testa och att
justera.

**Kläderna** väljs utifrån känns-som-temperaturen, inte termometern, eftersom
vind och fukt är det som avgör hur du faktiskt upplever vädret. Tio zoner från
"Extremkyla" under -12° till "Hetta" över 29°, var och en med en lagerlista
underifrån och upp.

**Paraplybeskedet** prövas i en bestämd ordning, där undantagen kommer först,
och visas som första posten i listan "Ta med":

| Läge | Villkor | Post i "Ta med" |
| --- | --- | --- |
| `hood` | Snöfall över 0,2 mm | Jacka med luva, eftersom paraply inte hjälper i snö |
| `raincoat` | Åska, eller vindbyar ≥ 12 m/s tillsammans med nedbörd | Regnjacka, eftersom paraplyet vänds ut och in |
| `yes` | Risk ≥ 55 % eller nedbörd ≥ 1,5 mm | Paraply |
| `maybe` | Risk ≥ 30 % eller nedbörd ≥ 0,3 mm | Litet paraply |
| `none` | Inget av ovanstående | Ingen regnpost alls |

Listan säger alltså aldrig "paraply" när rådet är att låta paraplyet vara. Vid
`raincoat` utgår också posten om vindtätt ytterlager, eftersom en regnjacka
redan är det. Allt räknas på de närmaste tolv timmarna.

**Resten av tillbehören** styrs av separata trösklar: mössa under 8°, vantar
under 5°, halsduk under 0°, vindtätt ytterlager från 8 m/s, vattentäta skor vid
nedbörd under 14°, och solglasögon, solskydd och hatt vid UV-index 3, 5
respektive 7.

## Plaggikonerna

Klädråden visas med 24 egna linjeikoner i stället för emoji. Skälet är att
emojiuppsättningen saknar kofta, hoodie och mössa, och att en enda rocksymbol
fick stå för sex olika plagg — tunn kofta och vinterjacka såg identiska ut.

Formerna ligger som SVG-banor i
[garment-icon.component.ts](src/app/components/garment-icon.component.ts) och
namnen som en union-typ i
[garment-icon-name.ts](src/app/core/garment-icon-name.ts). Typen ligger i kärnan
så klädlogiken kan namnge en ikon utan att bero på komponenten som ritar den, och
så att kompilatorn fångar felstavningar.

Tre saker att veta vid ändringar:

- **Allt är `<path>`.** Inga `rect` eller `circle`, så komponenten kan rendera
  vilken ikon som helst med samma `*ngFor`. Banorna binds via `[attr.d]`, inte
  `innerHTML`, eftersom Angulars sanerare strippar SVG-element ur `innerHTML`.
- **18 px är golvet.** Under det kollapsar linjeteckningen till en klump. Appen
  ritade tidigare emoji i 15 px, och den storleken går inte att använda här.
- **Skilj formerna strukturellt, inte i detaljer.** Koftan har öppen framkant,
  jackan en mittsöm, huvjackan en huva, vinterjackan fickor. Fina detaljer som
  skosnören försvinner i liten storlek och blir bara smuts.

Widgeten kan inte dela SVG med webbappen, så den använder Apples SF Symbols i
stället: `tshirt.fill`, `jacket.fill`, `coat.fill`, `hat.cap.fill` och så vidare.
Namnen står i `Advice.swift`. Vädersymbolerna är fortfarande emoji i båda.

## Bygg som iOS-app

Stegen fram till Xcode går att göra på Windows. Själva iOS-bygget kräver macOS
med Xcode och CocoaPods — `cap add ios` kör `pod install`, som inte finns här.

På en Mac, i den här mappen:

```bash
npx cap add ios
```

```bash
npm run ios:sync
```

```bash
npm run ios:open
```

`ios:sync` bygger Angular-appen och kopierar `dist/weather-clothing` in i
iOS-projektet. Därefter i Xcode:

1. **Byt bundle-id.** `appId` i [capacitor.config.ts](capacitor.config.ts) står
   på platshållaren `com.example.kladvadret`.
2. **Lägg in platsbehörigheten** i `ios/App/App/Info.plist`, annars nekas
   positionen utan felmeddelande:

   ```xml
   <key>NSLocationWhenInUseUsageDescription</key>
   <string>Appen använder din plats för att hämta väderprognosen där du är.</string>
   ```

3. **Appikonen** sätts i `ios/App/App/Assets.xcassets/AppIcon.appiconset`.
   Använd `src/assets/icons/icon-1024.png`.

Positionen hämtas via `@capacitor/geolocation`, som använder CoreLocation i den
byggda appen och `navigator.geolocation` i webbläsaren. Samma kod fungerar i
båda lägena, så inget behöver ändras vid paketeringen.

## Publicera på GitHub Pages

Appen är statisk, så den kan ligga på GitHub Pages och nås direkt från telefonen
utan Mac, Xcode eller App Store.

Publiceringen sker från grenen **`gh-pages`**, som innehåller ett färdigbyggt
resultat. Bygg om och uppdatera den så här:

```bash
python tools/build-pages.py
```

```bash
git push origin gh-pages
```

Pages ska stå på **Settings → Pages → Source: Deploy from a branch**, med grenen
`gh-pages` och mappen `/ (root)`. Appen hamnar på
`https://<användare>.github.io/<repo>/`.

Varför inte bygga i CI? Workflowet i
[.github/workflows/deploy.yml](.github/workflows/deploy.yml) gör precis det, men
det har inte gått att få grönt på GitHubs runner — installationssteget föll på
Node 22 och byggsteget på Node 20 med exit 127. Tills det är utrett startas det
bara manuellt, och den färdigbyggda grenen är den väg som fungerar.

Två detaljer som annars ställer till det:

- **Underkatalogen.** Appen ligger inte i domänroten, så bygget behöver
  `--base-href "/<repo>/"`. Workflowet hämtar repots namn automatiskt, så det
  fungerar oavsett vad du döper det till. Kör du samma kommando lokalt i Git Bash
  på Windows måste du sätta `MSYS_NO_PATHCONV=1` framför, annars översätts
  `/<repo>/` till en Windows-sökväg och `<base href>` blir fel.
- **HTTPS krävs för platstjänster.** Pages serverar över HTTPS, så positionen
  fungerar i mobilen. SMHI och Open-Meteo tillåter anrop från andra domäner, så
  ingen proxy behövs.

När appen ligger uppe kan du öppna den i Safari på iPhone och välja "Lägg till på
hemskärmen" för att få den som en app med egen ikon.

## iPhone-widget

Hemskärmswidgetar på iOS kan bara byggas med WidgetKit, alltså Swift och
SwiftUI — det finns ingen webbteknik för widgets, så Capacitor-appen kan inte
leverera en. Källkoden ligger färdig i [ios-widget/](ios-widget) och läggs till
som ett eget mål i Xcode-projektet.

Widgeten är självförsörjande: den hämtar sin egen position via CoreLocation och
anropar SMHI direkt, med samma val av källa och samma trösklar som webbappen.
Den behöver alltså inte att appen har körts nyligen, och ingen data delas mellan
dem.

| Storlek | Innehåll |
| --- | --- |
| Liten | Symbol, temperatur, klädzon och det viktigaste att ta med |
| Mellan | Temperatur, känns-som, tre klädposter, motivering och fem timmar framåt |
| Låsskärm (rektangulär) | Temperatur, zon och det viktigaste att ta med, i text |

### Lägg till målet i Xcode

På en Mac, efter `npx cap add ios`:

1. **File → New → Target → Widget Extension.** Döp den till `KladvadretWidget`
   och kryssa ur "Include Live Activity" och "Include Configuration Intent".
2. **Ersätt de genererade filerna** med de fem i
   `ios-widget/KladvadretWidget/` (`Weather.swift`, `Advice.swift`,
   `ForecastLoader.swift`, `KladvadretWidget.swift` och `Info.plist`).
3. **Lägg till `NSWidgetWantsLocation`** med värdet `YES` i widgetmålets
   Info.plist — utan den nyckeln får widgeten aldrig någon position. Den finns
   redan i filen ovan, men bekräfta att Xcode inte skrivit över den.
4. **Sätt samma platsbeskrivning** (`NSLocationWhenInUseUsageDescription`) på
   widgetmålet som på appen.
5. Sätt deployment target till iOS 17 eller senare. Widgeten använder
   `containerBackground`, som kräver iOS 17.

### Värt att veta om widgeten

- **Positionen ärvs från appen.** Widgeten frågar aldrig själv om tillstånd, så
  användaren måste ha godkänt plats i appen först. Utan tillstånd visas
  reservorten Stockholm och texten "Slå på plats i appen" — byt `fallbackPlace`
  i `ForecastLoader.swift` om du vill ha en annan.
- **Inga solskyddsråd.** UV-index kräver ett extra anrop till Open-Meteo, och det
  hoppar widgeten över för att hålla nere antalet nätverksanrop. Solglasögon,
  solskydd och hatt hör därför bara till appen.
- **Uppdateras halvtimmesvis.** Tidslinjen ber om nästa uppdatering efter 30
  minuter, men iOS bestämmer själv hur ofta widgets faktiskt får köra.
- **Gul botten som ikonen.** Widgetens bakgrund är samma ljusa gula som
  appikonen, definierad i `Palette` överst i `KladvadretWidget.swift`. Ändrar du
  ikonens färg i [tools/generate-icons.py](tools/generate-icons.py) behöver de
  två färgvärdena där följa med, annars glider ikon och widget isär.
- **Logiken är kopierad, inte delad.** Trösklarna i `Advice.swift` speglar
  `clothing-advisor.ts`. Ändrar du råden i webbappen behöver du ändra dem på båda
  ställena — de enhetstestade värdena i TypeScript är originalet.

## Utan Mac: spara på hemskärmen

Appen har manifest, ikoner och `apple-mobile-web-app`-taggar, så den kan läggas
till på hemskärmen från Safari och startar då utan adressfält. Det ger inte en
app i App Store, men i praktiken samma upplevelse på telefonen.

## Värt att veta

- **Offline fungerar.** En service worker cachar appskalet, så appen startar
  utan nätverk. Konfigurationen ligger i [ngsw-config.json](ngsw-config.json):
  appskalet hämtas i förväg, bilderna vid behov, och prognosanropen till SMHI och
  Open-Meteo har strategin `freshness` med fem sekunders timeout och två timmars
  hållbarhet — nätverket går först, cachen tar över när det är trögt eller borta.
  Workern byggs bara i produktionsläge; `ng serve` bygger ingen.
- **Tre externa tjänster, ingen med nyckel.** SMHI och Open-Meteo för prognosen,
  och BigDataCloud för att sätta ett ortsnamn på GPS-koordinaterna. Misslyckas
  namnuppslaget heter platsen bara "Din plats". Vilken prognoskälla som användes
  står längst ner i appen.
- **Ortsökningen** är reservvägen när positionen nekas eller inte finns, och
  fungerar även som vanlig sökfunktion.
- **Appikonen genereras** av [tools/generate-icons.py](tools/generate-icons.py),
  som ritar motivet direkt till PNG utan bildbibliotek. Motivet är solglasögon i
  legostil: platta, nästan kvadratiska glas, rak brygga och raka skalmstumpar.
  Kör `python tools/generate-icons.py` efter en ändring, så skrivs alla fyra
  storlekar om: 180 för hemskärmen, 192 och 512 för manifestet och 1024 för
  Xcode. Färger och geometri ligger som konstanter överst i filen, och
  `GLINT_STRENGTH` sätter du till 0.6 om du vill ha tillbaka det vita blänket i
  glasen. Ikonerna sparas utan alfakanal, eftersom genomskinlighet blir svart på
  iOS.
- **Alltid ljust läge.** Paletten är låst till den ljusa, och `color-scheme:
  light` gör att systemet inte ritar mörka formulärkontroller i den.
