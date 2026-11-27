import Foundation
import Combine
import WebKit

struct RobinProfile {
    let id: String
    let name: String
    let email: String?
}

struct RobinSnapshot {
    let profile: RobinProfile?
    let products: [RobinProduct]
    let notices: [RobinNotice]
    let noticeErrors: Set<RobinProduct>
    let sessionExpired: Bool
}

@MainActor
final class RobinService: ObservableObject {
    @Published private(set) var snapshot = RobinSnapshot(profile: nil, products: [], notices: [], noticeErrors: [], sessionExpired: false)
    @Published private(set) var isLoading = true
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
            snapshot = RobinSnapshot(profile: nil, products: [], notices: [], noticeErrors: [], sessionExpired: true)
            return
        }
        let hostCookies = cookies.filter { cookie in
            let domain = cookie.domain.trimmingCharacters(in: CharacterSet(charactersIn: ".")).lowercased()
            let host = host.lowercased()
            return host == domain || host.hasSuffix("." + domain)
        }
        guard !hostCookies.isEmpty else {
            snapshot = RobinSnapshot(profile: nil, products: [], notices: [], noticeErrors: [], sessionExpired: true)
            return
        }

        guard let portalData = await get("/portal/api/me", cookies: hostCookies),
              let portal = try? JSONSerialization.jsonObject(with: portalData) as? [String: Any],
              let profile = profile(from: portal), portal["is_application_admin"] as? Bool != true else {
            snapshot = RobinSnapshot(profile: nil, products: [], notices: [], noticeErrors: [], sessionExpired: true)
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
        snapshot = RobinSnapshot(profile: profile, products: products, notices: notices, noticeErrors: errors, sessionExpired: false)
    }

    func reset() {
        snapshot = RobinSnapshot(profile: nil, products: [], notices: [], noticeErrors: [], sessionExpired: true)
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
