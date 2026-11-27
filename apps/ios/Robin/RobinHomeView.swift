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
            VStack(alignment: .leading, spacing: 25) {
                RobinBrandHeader(personName: snapshot.profile?.name, trailingSymbol: "bell", trailingAction: onOpenInbox)

                VStack(alignment: .leading, spacing: 7) {
                    Text(greetingName.isEmpty ? "Hola" : "Hola, \(greetingName)")
                        .font(.system(size: 32, weight: .semibold, design: .serif))
                        .tracking(-0.7).foregroundStyle(RobinStyle.navy)
                    Text("Tu espacio Robin, listo para continuar.")
                        .font(.system(size: 15)).foregroundStyle(RobinStyle.muted)
                }
                .padding(.top, 3)

                if let lastProduct, snapshot.products.contains(lastProduct) {
                    Button { onOpenProduct(lastProduct) } label: {
                        ZStack(alignment: .trailing) {
                            Circle().fill(.white.opacity(0.08)).frame(width: 164, height: 164).offset(x: 50, y: 28)
                            Circle().fill(.white.opacity(0.06)).frame(width: 118, height: 118).offset(x: 2, y: -42)
                            HStack(spacing: 8) {
                                VStack(alignment: .leading, spacing: 11) {
                                    Text("CONTINUAR")
                                        .font(.system(size: 10, weight: .bold, design: .rounded)).tracking(1.2)
                                        .foregroundStyle(RobinStyle.gold)
                                    Text(lastProduct.title)
                                        .font(.system(size: 21, weight: .semibold, design: .serif))
                                        .multilineTextAlignment(.leading).foregroundStyle(.white)
                                    Label("Entrar", systemImage: "arrow.right")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundStyle(RobinStyle.navy)
                                        .padding(.horizontal, 12).padding(.vertical, 8)
                                        .background(RobinStyle.gold, in: Capsule())
                                }
                                Spacer(minLength: 2)
                                RobinProductLogo(product: lastProduct, size: 70)
                                    .background(.white, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
                            }
                            .padding(20)
                        }
                        .frame(maxWidth: .infinity, minHeight: 166)
                        .background(RobinStyle.navy, in: RoundedRectangle(cornerRadius: 26, style: .continuous))
                        .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 26, style: .continuous).stroke(.white.opacity(0.2), lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                    .accessibilityHint("Abre \(lastProduct.title)")
                }

                VStack(alignment: .leading, spacing: 13) {
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
                            .font(.system(size: 14, weight: .semibold)).foregroundStyle(RobinStyle.navy)
                        Text(pendingCount == 0 ? "Aquí aparecerán las novedades importantes." : "Revisa lo que tu equipo quiere contarte.")
                            .font(.system(size: 12)).foregroundStyle(RobinStyle.muted)
                    }
                    Spacer(minLength: 2)
                    Button(action: onOpenInbox) {
                        Image(systemName: "arrow.right").font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(RobinStyle.navy).frame(width: 34, height: 34)
                            .background(RobinStyle.soft, in: Circle())
                    }
                    .accessibilityLabel("Ver avisos")
                }
                .padding(14)
                .background(RobinStyle.paper, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).stroke(RobinStyle.border, lineWidth: 1))

                Button(action: onReportProblem) {
                    HStack(spacing: 9) {
                        Image(systemName: "questionmark.circle")
                        Text("¿Necesitas ayuda?").fontWeight(.semibold)
                        Spacer()
                        Text("Contactar").font(.system(size: 12, weight: .semibold))
                        Image(systemName: "arrow.up.right").font(.system(size: 10, weight: .bold))
                    }
                    .font(.system(size: 13)).foregroundStyle(RobinStyle.navy)
                    .padding(.horizontal, 14).padding(.vertical, 16)
                    .background(RobinStyle.soft.opacity(0.65), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
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
                    Text(product.title).font(.system(size: 15, weight: .semibold)).foregroundStyle(RobinStyle.navy)
                    Text(product == lastProduct ? "Último producto abierto" : subtitle(for: product))
                        .font(.system(size: 12)).foregroundStyle(RobinStyle.muted)
                }
                Spacer(minLength: 3)
                Image(systemName: "chevron.right").font(.system(size: 12, weight: .bold)).foregroundStyle(RobinStyle.navy.opacity(0.65))
            }
            .padding(13)
            .background(RobinStyle.paper, in: RoundedRectangle(cornerRadius: 21, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 21, style: .continuous).stroke(RobinStyle.border, lineWidth: 1))
            .contentShape(RoundedRectangle(cornerRadius: 21, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private var emptyProducts: some View {
        VStack(spacing: 9) {
            Image(systemName: "rectangle.slash").font(.system(size: 25)).foregroundStyle(RobinStyle.navy)
            Text("No hay productos disponibles").font(.system(size: 15, weight: .semibold, design: .serif)).foregroundStyle(RobinStyle.navy)
            Text("Actualiza la sesión o contacta con soporte.").font(.system(size: 12)).foregroundStyle(RobinStyle.muted)
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
