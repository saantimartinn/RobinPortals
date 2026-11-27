import SwiftUI

enum RobinStyle {
    static let navy = Color(red: 45.0 / 255, green: 58.0 / 255, blue: 100.0 / 255)
    static let gold = Color(red: 236.0 / 255, green: 180.0 / 255, blue: 80.0 / 255)
    static let canvas = Color(red: 254.0 / 255, green: 251.0 / 255, blue: 229.0 / 255)
    static let paper = Color(red: 255.0 / 255, green: 253.0 / 255, blue: 245.0 / 255)
    static let soft = Color(red: 246.0 / 255, green: 243.0 / 255, blue: 224.0 / 255)
    static let border = Color(red: 237.0 / 255, green: 236.0 / 255, blue: 219.0 / 255)
    static let muted = Color(red: 104.0 / 255, green: 112.0 / 255, blue: 136.0 / 255)
    static let display = "RobinDisplay-Medium"
    static let displayBold = "RobinDisplay-Bold"
    static let subtitle = "RobinSubtitle-Regular"
    static let text = "RobinText-Regular"
    static let textSemibold = "RobinText-Semibold"

    static func initials(for name: String?) -> String {
        let parts = (name ?? "R").split(whereSeparator: \.isWhitespace)
        let value = parts.prefix(2).compactMap(\.first).map(String.init).joined()
        return value.isEmpty ? "R" : value.uppercased()
    }
}

struct RobinBrandHeader: View {
    var personName: String? = nil
    var trailingSymbol: String? = nil
    var trailingAction: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: 12) {
            Image("RobinWordmark")
                .resizable()
                .scaledToFit()
                .frame(width: 88, height: 40)
                .accessibilityLabel("Robin")
            Spacer()
            if let trailingSymbol, let trailingAction {
                Button(action: trailingAction) {
                    Image(systemName: trailingSymbol)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(RobinStyle.navy)
                        .frame(width: 42, height: 42)
                        .background(RobinStyle.paper, in: Circle())
                        .overlay(Circle().stroke(RobinStyle.border, lineWidth: 1))
                }
                .accessibilityLabel(trailingSymbol == "bell" ? "Abrir avisos" : "Abrir cuenta")
            }
            if let personName {
                Text(RobinStyle.initials(for: personName))
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(RobinStyle.navy)
                    .frame(width: 42, height: 42)
                    .background(RobinStyle.gold.opacity(0.28), in: Circle())
                    .overlay(Circle().stroke(RobinStyle.gold.opacity(0.75), lineWidth: 1))
                    .accessibilityLabel("Cuenta de \(personName)")
            }
        }
        .frame(height: 44)
    }
}

struct RobinPageHeading: View {
    let eyebrow: String
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(eyebrow.uppercased())
                .font(.custom(RobinStyle.displayBold, size: 11))
                .tracking(1.25)
                .foregroundStyle(RobinStyle.muted)
            Text(title)
                .font(.custom(RobinStyle.display, size: 34))
                .tracking(-0.6)
                .foregroundStyle(RobinStyle.navy)
                .fixedSize(horizontal: false, vertical: true)
            Text(subtitle)
                .font(.custom(RobinStyle.text, size: 14))
                .lineSpacing(3)
                .foregroundStyle(RobinStyle.muted)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct RobinSectionHeading: View {
    let title: String
    var trailing: String? = nil

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title).font(.custom(RobinStyle.subtitle, size: 19)).foregroundStyle(RobinStyle.navy)
            Spacer()
            if let trailing { Text(trailing).font(.system(size: 12, weight: .medium)).foregroundStyle(RobinStyle.muted) }
        }
    }
}

struct RobinProductLogo: View {
    let product: RobinProduct
    var size: CGFloat = 52

    var body: some View {
        Image(product.assetName)
            .resizable()
            .scaledToFit()
            .frame(width: size, height: size)
            .clipShape(RoundedRectangle(cornerRadius: size * 0.24, style: .continuous))
            .padding(size * 0.1)
            .background(RobinStyle.soft, in: RoundedRectangle(cornerRadius: size * 0.32, style: .continuous))
            .accessibilityHidden(true)
    }
}

struct RobinTabBar: View {
    @Binding var selection: RobinTab
    let pendingCount: Int

    var body: some View {
        HStack(spacing: 4) {
            ForEach(RobinTab.allCases) { tab in
                Button { selection = tab } label: {
                    VStack(spacing: 5) {
                        ZStack(alignment: .topTrailing) {
                            Image(systemName: selection == tab ? selectedSymbol(tab) : tab.symbol)
                                .font(.system(size: 18, weight: selection == tab ? .semibold : .regular))
                                .frame(width: 34, height: 22)
                            if tab == .inbox && pendingCount > 0 {
                                Circle().fill(RobinStyle.gold).frame(width: 8, height: 8).offset(x: -2, y: -1)
                            }
                        }
                        Text(tab.rawValue).font(.custom(selection == tab ? RobinStyle.textSemibold : RobinStyle.text, size: 11))
                    }
                    .foregroundStyle(selection == tab ? RobinStyle.navy : RobinStyle.muted)
                    .frame(maxWidth: .infinity).frame(height: 58)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(selection == tab ? .isSelected : [])
            }
        }
        .padding(.horizontal, 9).padding(.top, 6)
        .background(RobinStyle.paper)
        .overlay(alignment: .top) { Rectangle().fill(RobinStyle.border).frame(height: 1) }
    }

    private func selectedSymbol(_ tab: RobinTab) -> String {
        switch tab {
        case .home: "house.fill"
        case .inbox: "bell.fill"
        case .account: "person.crop.circle.fill"
        }
    }
}
