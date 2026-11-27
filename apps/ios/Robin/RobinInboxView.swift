import SwiftUI

struct RobinInboxView: View {
    let snapshot: RobinSnapshot
    let isLoading: Bool
    let onRefresh: () async -> Void
    let onOpenNotice: (RobinNotice) -> Void
    @State private var pendingOnly = true
    @State private var selectedProduct: RobinProduct?
    @State private var searchText = ""

    private var pendingCount: Int { snapshot.notices.filter(\.isPending).count }
    private var visibleNotices: [RobinNotice] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
        return snapshot.notices.filter { notice in
            let matchesStatus = !pendingOnly || notice.isPending
            let matchesProduct = selectedProduct == nil || notice.product == selectedProduct
            let searchableText = "\(notice.title) \(notice.product.title)"
                .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
            return matchesStatus && matchesProduct && (query.isEmpty || searchableText.contains(query))
        }
    }
    private var hasActiveFilters: Bool { !searchText.isEmpty || selectedProduct != nil }

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
                .background(pendingCount > 0 ? RobinStyle.gold.opacity(0.22) : RobinStyle.paper)

                searchField

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        productFilterButton(nil, title: "Todos los productos")
                        ForEach(snapshot.products) { product in
                            productFilterButton(product, title: product.title)
                        }
                    }
                }
                .contentMargins(.trailing, 2)

                HStack(spacing: 6) {
                    filterButton("Pendientes", selected: pendingOnly) { pendingOnly = true }
                    filterButton("Todos", selected: !pendingOnly) { pendingOnly = false }
                    Spacer()
                    Text("\(visibleNotices.count) \(visibleNotices.count == 1 ? "aviso" : "avisos")")
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

                if visibleNotices.isEmpty && isLoading && snapshot.notices.isEmpty {
                    HStack(spacing: 10) {
                        ProgressView().tint(RobinStyle.navy)
                        Text("Buscando avisos")
                            .font(.custom(RobinStyle.text, size: 14)).foregroundStyle(RobinStyle.muted)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 20)
                } else if visibleNotices.isEmpty && snapshot.notices.isEmpty && !snapshot.noticeErrors.isEmpty {
                    retryState
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

    private var searchField: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 16, weight: .medium)).foregroundStyle(RobinStyle.muted)
            TextField("Buscar avisos o productos", text: $searchText)
                .font(.custom(RobinStyle.text, size: 15))
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .submitLabel(.search)
                .accessibilityLabel("Buscar avisos o productos")
            if !searchText.isEmpty {
                Button {
                    searchText = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(RobinStyle.muted)
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Borrar búsqueda")
            }
        }
        .padding(.leading, 14)
        .background(RobinStyle.paper, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(RobinStyle.border, lineWidth: 1))
        .frame(minHeight: 46)
    }

    private func productFilterButton(_ product: RobinProduct?, title: String) -> some View {
        let selected = selectedProduct == product
        return Button {
            selectedProduct = product
        } label: {
            HStack(spacing: 7) {
                if let product {
                    RobinProductLogo(product: product, size: 23)
                }
                Text(title).font(.custom(RobinStyle.textSemibold, size: 13))
                    .lineLimit(1)
            }
            .foregroundStyle(selected ? RobinStyle.navy : RobinStyle.muted)
            .padding(.horizontal, 12).frame(minHeight: 44)
            .background(selected ? RobinStyle.gold.opacity(0.31) : RobinStyle.paper,
                        in: RoundedRectangle(cornerRadius: 9, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 9).stroke(selected ? RobinStyle.gold.opacity(0.65) : RobinStyle.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title)
        .accessibilityAddTraits(selected ? .isSelected : [])
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
            Image("RobinMascot").resizable().scaledToFit().frame(width: 118, height: 96)
                .accessibilityHidden(true)
            Text(hasActiveFilters ? "No hay avisos con estos filtros" : pendingOnly ? "No tienes avisos pendientes" : "Todavía no hay avisos")
                .font(.custom(RobinStyle.subtitle, size: 20)).foregroundStyle(RobinStyle.navy)
            Text(hasActiveFilters ? "Prueba otro producto o cambia la búsqueda." : pendingOnly ? "Cuando llegue algo nuevo, aparecerá aquí." : "Los avisos de tus productos aparecerán en esta bandeja.")
                .font(.custom(RobinStyle.text, size: 14)).foregroundStyle(RobinStyle.muted).multilineTextAlignment(.center)
            if hasActiveFilters {
                Button("Quitar filtros") {
                    pendingOnly = false
                    selectedProduct = nil
                    searchText = ""
                }
                .font(.custom(RobinStyle.textSemibold, size: 14)).tint(RobinStyle.navy)
                .frame(minHeight: 44)
            }
        }
        .frame(maxWidth: .infinity).padding(.vertical, 26).padding(.horizontal, 20)
    }

    private var retryState: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("No se han podido cargar los avisos")
                .font(.custom(RobinStyle.subtitle, size: 19)).foregroundStyle(RobinStyle.navy)
            Text("Comprueba tu conexión e inténtalo de nuevo.")
                .font(.custom(RobinStyle.text, size: 14)).foregroundStyle(RobinStyle.muted)
            Button("Volver a intentar") { Task { await onRefresh() } }
                .font(.custom(RobinStyle.textSemibold, size: 14)).tint(RobinStyle.navy)
                .frame(minHeight: 44)
        }
        .padding(16).frame(maxWidth: .infinity, alignment: .leading)
        .background(RobinStyle.paper, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
