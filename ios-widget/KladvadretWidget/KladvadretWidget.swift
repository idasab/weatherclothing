import SwiftUI
import WidgetKit

/// Låst till ljust läge. Den gula bottnen är samma som appikonens, så widgeten
/// och ikonen hör ihop på hemskärmen. Ändras ikonens gula i
/// tools/generate-icons.py bör de här två värdena följa med.
private enum Palette {
    static let backgroundTop = Color(red: 0.973, green: 0.855, blue: 0.573)
    static let backgroundBottom = Color(red: 0.910, green: 0.749, blue: 0.439)

    static let background = LinearGradient(
        colors: [backgroundTop, backgroundBottom],
        startPoint: .top,
        endPoint: .bottom
    )

    static let ink = Color(red: 0.110, green: 0.118, blue: 0.133)
    // Något mörkare än i appen: det gula är ljusare än off-whiten och tål mer.
    static var muted: Color { ink.opacity(0.66) }
    static var faint: Color { ink.opacity(0.50) }
    static let hairline = Color(red: 0.110, green: 0.118, blue: 0.133).opacity(0.16)
    /// Ljus bricka bakom klädposterna, samma trick som glasens blänk i ikonen.
    static let chip = Color.white.opacity(0.42)
}

struct ForecastEntry: TimelineEntry {
    let date: Date
    let forecast: Forecast?
    let advice: Advice?
    let usedFallbackPlace: Bool
}

struct ForecastProvider: TimelineProvider {
    func placeholder(in context: Context) -> ForecastEntry {
        ForecastEntry(date: Date(), forecast: nil, advice: nil, usedFallbackPlace: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (ForecastEntry) -> Void) {
        Task { completion(await loadEntry()) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ForecastEntry>) -> Void) {
        Task {
            let entry = await loadEntry()
            // En halvtimme räcker: prognosen ändras inte snabbare än så, och
            // iOS ger ändå bara widgets ett begränsat antal uppdateringar.
            let next = Date().addingTimeInterval(30 * 60)
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }

    private func loadEntry() async -> ForecastEntry {
        let result = await ForecastLoader.load()

        return ForecastEntry(
            date: Date(),
            forecast: result.forecast,
            advice: result.forecast.map(adviseFor),
            usedFallbackPlace: result.usedFallbackPlace
        )
    }
}

// MARK: - Delar

/// Det viktigaste att ta med: regnutrustningen om den behövs, annars ytterlagret.
private func headlineGarment(_ advice: Advice) -> Garment {
    if let gear = advice.umbrella.gear {
        return gear
    }

    // Lagerlistan går underifrån och upp, så varken första eller sista posten är
    // ytterlagret: den första är underställ eller tröja, den sista är skor.
    let outer: Set<String> = ["coat.fill", "jacket.fill"]
    if let jacket = advice.layers.first(where: { outer.contains($0.icon) }) {
        return jacket
    }

    return advice.layers.first ?? Garment(icon: "tshirt.fill", label: advice.band)
}

private struct GarmentChip: View {
    let garment: Garment

    var body: some View {
        HStack(spacing: 5) {
            // SF Symbols i stället för emoji: de följer textens vikt och färg.
            Image(systemName: garment.icon)
                .font(.system(size: 10))
                .foregroundStyle(Palette.ink)
            Text(garment.label)
                .font(.system(size: 11))
                .foregroundStyle(Palette.ink)
                // "Tunn jacka eller kofta" är bredare än en liten widget, så
                // etiketten krymper i stället för att brytas eller klippas.
                .lineLimit(1)
                .minimumScaleFactor(0.75)
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 4)
        .background(Palette.chip, in: Capsule())
    }
}

private struct MissingForecast: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Ingen prognos").font(.system(size: 14, weight: .medium))
            Text("Öppna appen och försök igen.")
                .font(.system(size: 11))
                .foregroundStyle(Palette.muted)
        }
    }
}

// MARK: - Storlekar

private struct SmallView: View {
    let entry: ForecastEntry

    var body: some View {
        if let forecast = entry.forecast, let advice = entry.advice {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .top) {
                    Image(systemName: symbolName(for: forecast.condition, isDay: forecast.isDay))
                        .symbolRenderingMode(.multicolor)
                        .font(.system(size: 20))
                    Spacer()
                    Text(forecast.placeName)
                        .font(.system(size: 10))
                        .foregroundStyle(Palette.faint)
                        .lineLimit(1)
                }

                Text("\(Int(forecast.temperature.rounded()))°")
                    .font(.system(size: 42, weight: .thin))
                    .foregroundStyle(Palette.ink)
                    .padding(.top, 2)

                Text(advice.band.uppercased())
                    .font(.system(size: 9, weight: .semibold))
                    .kerning(0.8)
                    .foregroundStyle(Palette.faint)

                Spacer(minLength: 6)

                GarmentChip(garment: headlineGarment(advice))
            }
        } else {
            MissingForecast()
        }
    }
}

private struct MediumView: View {
    let entry: ForecastEntry

    var body: some View {
        if let forecast = entry.forecast, let advice = entry.advice {
            HStack(alignment: .top, spacing: 14) {
                VStack(alignment: .leading, spacing: 0) {
                    Image(systemName: symbolName(for: forecast.condition, isDay: forecast.isDay))
                        .symbolRenderingMode(.multicolor)
                        .font(.system(size: 18))
                    Text("\(Int(forecast.temperature.rounded()))°")
                        .font(.system(size: 40, weight: .thin))
                        .foregroundStyle(Palette.ink)
                    Text("Känns som \(Int(forecast.apparentTemperature.rounded()))°")
                        .font(.system(size: 10))
                        .foregroundStyle(Palette.muted)
                    Spacer(minLength: 4)
                    Text(entry.usedFallbackPlace ? "Slå på plats i appen" : forecast.placeName)
                        .font(.system(size: 10))
                        .foregroundStyle(Palette.faint)
                        .lineLimit(1)
                }
                .frame(width: 88, alignment: .leading)

                Rectangle().fill(Palette.hairline).frame(width: 1)

                VStack(alignment: .leading, spacing: 6) {
                    Text(advice.band.uppercased())
                        .font(.system(size: 9, weight: .semibold))
                        .kerning(0.8)
                        .foregroundStyle(Palette.faint)

                    ForEach(chips(advice)) { garment in
                        GarmentChip(garment: garment)
                    }

                    if !advice.umbrella.reason.isEmpty {
                        Text(advice.umbrella.reason)
                            .font(.system(size: 10))
                            .foregroundStyle(Palette.muted)
                            .lineLimit(2)
                    }

                    Spacer(minLength: 0)
                    HourRow(hours: Array(forecast.hours.prefix(5)))
                }
            }
        } else {
            MissingForecast()
        }
    }

    /// Regnutrustningen först, sedan de översta lagren.
    ///
    /// Lagerlistan börjar med överkroppen, så prefix ger tröja och jacka — det
    /// man vill veta. suffix gav byxor och skor, alltså det minst informativa.
    private func chips(_ advice: Advice) -> [Garment] {
        var chips: [Garment] = []
        if let gear = advice.umbrella.gear { chips.append(gear) }
        chips.append(contentsOf: advice.layers.prefix(2))
        return Array(chips.prefix(3))
    }
}

private struct HourRow: View {
    let hours: [HourForecast]

    private struct Cell: Identifiable {
        let id: Int
        let label: String
        let temperature: Int
        let probability: Int
    }

    /// Samma tröskel som appen: 3 % läses som "ingen risk" precis som 0 %, så
    /// kolumnen visas först när någon timme når tio procent.
    private var showsRisk: Bool {
        hours.contains { $0.precipitationProbability >= 10 }
    }

    private var cells: [Cell] {
        var cells: [Cell] = []
        for (index, hour) in hours.enumerated() {
            cells.append(
                Cell(
                    id: index,
                    label: index == 0 ? "Nu" : hour.label,
                    temperature: Int(hour.temperature.rounded()),
                    probability: hour.precipitationProbability
                )
            )
        }
        return cells
    }

    var body: some View {
        HStack(spacing: 10) {
            ForEach(cells) { cell in
                VStack(spacing: 1) {
                    Text(cell.label)
                        .font(.system(size: 8))
                        .foregroundStyle(Palette.faint)
                    Text("\(cell.temperature)°")
                        .font(.system(size: 10))
                        .foregroundStyle(Palette.ink)
                    if showsRisk {
                        Text("\(cell.probability)%")
                            .font(.system(size: 8))
                            .foregroundStyle(cell.probability < 20 ? Palette.faint : Palette.muted)
                    }
                }
            }
        }
    }
}

/// Låsskärmen ritas monokromt, så här används text utan emoji.
private struct LockScreenView: View {
    let entry: ForecastEntry

    var body: some View {
        if let forecast = entry.forecast, let advice = entry.advice {
            VStack(alignment: .leading, spacing: 1) {
                Text("\(Int(forecast.temperature.rounded()))° · \(advice.band)")
                    .font(.system(size: 15, weight: .medium))
                Text(headlineGarment(advice).label)
                    .font(.system(size: 12))
                Text(forecast.placeName)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }
        } else {
            Text("Ingen prognos").font(.system(size: 13))
        }
    }
}

// MARK: - Widget

struct KladvadretWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ForecastEntry

    var body: some View {
        switch family {
        case .accessoryRectangular:
            LockScreenView(entry: entry)
        case .systemMedium:
            MediumView(entry: entry)
        default:
            SmallView(entry: entry)
        }
    }
}

struct KladvadretWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "KladvadretWidget", provider: ForecastProvider()) { entry in
            KladvadretWidgetEntryView(entry: entry)
                .containerBackground(Palette.background, for: .widget)
        }
        .configurationDisplayName("Kläder i väder")
        .description("Vad du behöver ha på dig, och om du behöver paraply.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}

@main
struct KladvadretWidgetBundle: WidgetBundle {
    var body: some Widget {
        KladvadretWidget()
    }
}
