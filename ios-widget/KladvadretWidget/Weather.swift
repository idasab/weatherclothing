import Foundation

/// Vädersituationen, översatt från källans egen kodskala.
/// Speglar `WeatherCondition` i webbappen så råden blir identiska.
struct Condition {
    let label: String
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
        case 1: return dry("Klart", "☀️", clearSky: true)
        case 2: return dry("Nästan klart", "🌤️", clearSky: true)
        case 3: return dry("Växlande molnighet", "⛅")
        case 4: return dry("Halvklart", "⛅")
        case 5: return dry("Molnigt", "☁️")
        case 6: return dry("Mulet", "☁️")
        case 7: return dry("Dimma", "🌫️")
        case 8: return rain("Lätta regnskurar", "🌦️")
        case 9: return rain("Måttliga regnskurar", "🌧️")
        case 10: return rain("Kraftiga regnskurar", "🌧️")
        case 11: return thunder("Åskskurar", "⛈️")
        case 12: return sleet("Lätta byar av snöblandat regn", "🌨️")
        case 13: return sleet("Måttliga byar av snöblandat regn", "🌨️")
        case 14: return sleet("Kraftiga byar av snöblandat regn", "🌨️")
        case 15: return snow("Lätta snöbyar", "🌨️")
        case 16: return snow("Måttliga snöbyar", "❄️")
        case 17: return snow("Kraftiga snöbyar", "❄️")
        case 18: return rain("Lätt regn", "🌦️")
        case 19: return rain("Måttligt regn", "🌧️")
        case 20: return rain("Kraftigt regn", "🌧️")
        case 21: return thunder("Åska", "⛈️")
        case 22: return sleet("Lätt snöblandat regn", "🌨️")
        case 23: return sleet("Måttligt snöblandat regn", "🌨️")
        case 24: return sleet("Kraftigt snöblandat regn", "🌨️")
        case 25: return snow("Lätt snöfall", "🌨️")
        case 26: return snow("Måttligt snöfall", "❄️")
        case 27: return snow("Kraftigt snöfall", "❄️")
        default: return unknown
        }
    }

    /// WMO-koder, som Open-Meteo använder utanför SMHI:s område.
    static func wmo(_ code: Int) -> Condition {
        switch code {
        case 0: return dry("Klart", "☀️", clearSky: true)
        case 1: return dry("Mestadels klart", "🌤️", clearSky: true)
        case 2: return dry("Halvklart", "⛅")
        case 3: return dry("Mulet", "☁️")
        case 45, 48: return dry("Dimma", "🌫️")
        case 51, 53: return rain("Duggregn", "🌦️")
        case 55, 56, 57: return rain("Tätt duggregn", "🌧️")
        case 61: return rain("Lätt regn", "🌦️")
        case 63: return rain("Regn", "🌧️")
        case 65, 66, 67: return rain("Kraftigt regn", "🌧️")
        case 71, 77: return snow("Lätt snöfall", "🌨️")
        case 73: return snow("Snöfall", "❄️")
        case 75: return snow("Kraftigt snöfall", "❄️")
        case 80: return rain("Lätta regnskurar", "🌦️")
        case 81: return rain("Regnskurar", "🌧️")
        case 82: return rain("Kraftiga regnskurar", "🌧️")
        case 85: return snow("Lätta snöbyar", "🌨️")
        case 86: return snow("Snöbyar", "❄️")
        case 95: return thunder("Åska", "⛈️")
        case 96, 99: return thunder("Åska med hagel", "⛈️")
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
