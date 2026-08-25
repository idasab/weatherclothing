import Foundation

/// Vädersituationen, översatt från källans egen kodskala.
/// Speglar `WeatherCondition` i webbappen så råden blir identiska.
struct Condition {
    let label: String
    /// Namn på en SF Symbol. Ritas i multicolor, så solen blir gul och
    /// dropparna blå precis som i webbappens egna vädersymboler.
    let symbol: String
    let clearSky: Bool
    let isRain: Bool
    let isSnow: Bool
    let isThunder: Bool
}

extension Condition {
    static let unknown = Condition(
        label: "Okänt väder", symbol: "❔",
        clearSky: false, isRain: false, isSnow: false, isThunder: false
    )

    private static func dry(_ label: String, _ symbol: String, clearSky: Bool = false) -> Condition {
        Condition(label: label, symbol: symbol, clearSky: clearSky,
                  isRain: false, isSnow: false, isThunder: false)
    }

    private static func rain(_ label: String, _ symbol: String) -> Condition {
        Condition(label: label, symbol: symbol, clearSky: false,
                  isRain: true, isSnow: false, isThunder: false)
    }

    /// Snöblandat regn räknas som både regn och snö: paraply hjälper inte.
    private static func sleet(_ label: String, _ symbol: String) -> Condition {
        Condition(label: label, symbol: symbol, clearSky: false,
                  isRain: true, isSnow: true, isThunder: false)
    }

    private static func snow(_ label: String, _ symbol: String) -> Condition {
        Condition(label: label, symbol: symbol, clearSky: false,
                  isRain: false, isSnow: true, isThunder: false)
    }

    private static func thunder(_ label: String, _ symbol: String) -> Condition {
        Condition(label: label, symbol: symbol, clearSky: false,
                  isRain: true, isSnow: false, isThunder: true)
    }

    /// SMHI:s vädersymbol Wsymb2, 1–27.
    static func smhi(_ code: Int) -> Condition {
        switch code {
        case 1: return dry("Klart", "sun.max.fill", clearSky: true)
        case 2: return dry("Nästan klart", "sun.max.fill", clearSky: true)
        case 3: return dry("Växlande molnighet", "cloud.sun.fill")
        case 4: return dry("Halvklart", "cloud.sun.fill")
        case 5: return dry("Molnigt", "cloud.fill")
        case 6: return dry("Mulet", "cloud.fill")
        case 7: return dry("Dimma", "cloud.fog.fill")
        case 8: return rain("Lätta regnskurar", "cloud.sun.rain.fill")
        case 9: return rain("Måttliga regnskurar", "cloud.sun.rain.fill")
        case 10: return rain("Kraftiga regnskurar", "cloud.heavyrain.fill")
        case 11: return thunder("Åskskurar", "cloud.bolt.rain.fill")
        case 12: return sleet("Lätta byar av snöblandat regn", "cloud.sleet.fill")
        case 13: return sleet("Måttliga byar av snöblandat regn", "cloud.sleet.fill")
        case 14: return sleet("Kraftiga byar av snöblandat regn", "cloud.sleet.fill")
        case 15: return snow("Lätta snöbyar", "cloud.snow.fill")
        case 16: return snow("Måttliga snöbyar", "cloud.snow.fill")
        case 17: return snow("Kraftiga snöbyar", "cloud.snow.fill")
        case 18: return rain("Lätt regn", "cloud.drizzle.fill")
        case 19: return rain("Måttligt regn", "cloud.rain.fill")
        case 20: return rain("Kraftigt regn", "cloud.heavyrain.fill")
        case 21: return thunder("Åska", "cloud.bolt.rain.fill")
        case 22: return sleet("Lätt snöblandat regn", "cloud.sleet.fill")
        case 23: return sleet("Måttligt snöblandat regn", "cloud.sleet.fill")
        case 24: return sleet("Kraftigt snöblandat regn", "cloud.sleet.fill")
        case 25: return snow("Lätt snöfall", "cloud.snow.fill")
        case 26: return snow("Måttligt snöfall", "cloud.snow.fill")
        case 27: return snow("Kraftigt snöfall", "cloud.snow.fill")
        default: return unknown
        }
    }

    /// WMO-koder, som Open-Meteo använder utanför SMHI:s område.
    static func wmo(_ code: Int) -> Condition {
        switch code {
        case 0: return dry("Klart", "sun.max.fill", clearSky: true)
        case 1: return dry("Mestadels klart", "sun.max.fill", clearSky: true)
        case 2: return dry("Halvklart", "cloud.sun.fill")
        case 3: return dry("Mulet", "cloud.fill")
        case 45, 48: return dry("Dimma", "cloud.fog.fill")
        case 51, 53: return rain("Duggregn", "cloud.drizzle.fill")
        case 55, 56, 57: return rain("Tätt duggregn", "cloud.rain.fill")
        case 61: return rain("Lätt regn", "cloud.drizzle.fill")
        case 63: return rain("Regn", "cloud.rain.fill")
        case 65, 66, 67: return rain("Kraftigt regn", "cloud.heavyrain.fill")
        case 71, 77: return snow("Lätt snöfall", "cloud.snow.fill")
        case 73: return snow("Snöfall", "cloud.snow.fill")
        case 75: return snow("Kraftigt snöfall", "cloud.snow.fill")
        case 80: return rain("Lätta regnskurar", "cloud.sun.rain.fill")
        case 81: return rain("Regnskurar", "cloud.sun.rain.fill")
        case 82: return rain("Kraftiga regnskurar", "cloud.heavyrain.fill")
        case 85: return snow("Lätta snöbyar", "cloud.snow.fill")
        case 86: return snow("Snöbyar", "cloud.snow.fill")
        case 95: return thunder("Åska", "cloud.bolt.rain.fill")
        case 96, 99: return thunder("Åska med hagel", "cloud.bolt.rain.fill")
        default: return unknown
        }
    }
}

struct HourForecast: Identifiable {
    /// Färdig att visa, "15:00".
    let label: String
    let temperature: Double
    let apparentTemperature: Double
    let precipitationProbability: Int
    /// Millimeter under timmen.
    let precipitation: Double
    let condition: Condition

    var id: String { label }
}

/** Måne i stället för sol när det är natt och himlen är klar. */
func symbolName(for condition: Condition, isDay: Bool) -> String {
    if !isDay && condition.clearSky {
        return "moon.stars.fill"
    }
    return condition.symbol
}

struct Forecast {
    let placeName: String
    let source: String
    let temperature: Double
    let apparentTemperature: Double
    /// m/s
    let windSpeed: Double
    /// m/s
    let windGusts: Double
    let condition: Condition
    /// De närmaste tolv timmarna, från och med nuvarande timme.
    let hours: [HourForecast]
}
