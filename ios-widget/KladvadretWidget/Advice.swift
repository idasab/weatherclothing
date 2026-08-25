import Foundation

/// Känns-som-temperatur för SMHI, som inte publicerar den.
/// Samma formler och gränser som `apparent-temperature.ts` i webbappen.
func apparentTemperature(
    temperature: Double,
    windSpeedMs: Double,
    relativeHumidity: Double
) -> Double {
    let windSpeedKmh = windSpeedMs * 3.6

    // JAG/TI-formeln för vindkyla, samma som SMHI anger.
    if temperature <= 10, windSpeedKmh > 4.8 {
        let factor = pow(windSpeedKmh, 0.16)
        return 13.12 + 0.6215 * temperature - 11.37 * factor + 0.3965 * temperature * factor
    }

    // Steadmans skuggformel: i värmen är luftfuktigheten det som spelar roll.
    if temperature >= 27 {
        let vapourPressure = (relativeHumidity / 100) * 6.105
            * exp((17.27 * temperature) / (237.7 + temperature))
        return temperature + 0.33 * vapourPressure - 0.7 * windSpeedMs - 4
    }

    return temperature
}

struct Garment: Identifiable {
    /// Namn på en SF Symbol, Apples systemsymboler. Widgeten ritar dem med
    /// Image(systemName:) i stället för emoji, så de följer textens vikt.
    let icon: String
    let label: String

    var id: String { label }
}

enum UmbrellaLevel {
    case none, maybe, yes, raincoat, hood
}

struct Umbrella {
    let level: UmbrellaLevel
    let reason: String

    /// Vad man tar med sig. Säger aldrig paraply när rådet är att låta det vara.
    var gear: Garment? {
        switch level {
        case .yes: return Garment(icon: "umbrella.fill", label: "Paraply")
        case .maybe: return Garment(icon: "umbrella", label: "Litet paraply")
        case .raincoat: return Garment(icon: "coat.fill", label: "Regnjacka")
        case .hood: return Garment(icon: "coat.fill", label: "Jacka med luva")
        case .none: return nil
        }
    }
}

struct Advice {
    let band: String
    let summary: String
    let layers: [Garment]
    let extras: [Garment]
    let umbrella: Umbrella
}

private struct Band {
    let below: Double
    let name: String
    let summary: String
    let layers: [Garment]
}

/// Zonerna utgår från känns-som-temperaturen, precis som i webbappen.
private let bands: [Band] = [
    Band(below: -12, name: "Extremkyla", summary: "Täck all bar hud och håll utetiden kort.", layers: [
        Garment(icon: "tshirt.fill", label: "Termounderställ"),
        Garment(icon: "tshirt.fill", label: "Ulltröja eller fleece"),
        Garment(icon: "coat.fill", label: "Vinterjacka"),
        Garment(icon: "figure.stand", label: "Termobyxor"),
    ]),
    Band(below: -5, name: "Sträng kyla", summary: "Ordentlig vinterklädsel, flera lager.", layers: [
        Garment(icon: "tshirt.fill", label: "Termounderställ"),
        Garment(icon: "tshirt.fill", label: "Ulltröja eller fleece"),
        Garment(icon: "coat.fill", label: "Vinterjacka"),
        Garment(icon: "shoe.2.fill", label: "Vinterkängor"),
    ]),
    Band(below: 0, name: "Minusgrader", summary: "Vinterjacka och täck händer och huvud.", layers: [
        Garment(icon: "tshirt.fill", label: "Stickad tröja"),
        Garment(icon: "coat.fill", label: "Vinterjacka"),
        Garment(icon: "figure.stand", label: "Långbyxor"),
        Garment(icon: "shoe.2.fill", label: "Varma skor"),
    ]),
    Band(below: 5, name: "Kallt", summary: "Vadderad jacka och ett lager under.", layers: [
        Garment(icon: "tshirt.fill", label: "Långärmad tröja"),
        Garment(icon: "tshirt.fill", label: "Tröja eller hoodie"),
        Garment(icon: "coat.fill", label: "Vadderad jacka"),
        Garment(icon: "shoe.fill", label: "Täckta skor"),
    ]),
    Band(below: 10, name: "Kyligt", summary: "Jacka på, gärna med en tröja under.", layers: [
        Garment(icon: "tshirt.fill", label: "Långärmad tröja"),
        Garment(icon: "tshirt.fill", label: "Tröja eller kofta"),
        Garment(icon: "jacket.fill", label: "Jacka"),
        Garment(icon: "figure.stand", label: "Långbyxor"),
    ]),
    Band(below: 15, name: "Svalt", summary: "Tunn jacka räcker en bit.", layers: [
        Garment(icon: "tshirt.fill", label: "Långärmad tröja"),
        Garment(icon: "jacket.fill", label: "Tunn jacka eller kofta"),
        Garment(icon: "figure.stand", label: "Långbyxor"),
    ]),
    Band(below: 19, name: "Milt", summary: "Skjortväder med något tunt över.", layers: [
        Garment(icon: "tshirt.fill", label: "T-shirt eller skjorta"),
        Garment(icon: "jacket.fill", label: "Tunn kofta över axeln"),
        Garment(icon: "figure.stand", label: "Långbyxor"),
    ]),
    Band(below: 24, name: "Varmt", summary: "Kortärmat hela dagen.", layers: [
        Garment(icon: "tshirt.fill", label: "T-shirt"),
        Garment(icon: "figure.stand", label: "Tunna byxor eller shorts"),
        Garment(icon: "shoe.fill", label: "Lätta skor"),
    ]),
    Band(below: 29, name: "Riktigt varmt", summary: "Lätt och luftigt, håll dig i skuggan.", layers: [
        Garment(icon: "tshirt.fill", label: "Tunn t-shirt eller linne"),
        Garment(icon: "figure.stand", label: "Shorts eller klänning"),
        Garment(icon: "shoe.fill", label: "Sandaler"),
    ]),
    Band(below: .infinity, name: "Hetta", summary: "Undvik middagssolen och drick mer än du tror.", layers: [
        Garment(icon: "tshirt.fill", label: "Linne i tunt tyg"),
        Garment(icon: "figure.stand", label: "Shorts eller klänning"),
        Garment(icon: "shoe.fill", label: "Sandaler"),
    ]),
]

private struct RainOutlook {
    var maxProbability: Int = 0
    var totalPrecipitation: Double = 0
    var hasSnow = false
    var hasThunder = false
    var peakLabel: String?
    var peakIsNow = false

    var isWet: Bool { maxProbability >= 30 || totalPrecipitation >= 0.3 }
}

private func rainOutlook(_ hours: [HourForecast]) -> RainOutlook {
    var outlook = RainOutlook()

    for (index, hour) in hours.enumerated() {
        outlook.totalPrecipitation += hour.precipitation
        if hour.condition.isSnow { outlook.hasSnow = true }
        if hour.condition.isThunder { outlook.hasThunder = true }
        if hour.precipitationProbability > outlook.maxProbability {
            outlook.maxProbability = hour.precipitationProbability
            outlook.peakLabel = hour.label
            outlook.peakIsNow = index == 0
        }
    }

    return outlook
}

private func umbrellaVerdict(_ forecast: Forecast, _ outlook: RainOutlook) -> Umbrella {
    let fromWhen: String
    if outlook.peakIsNow {
        fromWhen = " Störst risk just nu."
    } else if let label = outlook.peakLabel {
        fromWhen = " Störst risk kring \(label)."
    } else {
        fromWhen = ""
    }
    let risk = outlook.maxProbability

    guard outlook.isWet else {
        return Umbrella(level: .none, reason: "")
    }

    // Snö först: ett paraply gör ingen nytta där.
    if outlook.hasSnow {
        return Umbrella(
            level: .hood,
            reason: "Paraply hjälper inte i snön — mössa och luva fungerar bättre.\(fromWhen)"
        )
    }

    if outlook.hasThunder {
        return Umbrella(level: .raincoat, reason: "Regnjacka slår paraply i åskväder.\(fromWhen)")
    }

    // Ett paraply som viks ut och in är sämre än inget paraply alls.
    if forecast.windGusts >= 12 {
        let gusts = Int(forecast.windGusts.rounded())
        return Umbrella(
            level: .raincoat,
            reason: "Vindbyar på \(gusts) m/s vänder ett paraply ut och in — därför regnjacka i stället.\(fromWhen)"
        )
    }

    if outlook.maxProbability >= 55 || outlook.totalPrecipitation >= 1.5 {
        return Umbrella(level: .yes, reason: "\(risk) % risk för nedbörd de närmaste timmarna.\(fromWhen)")
    }

    return Umbrella(
        level: .maybe,
        reason: "\(risk) % risk för nedbörd — ett litet paraply i väskan räcker.\(fromWhen)"
    )
}

/// Widgeten har inget UV-index, så solskyddsråden hör bara till appen.
private func extras(_ forecast: Forecast, _ outlook: RainOutlook, _ umbrella: Umbrella) -> [Garment] {
    var extras: [Garment] = []
    let feels = forecast.apparentTemperature

    if let gear = umbrella.gear { extras.append(gear) }
    if feels < 0 { extras.append(Garment(icon: "scarf", label: "Halsduk")) }
    if feels < 5 { extras.append(Garment(icon: "hand.raised.fill", label: feels < -8 ? "Tumvantar" : "Vantar")) }
    if feels < 8 { extras.append(Garment(icon: "hat.cap.fill", label: "Mössa")) }
    if forecast.windSpeed >= 8, umbrella.level != .raincoat {
        extras.append(Garment(icon: "wind", label: "Vindtätt ytterlager"))
    }
    if outlook.totalPrecipitation >= 0.3, feels < 14 {
        extras.append(Garment(icon: "shoe.2.fill", label: "Vattentäta skor"))
    }
    if feels >= 25 { extras.append(Garment(icon: "drop.fill", label: "Vattenflaska")) }

    return extras
}

func adviseFor(_ forecast: Forecast) -> Advice {
    let outlook = rainOutlook(forecast.hours)
    let umbrella = umbrellaVerdict(forecast, outlook)
    let band = bands.first { forecast.apparentTemperature < $0.below } ?? bands[bands.count - 1]

    return Advice(
        band: band.name,
        summary: band.summary,
        layers: band.layers,
        extras: extras(forecast, outlook, umbrella),
        umbrella: umbrella
    )
}
