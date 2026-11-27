import SwiftUI

struct RobinHomeView: View {
    let snapshot: RobinSnapshot
    let isLoading: Bool
    let lastProduct: RobinProduct?
    let onRefresh: () -> Void
    let onOpenProduct: (RobinProduct) -> Void
    let onOpenInbox: () -> Void
    let onReportProblem: () -> Void

    private var pendingCount: Int { snapshot.notices.filter(\.isPending).count }
    private var greetingName: String { snapshot.profile?.name.split(separator: " ").first.map(String.init) ?? "" }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 23) {
                RobinBrandHeader(personName: snapshot.profile?.name, trailingSymbol: "bell", trailingAction: onOpenInbox)

                VStack(alignment: .leading, spacing: 7) {
                    Text(greetingName.isEmpty ? "Hola" : "Hola, \(greetingName)")
                        .font(.custom(RobinStyle.display, size: 34))
                        .tracking(-0.35).foregroundStyle(RobinStyle.navy)
                    Text("Tu camino sigue aquí.")
                        .font(.custom(RobinStyle.subtitle, size: 17)).italic().foregroundStyle(RobinStyle.muted)
                }
                .padding(.top, 6)

                if let lastProduct, snapshot.products.contains(lastProduct) {
                    Button { onOpenProduct(lastProduct) } label: {
                        HStack(spacing: 0) {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("RETOMAR TU CAMINO")
                                    .font(.custom(RobinStyle.displayBold, size: 12)).tracking(0.8)
                                    .foregroundStyle(RobinStyle.gold)
                                Text(lastProduct.title)
                                    .font(.custom(RobinStyle.subtitle, size: 23))
                                    .multilineTextAlignment(.leading).foregroundStyle(RobinStyle.canvas)
                                Label("Entrar", systemImage: "arrow.right")
                                    .font(.custom(RobinStyle.textSemibold, size: 12))
                                    .foregroundStyle(RobinStyle.navy)
                                    .padding(.horizontal, 13).padding(.vertical, 8)
                                    .background(RobinStyle.gold)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.leading, 20).padding(.vertical, 18)
                            RobinProductLogo(product: lastProduct, size: 56)
                                .background(RobinStyle.paper)
                                .padding(.trailing, 16)
                        }
                        .frame(maxWidth: .infinity, minHeight: 142)
                        .background(RobinStyle.navy)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .accessibilityHint("Abre \(lastProduct.title)")
                }

                VStack(alignment: .leading, spacing: 8) {
                    RobinSectionHeading(title: "Tus productos", trailing: "\(snapshot.products.count) disponible\(snapshot.products.count == 1 ? "" : "s")")
                    ForEach(snapshot.products) { product in
                        productCard(product)
                    }
                    if snapshot.products.isEmpty && !isLoading {
                        emptyProducts
                    }
                    if isLoading { ProgressView().tint(RobinStyle.navy).frame(maxWidth: .infinity).padding(14) }
                }

                HStack(spacing: 12) {
                    Image(systemName: pendingCount > 0 ? "bell.badge.fill" : "bell")
                        .font(.system(size: 19, weight: .semibold)).foregroundStyle(RobinStyle.navy)
                        .frame(width: 44, height: 44).background(RobinStyle.gold.opacity(0.25), in: Circle())
                    VStack(alignment: .leading, spacing: 3) {
                        Text(pendingCount == 0 ? "Todo al día" : "Tienes \(pendingCount) avisos")
                            .font(.custom(RobinStyle.textSemibold, size: 14)).foregroundStyle(RobinStyle.navy)
                        Text(pendingCount == 0 ? "Aquí aparecerán las novedades importantes." : "Revisa lo que tu equipo quiere contarte.")
                            .font(.custom(RobinStyle.text, size: 12)).foregroundStyle(RobinStyle.muted)
                    }
                    Spacer(minLength: 2)
                    Button(action: onOpenInbox) {
                        Image(systemName: "arrow.right").font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(RobinStyle.navy).frame(width: 34, height: 34)
                            .background(RobinStyle.soft, in: Circle())
                    }
                    .accessibilityLabel("Ver avisos")
                }
                .padding(.vertical, 10)
                .overlay(alignment: .bottom) { Rectangle().fill(RobinStyle.border).frame(height: 1) }

                Button(action: onReportProblem) {
                    HStack(spacing: 9) {
                        Image(systemName: "questionmark.circle")
                        Text("¿Necesitas ayuda?").font(.custom(RobinStyle.textSemibold, size: 13))
                        Spacer()
                        Text("Contactar").font(.system(size: 12, weight: .semibold))
                        Image(systemName: "arrow.up.right").font(.system(size: 10, weight: .bold))
                    }
                    .font(.custom(RobinStyle.text, size: 13)).foregroundStyle(RobinStyle.navy)
                    .padding(.horizontal, 14).padding(.vertical, 16)
                    .background(RobinStyle.soft.opacity(0.65))
                }
                .buttonStyle(.plain)
                .padding(.bottom, 12)
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)
        }
        .background(RobinStyle.canvas.ignoresSafeArea())
        .refreshable { onRefresh() }
    }

    private func productCard(_ product: RobinProduct) -> some View {
        Button { onOpenProduct(product) } label: {
            HStack(spacing: 13) {
                RobinProductLogo(product: product, size: 58)
                VStack(alignment: .leading, spacing: 5) {
                    Text(product.title).font(.custom(RobinStyle.textSemibold, size: 15)).foregroundStyle(RobinStyle.navy)
                    Text(product == lastProduct ? "Último producto abierto" : subtitle(for: product))
                        .font(.custom(RobinStyle.text, size: 12)).foregroundStyle(RobinStyle.muted)
                }
                Spacer(minLength: 3)
                Image(systemName: "chevron.right").font(.system(size: 12, weight: .bold)).foregroundStyle(RobinStyle.navy.opacity(0.65))
            }
            .padding(.vertical, 9)
            .contentShape(Rectangle())
            .overlay(alignment: .bottom) { Rectangle().fill(RobinStyle.border).frame(height: 1) }
        }
        .buttonStyle(.plain)
    }

    private var emptyProducts: some View {
        VStack(spacing: 9) {
            Image(systemName: "rectangle.slash").font(.system(size: 25)).foregroundStyle(RobinStyle.navy)
            Image("RobinMascot").resizable().scaledToFit().frame(width: 116, height: 96).accessibilityHidden(true)
            Text("No hay productos disponibles").font(.custom(RobinStyle.subtitle, size: 19)).foregroundStyle(RobinStyle.navy)
            Text("Actualiza la sesión o contacta con soporte.").font(.custom(RobinStyle.text, size: 12)).foregroundStyle(RobinStyle.muted)
            Button("Actualizar") { onRefresh() }.font(.system(size: 13, weight: .semibold)).tint(RobinStyle.navy)
        }
        .frame(maxWidth: .infinity).padding(22)
        .background(RobinStyle.paper, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    private func subtitle(for product: RobinProduct) -> String {
        switch product {
        case .portal: "Tu proceso de admisión"
        case .robinjr: "Orientación para tu futuro"
        case .community: "Tu comunidad en el extranjero"
        }
    }
}
