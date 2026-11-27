import SwiftUI

struct RobinInboxView: View {
    let snapshot: RobinSnapshot
    let isLoading: Bool
    let onRefresh: () async -> Void
    let onOpenNotice: (RobinNotice) -> Void
    @State private var pendingOnly = true

    private var pendingCount: Int { snapshot.notices.filter(\.isPending).count }
    private var visibleNotices: [RobinNotice] {
        pendingOnly ? snapshot.notices.filter(\.isPending) : snapshot.notices
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 21) {
                RobinBrandHeader()
                RobinPageHeading(
                    title: "Avisos",
                    subtitle: "Mensajes importantes de los productos que usas."
                )

                HStack(alignment: .center, spacing: 13) {
                    Text("\(pendingCount)")
                        .font(.custom(RobinStyle.display, size: 43)).foregroundStyle(RobinStyle.navy)
                        .frame(minWidth: 46, alignment: .leading)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(pendingCount == 0 ? "Estás al día" : "por leer")
                            .font(.custom(RobinStyle.subtitle, size: 20)).foregroundStyle(RobinStyle.navy)
                        Text(pendingCount == 0 ? "No tienes avisos nuevos." : "Avisos importantes de Robin")
                            .font(.custom(RobinStyle.text, size: 14)).foregroundStyle(RobinStyle.muted)
                    }
                    Spacer(minLength: 0)
                    Image(systemName: pendingCount == 0 ? "checkmark.seal" : "bell.badge")
                        .font(.system(size: 20, weight: .regular)).foregroundStyle(RobinStyle.navy)
                }
                .padding(.horizontal, 15).padding(.vertical, 12)
                .background(RobinStyle.gold.opacity(0.28))

                HStack(spacing: 6) {
                    filterButton("Pendientes", selected: pendingOnly) { pendingOnly = true }
                    filterButton("Todos", selected: !pendingOnly) { pendingOnly = false }
                    Spacer()
                    Text("\(visibleNotices.count) avisos")
                        .font(.custom(RobinStyle.text, size: 13)).foregroundStyle(RobinStyle.muted)
                }

                if !snapshot.noticeErrors.isEmpty {
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: "wifi.exclamationmark").foregroundStyle(RobinStyle.navy)
                        Text("No se pudieron actualizar los avisos de todos tus productos.")
                            .font(.custom(RobinStyle.text, size: 14)).foregroundStyle(RobinStyle.muted)
                    }
                    .padding(13).frame(maxWidth: .infinity, alignment: .leading)
                    .background(RobinStyle.soft, in: RoundedRectangle(cornerRadius: 15, style: .continuous))
                }

                if visibleNotices.isEmpty && isLoading {
                    HStack(spacing: 10) {
                        ProgressView().tint(RobinStyle.navy)
                        Text("Buscando avisos")
                            .font(.custom(RobinStyle.text, size: 14)).foregroundStyle(RobinStyle.muted)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 20)
                } else if visibleNotices.isEmpty {
                    emptyState
                } else {
                    ForEach(RobinProduct.allCases.filter { product in visibleNotices.contains { $0.product == product } }) { product in
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(spacing: 8) {
                                RobinProductLogo(product: product, size: 34)
                                Text(product.title)
                                    .font(.custom(RobinStyle.subtitle, size: 17))
                                    .foregroundStyle(RobinStyle.muted)
                                Spacer()
                                Text("\(visibleNotices.filter { $0.product == product }.count)")
                                    .font(.custom(RobinStyle.text, size: 13)).foregroundStyle(RobinStyle.muted)
                            }
                            ForEach(visibleNotices.filter { $0.product == product }) { notice in
                                noticeCard(notice)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 20).padding(.top, 12).padding(.bottom, 15)
        }
        .background(RobinStyle.canvas.ignoresSafeArea())
        .refreshable { await onRefresh() }
    }

    private func filterButton(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title).font(.custom(RobinStyle.textSemibold, size: 13))
                .foregroundStyle(selected ? RobinStyle.navy : RobinStyle.muted)
                .padding(.horizontal, 13).frame(minHeight: 44)
                .background(selected ? RobinStyle.gold.opacity(0.31) : RobinStyle.paper,
                            in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(selected ? RobinStyle.gold.opacity(0.65) : RobinStyle.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private func noticeCard(_ notice: RobinNotice) -> some View {
        Button { onOpenNotice(notice) } label: {
            HStack(alignment: .top, spacing: 11) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(alignment: .top, spacing: 8) {
                        Text(notice.title)
                            .font(.custom(notice.isPending ? RobinStyle.textSemibold : RobinStyle.text, size: 15))
                            .foregroundStyle(RobinStyle.navy).multilineTextAlignment(.leading)
                        Spacer(minLength: 0)
                    }
                    HStack(spacing: 10) {
                        Text(notice.createdAt, format: .dateTime.day().month(.abbreviated).year())
                        Text(notice.isPending ? "Pendiente" : "Vista")
                            .foregroundStyle(notice.isPending ? RobinStyle.navy : RobinStyle.muted)
                        if notice.type == "terms" {
                            Text("Términos")
                                .font(.custom(RobinStyle.textSemibold, size: 12))
                                .foregroundStyle(RobinStyle.navy)
                                .padding(.horizontal, 7).padding(.vertical, 4)
                                .background(RobinStyle.soft, in: RoundedRectangle(cornerRadius: 5, style: .continuous))
                        }
                    }
                    .font(.custom(RobinStyle.text, size: 13)).foregroundStyle(RobinStyle.muted)
                }
            }
            .padding(.vertical, 12).frame(maxWidth: .infinity, minHeight: 78, alignment: .leading)
            .contentShape(Rectangle())
            .overlay(alignment: .bottom) { Rectangle().fill(RobinStyle.border).frame(height: 1) }
        }
        .buttonStyle(.plain)
        .accessibilityHint("Abre el aviso en su producto")
    }

    private var emptyState: some View {
        VStack(spacing: 11) {
            Image("RobinMascot").resizable().scaledToFit().frame(width: 138, height: 112)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous)).accessibilityHidden(true)
            Text(pendingOnly ? "No tienes avisos pendientes" : "Todavía no hay avisos")
                .font(.custom(RobinStyle.subtitle, size: 20)).foregroundStyle(RobinStyle.navy)
            Text(pendingOnly ? "Cuando llegue algo nuevo, aparecerá aquí." : "Los avisos de tus productos aparecerán en esta bandeja.")
                .font(.custom(RobinStyle.text, size: 14)).foregroundStyle(RobinStyle.muted).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 30).padding(.horizontal, 20)
        .background(RobinStyle.paper)
    }
}
