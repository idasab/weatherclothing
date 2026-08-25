import CoreLocation
import Foundation

struct WidgetPlace {
    let name: String
    let latitude: Double
    let longitude: Double
    /// Sant när vi inte fick någon position och visar reservorten i stället.
    let isFallback: Bool
}

struct LoadResult {
    let forecast: Forecast?
    let usedFallbackPlace: Bool
}

/// Visas när widgeten inte får läsa positionen. Byt gärna till din egen ort.
private let fallbackPlace = WidgetPlace(
    name: "Stockholm", latitude: 59.3293, longitude: 18.0686, isFallback: true
)

/// Positionen, om appen redan har fått tillstånd. Widgeten frågar aldrig själv.
private final class LocationFetcher: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private var continuation: CheckedContinuation<CLLocation?, Never>?

    func current() async -> CLLocation? {
        let status = manager.authorizationStatus
        guard status == .authorizedWhenInUse || status == .authorizedAlways else {
            return nil
        }

        if let cached = manager.location {
            return cached
        }

        return await withCheckedContinuation { continuation in
            self.continuation = continuation
            manager.delegate = self
            manager.requestLocation()
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        finish(with: locations.last)
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        finish(with: nil)
    }

    private func finish(with location: CLLocation?) {
        continuation?.resume(returning: location)
        continuation = nil
    }
}

enum ForecastLoader {
    static func load() async -> LoadResult {
        let place = await resolvePlace()
        return LoadResult(forecast: await forecast(for: place), usedFallbackPlace: place.isFallback)
    }

    // MARK: - Plats

    private static func resolvePlace() async -> WidgetPlace {
        guard let location = await LocationFetcher().current() else {
            return fallbackPlace
        }

        let placemarks = try? await CLGeocoder().reverseGeocodeLocation(location)
        let name = placemarks?.first?.locality ?? "Din plats"

        return WidgetPlace(
            name: name,
            latitude: location.coordinate.latitude,
            longitude: location.coordinate.longitude,
            isFallback: false
        )
    }

    // MARK: - Prognos

    private static func forecast(for place: WidgetPlace) async -> Forecast? {
        if smhiCovers(place), let swedish = try? await smhiForecast(place) {
            return swedish
        }
        return try? await openMeteoForecast(place)
    }

    /// Modellområdets omskrivna rektangel, samma grovsållning som webbappen gör.
    private static func smhiCovers(_ place: WidgetPlace) -> Bool {
        (49.5...75.5).contains(place.latitude) && (-18.5...54.5).contains(place.longitude)
    }

    private static let hoursAhead = 12

    private static let utcParser: ISO8601DateFormatter = {
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime]
        return parser
    }()

    private static let hourLabelFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "sv_SE")
        formatter.dateFormat = "HH:mm"
        return formatter
    }()

    // MARK: SMHI

    private struct SmhiResponse: Decodable {
        struct Entry: Decodable {
            let time: String
            let data: [String: Double]
        }

        let timeSeries: [Entry]
    }

    private static func smhiForecast(_ place: WidgetPlace) async throws -> Forecast {
        let longitude = (place.longitude * 1_000_000).rounded() / 1_000_000
        let latitude = (place.latitude * 1_000_000).rounded() / 1_000_000
        let url = URL(string: "https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1"
            + "/geotype/point/lon/\(longitude)/lat/\(latitude)/data.json")!

        let (data, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        let decoded = try JSONDecoder().decode(SmhiResponse.self, from: data)
        guard let current = decoded.timeSeries.first else {
            throw URLError(.zeroByteResource)
        }

        let hours = decoded.timeSeries.prefix(hoursAhead).map { entry -> HourForecast in
            let temperature = entry.data["air_temperature"] ?? 0
            let wind = entry.data["wind_speed"] ?? 0
            let humidity = entry.data["relative_humidity"] ?? 0

            return HourForecast(
                label: label(fromUtc: entry.time),
                temperature: temperature,
                apparentTemperature: apparentTemperature(
                    temperature: temperature, windSpeedMs: wind, relativeHumidity: humidity
                ),
                precipitationProbability: Int(entry.data["probability_of_precipitation"] ?? 0),
                precipitation: entry.data["precipitation_amount_mean"] ?? 0,
                condition: Condition.smhi(Int(entry.data["symbol_code"] ?? 0))
            )
        }

        let temperature = current.data["air_temperature"] ?? 0
        let wind = current.data["wind_speed"] ?? 0
        let humidity = current.data["relative_humidity"] ?? 0

        return Forecast(
            placeName: place.name,
            source: "SMHI",
            temperature: temperature,
            apparentTemperature: apparentTemperature(
                temperature: temperature, windSpeedMs: wind, relativeHumidity: humidity
            ),
            windSpeed: wind,
            windGusts: current.data["wind_speed_of_gust"] ?? 0,
            condition: Condition.smhi(Int(current.data["symbol_code"] ?? 0)),
            hours: Array(hours)
        )
    }

    /// SMHI stämplar tiderna i UTC, widgeten visar dem i enhetens tidszon.
    private static func label(fromUtc time: String) -> String {
        guard let date = utcParser.date(from: time) else {
            return String(time.dropFirst(11).prefix(5))
        }
        return hourLabelFormatter.string(from: date)
    }

    // MARK: Open-Meteo

    private struct OpenMeteoResponse: Decodable {
        struct Current: Decodable {
            let time: String
            let temperature_2m: Double
            let apparent_temperature: Double
            let weather_code: Int
            let wind_speed_10m: Double
            let wind_gusts_10m: Double
        }

        struct Hourly: Decodable {
            let time: [String]
            let temperature_2m: [Double]
            let apparent_temperature: [Double]
            let precipitation_probability: [Int?]
            let precipitation: [Double]
            let weather_code: [Int]
        }

        let current: Current
        let hourly: Hourly
    }

    private static func openMeteoForecast(_ place: WidgetPlace) async throws -> Forecast {
        var components = URLComponents(string: "https://api.open-meteo.com/v1/forecast")!
        components.queryItems = [
            URLQueryItem(name: "latitude", value: String(place.latitude)),
            URLQueryItem(name: "longitude", value: String(place.longitude)),
            URLQueryItem(
                name: "current",
                value: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m"
            ),
            URLQueryItem(
                name: "hourly",
                value: "temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code"
            ),
            URLQueryItem(name: "timezone", value: "auto"),
            URLQueryItem(name: "forecast_days", value: "2"),
            URLQueryItem(name: "wind_speed_unit", value: "ms"),
        ]

        let (data, _) = try await URLSession.shared.data(from: components.url!)
        let decoded = try JSONDecoder().decode(OpenMeteoResponse.self, from: data)

        // Jämför tidsstämplarna som text, så tolkas de i platsens tidszon.
        let currentHour = String(decoded.current.time.prefix(13))
        var hours: [HourForecast] = []

        for index in decoded.hourly.time.indices where hours.count < hoursAhead {
            let time = decoded.hourly.time[index]
            guard String(time.prefix(13)) >= currentHour else { continue }

            hours.append(
                HourForecast(
                    label: String(time.dropFirst(11).prefix(5)),
                    temperature: decoded.hourly.temperature_2m[index],
                    apparentTemperature: decoded.hourly.apparent_temperature[index],
                    precipitationProbability: decoded.hourly.precipitation_probability[index] ?? 0,
                    precipitation: decoded.hourly.precipitation[index],
                    condition: Condition.wmo(decoded.hourly.weather_code[index])
                )
            )
        }

        return Forecast(
            placeName: place.name,
            source: "Open-Meteo",
            temperature: decoded.current.temperature_2m,
            apparentTemperature: decoded.current.apparent_temperature,
            windSpeed: decoded.current.wind_speed_10m,
            windGusts: decoded.current.wind_gusts_10m,
            condition: Condition.wmo(decoded.current.weather_code),
            hours: hours
        )
    }
}
