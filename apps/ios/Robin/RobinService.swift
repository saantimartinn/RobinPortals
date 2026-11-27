import Foundation
import Combine
import WebKit

struct RobinProfile {
    let id: String
    let name: String
    let email: String?
}

struct RobinAdminBooking: Identifiable {
    let id: String
    let student: String
    let topic: String
    let startAt: Date
    let durationMinutes: Int
    let joinURL: URL?
    let cancellationRequested: Bool
}

struct RobinSnapshot {
    let profile: RobinProfile?
    let products: [RobinProduct]
    let notices: [RobinNotice]
    let noticeErrors: Set<RobinProduct>
    let sessionExpired: Bool
    let isApplicationAdmin: Bool
}

@MainActor
final class RobinService: ObservableObject {
    @Published private(set) var snapshot = RobinSnapshot(profile: nil, products: [], notices: [], noticeErrors: [], sessionExpired: false, isApplicationAdmin: false)
    @Published private(set) var isLoading = true
    @Published private(set) var adminBookings: [RobinAdminBooking] = []
    @Published private(set) var adminCalendarError = false
    @Published var lastProduct: RobinProduct? {
        didSet {
            if let value = lastProduct?.rawValue { UserDefaults.standard.set(value, forKey: "robin.lastProduct") }
            else { UserDefaults.standard.removeObject(forKey: "robin.lastProduct") }
        }
    }

    init() {
        if let value = UserDefaults.standard.string(forKey: "robin.lastProduct") {
            lastProduct = RobinProduct(rawValue: value)
        }
    }

    func refresh() async {
        isLoading = true
        defer { isLoading = false }
        let cookieStore = WKWebsiteDataStore.default().httpCookieStore
        let cookies = await withCheckedContinuation { continuation in
            cookieStore.getAllCookies { continuation.resume(returning: $0) }
        }
        guard let host = RobinAddress.origin.host else {
            snapshot = RobinSnapshot(profile: nil, products: [], notices: [], noticeErrors: [], sessionExpired: true, isApplicationAdmin: false)
            return
        }
        let hostCookies = cookies.filter { cookie in
            let domain = cookie.domain.trimmingCharacters(in: CharacterSet(charactersIn: ".")).lowercased()
            let host = host.lowercased()
            return host == domain || host.hasSuffix("." + domain)
        }
        guard !hostCookies.isEmpty else {
            snapshot = RobinSnapshot(profile: nil, products: [], notices: [], noticeErrors: [], sessionExpired: true, isApplicationAdmin: false)
            return
        }

        guard let portalData = await get("/portal/api/me", cookies: hostCookies),
              let portal = try? JSONSerialization.jsonObject(with: portalData) as? [String: Any] else {
            snapshot = RobinSnapshot(profile: nil, products: [], notices: [], noticeErrors: [], sessionExpired: true, isApplicationAdmin: false)
            return
        }
        if portal["is_application_admin"] as? Bool == true {
            snapshot = RobinSnapshot(profile: profile(from: portal), products: [], notices: [], noticeErrors: [], sessionExpired: false, isApplicationAdmin: true)
            if let data = await get("/portal/api/admin/dashboard", cookies: hostCookies),
               let dashboard = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                adminBookings = parseAdminBookings(dashboard)
                adminCalendarError = false
            } else {
                adminCalendarError = true
            }
            return
        }
        adminBookings = []
        adminCalendarError = false
        guard let profile = profile(from: portal) else {
            snapshot = RobinSnapshot(profile: nil, products: [], notices: [], noticeErrors: [], sessionExpired: true, isApplicationAdmin: false)
            return
        }

        async let jr = get("/robinjr/api/me", cookies: hostCookies)
        async let plan = get("/therobinplan/api/me", cookies: hostCookies)
        let (jrData, planData) = await (jr, plan)
        let portalAvailable: Bool
        if portal["auth_source"] as? String == "external_client" {
            portalAvailable = (portal["available_portals"] as? [String] ?? []).contains("portal")
        } else {
            portalAvailable = true
        }
        var products: [RobinProduct] = portalAvailable ? [.portal] : []
        if let jrData, let value = try? JSONSerialization.jsonObject(with: jrData) as? [String: Any],
           value["is_application_admin"] as? Bool != true,
           value["role"] as? String != "application_admin" {
            products.append(.robinjr)
        }
        if let planData, let value = try? JSONSerialization.jsonObject(with: planData) as? [String: Any] {
            let role = value["role"] as? String
            let status = value["subscription_status"] as? String
            let communityAccess = value["community_access"] as? String
            if role == "subscriber", ["active", "trialing"].contains(status ?? "") || communityAccess == "arrival" {
                products.append(.community)
            }
        }

        let noticeResults = await withTaskGroup(of: (RobinProduct, Data?).self) { group in
            for product in products {
                group.addTask { [hostCookies] in
                    (product, await self.get("\(product.path)api/notifications?native=1", cookies: hostCookies))
                }
            }
            var results: [(RobinProduct, Data?)] = []
            for await result in group { results.append(result) }
            return results
        }
        var notices: [RobinNotice] = []
        var errors: Set<RobinProduct> = []
        for (product, data) in noticeResults {
            guard let data else { errors.insert(product); continue }
            notices += RobinNotice.summaries(from: data, product: product)
        }
        notices.sort { $0.createdAt > $1.createdAt }
        snapshot = RobinSnapshot(profile: profile, products: products, notices: notices, noticeErrors: errors, sessionExpired: false, isApplicationAdmin: false)
    }

    func reset() {
        snapshot = RobinSnapshot(profile: nil, products: [], notices: [], noticeErrors: [], sessionExpired: true, isApplicationAdmin: false)
        adminBookings = []
        adminCalendarError = false
    }

    private func parseAdminBookings(_ dashboard: [String: Any]) -> [RobinAdminBooking] {
        let clients = (dashboard["clients"] as? [[String: Any]] ?? []).reduce(into: [String: String]()) { names, row in
            guard let id = row["id"] as? String else { return }
            let name = [row["nombre"] as? String, row["apellidos"] as? String]
                .compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " ")
            names[id] = name
        }
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let withoutFraction = ISO8601DateFormatter()
        withoutFraction.formatOptions = [.withInternetDateTime]
        return (dashboard["bookings"] as? [[String: Any]] ?? []).compactMap { row in
            guard let id = row["id"] as? String,
                  let rawDate = row["start_at"] as? String,
                  let date = withFraction.date(from: rawDate) ?? withoutFraction.date(from: rawDate),
                  date >= Date(), row["status"] as? String == "scheduled" else { return nil }
            let student = (row["user_id"] as? String).flatMap { clients[$0] }
            return RobinAdminBooking(
                id: id,
                student: student.flatMap { $0.isEmpty ? nil : $0 } ?? "Alumno Robin",
                topic: row["topic"] as? String ?? "Llamada con alumno",
                startAt: date,
                durationMinutes: row["duration_min"] as? Int ?? 30,
                joinURL: (row["meet_join_url"] as? String).flatMap(URL.init(string:)),
                cancellationRequested: row["cancellation_requested_at"] != nil && !(row["cancellation_requested_at"] is NSNull)
            )
        }.sorted { $0.startAt < $1.startAt }
    }

    private func profile(from value: [String: Any]) -> RobinProfile? {
        guard let id = value["id"] as? String else { return nil }
        let name = [value["nombre"] as? String, value["apellidos"] as? String]
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .joined(separator: " ")
        return RobinProfile(id: id, name: name.isEmpty ? (value["username"] as? String ?? "") : name,
                            email: value["email"] as? String)
    }

    func issueRobinJrTicket() async -> String? {
        let cookies = await withCheckedContinuation { continuation in
            WKWebsiteDataStore.default().httpCookieStore.getAllCookies { continuation.resume(returning: $0) }
        }
        guard let host = RobinAddress.origin.host,
              let url = URL(string: "/portal/api/auth/sso-ticket", relativeTo: RobinAddress.origin)?.absoluteURL else { return nil }
        let hostCookies = cookies.filter { cookie in
            let domain = cookie.domain.trimmingCharacters(in: CharacterSet(charactersIn: ".")).lowercased()
            return host == domain || host.hasSuffix("." + domain)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 15
        request.httpShouldHandleCookies = false
        request.setValue(hostCookies.map { "\($0.name)=\($0.value)" }.joined(separator: "; "), forHTTPHeaderField: "Cookie")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = Data("{\"target\":\"robinjr\"}".utf8)
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              let response = response as? HTTPURLResponse,
              (200..<300).contains(response.statusCode),
              let result = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        return result["ticket"] as? String
    }

    private func get(_ path: String, cookies: [HTTPCookie]) async -> Data? {
        guard let url = URL(string: path, relativeTo: RobinAddress.origin)?.absoluteURL else { return nil }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 15
        request.httpShouldHandleCookies = false
        request.setValue(cookies.map { "\($0.name)=\($0.value)" }.joined(separator: "; "), forHTTPHeaderField: "Cookie")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let response = response as? HTTPURLResponse, (200..<300).contains(response.statusCode) else { return nil }
            return data
        } catch { return nil }
    }
}
