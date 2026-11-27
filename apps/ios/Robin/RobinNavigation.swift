import Foundation

enum RobinTab: String, CaseIterable, Identifiable {
    case home = "Inicio"
    case inbox = "Avisos"
    case account = "Cuenta"

    var id: String { rawValue }
    var symbol: String {
        switch self {
        case .home: "house"
        case .inbox: "bell"
        case .account: "person.crop.circle"
        }
    }
}

enum RobinProduct: String, CaseIterable, Identifiable {
    case portal
    case robinjr
    case community

    var id: String { rawValue }
    var title: String {
        switch self {
        case .portal: "Portal del Alumno"
        case .robinjr: "Robin Jr"
        case .community: "The Robin Plan"
        }
    }
    var symbol: String {
        switch self {
        case .portal: "graduationcap"
        case .robinjr: "sparkles"
        case .community: "person.3"
        }
    }
    var assetName: String {
        switch self {
        case .portal: "RobinStudent"
        case .robinjr: "RobinJr"
        case .community: "RobinCommunity"
        }
    }
    var path: String {
        switch self {
        case .portal: "/portal/"
        case .robinjr: "/robinjr/"
        case .community: "/therobinplan/"
        }
    }

    func noticeURL(id: String, origin: URL) -> URL? {
        guard UUID(uuidString: id) != nil,
              var components = URLComponents(url: origin.appending(path: String(path.dropFirst())), resolvingAgainstBaseURL: false) else { return nil }
        components.queryItems = [URLQueryItem(name: "notification", value: id)]
        guard let url = components.url, RobinAddress.isInternalSite(url) else { return nil }
        return url
    }
}

struct RobinNotice: Identifiable, Hashable {
    let id: String
    let title: String
    let type: String
    let status: String
    let createdAt: Date
    let product: RobinProduct

    var isPending: Bool { status == "pending" }

    static func summaries(from data: Data, product: RobinProduct) -> [RobinNotice] {
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let rows = object["notifications"] as? [[String: Any]] else { return [] }
        return rows.compactMap { row in
            guard let id = row["id"] as? String, UUID(uuidString: id) != nil,
                  let title = row["title"] as? String,
                  let rawDate = row["created_at"] as? String,
                  let date = ISO8601DateFormatter.robin.date(from: rawDate)
                    ?? ISO8601DateFormatter.robinWithoutFraction.date(from: rawDate) else { return nil }
            return RobinNotice(
                id: id,
                title: title,
                type: row["type"] as? String ?? "general",
                status: row["status"] as? String ?? "pending",
                createdAt: date,
                product: product
            )
        }
    }
}

private extension ISO8601DateFormatter {
    static let robin: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
    static let robinWithoutFraction: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()
}
