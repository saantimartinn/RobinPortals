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

enum RobinAdminTab: String, CaseIterable, Identifiable {
    case home = "Inicio"
    case calendar = "Calendario"
    case account = "Cuenta"

    var id: String { rawValue }
    var symbol: String {
        switch self {
        case .home: "house"
        case .calendar: "calendar"
        case .account: "person.crop.circle"
        }
    }
}

enum RobinAdminDestination: String, CaseIterable, Identifiable {
    case platform
    case crm
    case portal
    case robinjr
    case community
    case analytics
    case developers

    var id: String { rawValue }
    var title: String {
        switch self {
        case .platform: "Administración"
        case .crm: "CRM"
        case .portal: "Portal del Alumno"
        case .robinjr: "Robin Jr"
        case .community: "The Robin Plan"
        case .analytics: "Analíticas"
        case .developers: "Desarrolladores"
        }
    }
    var subtitle: String {
        switch self {
        case .platform: "Resumen y gestión del equipo"
        case .crm: "Leads, clientes y seguimiento"
        case .portal: "Expedientes y notificaciones"
        case .robinjr: "Orientación y planes de alumnos"
        case .community: "Miembros, partners y soporte"
        case .analytics: "Ventas, campañas y actividad"
        case .developers: "Pruebas y registros"
        }
    }
    var symbol: String {
        switch self {
        case .platform: "square.grid.2x2"
        case .crm: "person.2"
        case .portal: "graduationcap"
        case .robinjr: "sparkles"
        case .community: "person.3"
        case .analytics: "chart.bar.xaxis"
        case .developers: "hammer"
        }
    }
    var robinProduct: RobinProduct? {
        switch self {
        case .portal: .portal
        case .robinjr: .robinjr
        case .community: .community
        default: nil
        }
    }
    var path: String {
        switch self {
        case .platform: "/admin/"
        case .crm: "/admin/crm"
        case .portal: "/portal/"
        case .robinjr: "/robinjr/"
        case .community: "/therobinplan/"
        case .analytics: "/admin/analiticas/ventas"
        case .developers: "/admin/desarrolladores/tests"
        }
    }
}

struct RobinNativeSection: Identifiable {
    let key: String
    let label: String
    var id: String { key }

    var symbol: String {
        switch key {
        case "estado", "inicio", "home", "panel", "section-0": "house"
        case "clientes", "usuarios", "section-1": "person.2"
        case "notificaciones": "bell"
        case "faqs": "questionmark.circle"
        case "reservas", "llamadas", "plan": "calendar"
        case "carreras": "graduationcap"
        case "documentos": "doc.text"
        case "pagos": "creditcard"
        case "perfil", "ajustes": "person.crop.circle"
        case "soporte": "bubble.left"
        case "partners": "handshake"
        default: "square.grid.2x2"
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
