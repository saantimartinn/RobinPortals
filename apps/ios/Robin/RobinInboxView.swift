import SwiftUI

struct RobinInboxView: View {
    let snapshot: RobinSnapshot
    let onRefresh: () async -> Void
    let onOpenNotice: (RobinNotice) -> Void
    @State private var pendingOnly = true

    private var pendingCount: Int { snapshot.notices.filter(\.isPending).count }
    private var visibleNotices: [RobinNotice] {
        pendingOnly ? snapshot.notices.filter(\.isPending) : snapshot.notices
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 23) {
                RobinBrandHeader()
                RobinPageHeading(
                    eyebrow: "Tu bandeja",
                    title: "Avisos",
                    subtitle: "Mensajes importantes de los productos que usas."
                )

                HStack(spacing: 12) {
                    Image(systemName: pendingCount > 0 ? "bell.badge.fill" : "checkmark.circle.fill")
                        .font(.system(size: 20, weight: .semibold)).foregroundStyle(RobinStyle.gold)
                        .frame(width: 46, height: 46).background(.white.opacity(0.11), in: Circle())
                    VStack(alignment: .leading, spacing: 4) {
                        Text(pendingCount == 0 ? "Estás al día" : "\(pendingCount) pendientes")
                            .font(.system(size: 17, weight: .semibold, design: .serif)).foregroundStyle(.white)
                        Text(pendingCount == 0 ? "No tienes avisos nuevos." : "Entra para leer el mensaje completo.")
                            .font(.system(size: 12)).foregroundStyle(.white.opacity(0.75))
                    }
                    Spacer(minLength: 0)
                }
                .padding(16)
                .background(RobinStyle.navy, in: RoundedRectangle(cornerRadius: 22, style: .continuous))

                HStack(spacing: 6) {
                    filterButton("Pendientes", selected: pendingOnly) { pendingOnly = true }
                    filterButton("Todos", selected: !pendingOnly) { pendingOnly = false }
                    Spacer()
                    Text("\(visibleNotices.count)")
                        .font(.system(size: 11, weight: .semibold)).foregroundStyle(RobinStyle.navy)
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .background(RobinStyle.gold.opacity(0.25), in: Capsule())
                }

                if !snapshot.noticeErrors.isEmpty {
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: "wifi.exclamationmark").foregroundStyle(RobinStyle.navy)
                        Text("No se pudieron actualizar los avisos de todos tus productos.")
                            .font(.system(size: 12)).foregroundStyle(RobinStyle.muted)
                    }
                    .padding(13).frame(maxWidth: .infinity, alignment: .leading)
                    .background(RobinStyle.soft, in: RoundedRectangle(cornerRadius: 15, style: .continuous))
                }

                if visibleNotices.isEmpty {
                    emptyState
                } else {
                    ForEach(RobinProduct.allCases.filter { product in visibleNotices.contains { $0.product == product } }) { product in
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(spacing: 8) {
                                RobinProductLogo(product: product, size: 34)
                                Text(product.title.uppercased())
                                    .font(.system(size: 10, weight: .bold, design: .rounded)).tracking(0.85)
                                    .foregroundStyle(RobinStyle.muted)
                                Spacer()
                                Text("\(visibleNotices.filter { $0.product == product }.count)")
                                    .font(.system(size: 11, weight: .semibold)).foregroundStyle(RobinStyle.muted)
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
            Text(title).font(.system(size: 12, weight: .semibold))
                .foregroundStyle(selected ? RobinStyle.navy : RobinStyle.muted)
                .padding(.horizontal, 13).padding(.vertical, 9)
                .background(selected ? RobinStyle.gold.opacity(0.31) : RobinStyle.paper,
                            in: Capsule())
                .overlay(Capsule().stroke(selected ? RobinStyle.gold.opacity(0.65) : RobinStyle.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private func noticeCard(_ notice: RobinNotice) -> some View {
        Button { onOpenNotice(notice) } label: {
            HStack(alignment: .top, spacing: 11) {
                RoundedRectangle(cornerRadius: 2).fill(notice.isPending ? RobinStyle.gold : RobinStyle.border)
                    .frame(width: 3).frame(maxHeight: .infinity)
                VStack(alignment: .leading, spacing: 8) {
                    HStack(alignment: .top, spacing: 8) {
                        Text(notice.title)
                            .font(.system(size: 14, weight: notice.isPending ? .semibold : .medium))
                            .foregroundStyle(RobinStyle.navy).multilineTextAlignment(.leading)
                        Spacer(minLength: 0)
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 10, weight: .semibold)).foregroundStyle(RobinStyle.muted)
                    }
                    HStack(spacing: 7) {
                        Text(notice.createdAt, format: .dateTime.day().month(.abbreviated).year())
                        Circle().fill(RobinStyle.border).frame(width: 3, height: 3)
                        Text(notice.isPending ? "Pendiente" : "Vista")
                            .foregroundStyle(notice.isPending ? RobinStyle.navy : RobinStyle.muted)
                        if notice.type == "terms" {
                            Text("TÉRMINOS")
                                .font(.system(size: 9, weight: .bold)).tracking(0.5)
                                .foregroundStyle(RobinStyle.navy)
                                .padding(.horizontal, 7).padding(.vertical, 4)
                                .background(RobinStyle.gold.opacity(0.25), in: Capsule())
                        }
                    }
                    .font(.system(size: 10, weight: .medium)).foregroundStyle(RobinStyle.muted)
                }
            }
            .padding(13).frame(maxWidth: .infinity, minHeight: 78, alignment: .leading)
            .background(RobinStyle.paper, in: RoundedRectangle(cornerRadius: 17, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 17, style: .continuous).stroke(RobinStyle.border, lineWidth: 1))
            .contentShape(RoundedRectangle(cornerRadius: 17, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityHint("Abre el aviso en su producto")
    }

    private var emptyState: some View {
        VStack(spacing: 11) {
            Image(systemName: pendingOnly ? "checkmark.seal" : "bell.slash")
                .font(.system(size: 28, weight: .light)).foregroundStyle(RobinStyle.navy)
            Text(pendingOnly ? "No tienes avisos pendientes" : "Todavía no hay avisos")
                .font(.system(size: 17, weight: .semibold, design: .serif)).foregroundStyle(RobinStyle.navy)
            Text(pendingOnly ? "Cuando llegue algo nuevo, aparecerá aquí." : "Los avisos de tus productos aparecerán en esta bandeja.")
                .font(.system(size: 12)).foregroundStyle(RobinStyle.muted).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 30).padding(.horizontal, 20)
        .background(RobinStyle.paper, in: RoundedRectangle(cornerRadius: 21, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 21, style: .continuous).stroke(RobinStyle.border, lineWidth: 1))
    }
}
