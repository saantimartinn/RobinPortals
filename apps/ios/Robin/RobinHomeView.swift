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
                RobinBrandHeader()

                VStack(alignment: .leading, spacing: 7) {
                    Text(greetingName.isEmpty ? "Hola" : "Hola, \(greetingName)")
                        .font(.custom(RobinStyle.display, size: 34))
                        .foregroundStyle(RobinStyle.navy)
                    Text("Tus productos y avisos, en un mismo lugar.")
                        .font(.custom(RobinStyle.subtitle, size: 17)).foregroundStyle(RobinStyle.muted)
                }
                .padding(.top, 6)

                if let lastProduct, snapshot.products.contains(lastProduct) {
                    Button { onOpenProduct(lastProduct) } label: {
                        HStack(spacing: 0) {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Continuar en")
                                    .font(.custom(RobinStyle.text, size: 14))
                                    .foregroundStyle(RobinStyle.canvas.opacity(0.82))
                                Text(lastProduct.title)
                                    .font(.custom(RobinStyle.subtitle, size: 23))
                                    .multilineTextAlignment(.leading).foregroundStyle(RobinStyle.canvas)
                                Text("Abrir")
                                    .font(.custom(RobinStyle.textSemibold, size: 14))
                                    .foregroundStyle(RobinStyle.navy)
                                    .padding(.horizontal, 13).padding(.vertical, 8)
                                    .background(RobinStyle.gold, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
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
                    if isLoading {
                        HStack(spacing: 10) {
                            ProgressView().tint(RobinStyle.navy)
                            Text("Buscando tus accesos")
                                .font(.custom(RobinStyle.text, size: 14)).foregroundStyle(RobinStyle.muted)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 14)
                    }
                }

                HStack(spacing: 12) {
                    Image(systemName: pendingCount > 0 ? "bell.badge.fill" : "bell")
                        .font(.system(size: 21, weight: .regular)).foregroundStyle(RobinStyle.navy)
                        .frame(width: 28, height: 28)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(pendingCount == 0 ? "Todo al día" : "Tienes \(pendingCount) avisos")
                            .font(.custom(RobinStyle.textSemibold, size: 15)).foregroundStyle(RobinStyle.navy)
                        Text(pendingCount == 0 ? "Aquí aparecerán las novedades importantes." : "Revisa lo que tu equipo quiere contarte.")
                            .font(.custom(RobinStyle.text, size: 14)).foregroundStyle(RobinStyle.muted)
                    }
                    Spacer(minLength: 2)
                    Button(action: onOpenInbox) {
                        Image(systemName: "chevron.right").font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(RobinStyle.navy).frame(width: 44, height: 44)
                    }
                    .accessibilityLabel("Ver avisos")
                }
                .padding(.vertical, 10)
                .background(pendingCount > 0 ? RobinStyle.gold.opacity(0.14) : RobinStyle.paper)
                .overlay(alignment: .bottom) { Rectangle().fill(RobinStyle.border).frame(height: 1) }

                Button(action: onReportProblem) {
                    HStack(spacing: 9) {
                        Image(systemName: "questionmark.circle")
                        Text("¿Necesitas ayuda?").font(.custom(RobinStyle.textSemibold, size: 15))
                        Spacer()
                        Text("Contactar").font(.custom(RobinStyle.textSemibold, size: 14))
                    }
                    .font(.custom(RobinStyle.text, size: 15)).foregroundStyle(RobinStyle.navy)
                    .padding(.horizontal, 14).padding(.vertical, 16)
                    .background(RobinStyle.soft.opacity(0.65), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
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
                        .font(.custom(RobinStyle.text, size: 14)).foregroundStyle(RobinStyle.muted)
                }
                Spacer(minLength: 3)
            }
            .padding(.vertical, 9)
            .contentShape(Rectangle())
            .overlay(alignment: .bottom) { Rectangle().fill(RobinStyle.border).frame(height: 1) }
        }
        .buttonStyle(.plain)
    }

    private var emptyProducts: some View {
        VStack(spacing: 9) {
            Image("RobinMascot").resizable().scaledToFit().frame(width: 116, height: 96).accessibilityHidden(true)
            Text("No hay productos disponibles").font(.custom(RobinStyle.subtitle, size: 19)).foregroundStyle(RobinStyle.navy)
            Text("Actualiza la sesión para comprobar tus accesos.").font(.custom(RobinStyle.text, size: 14)).foregroundStyle(RobinStyle.muted)
            Button("Actualizar") { onRefresh() }
                .font(.custom(RobinStyle.textSemibold, size: 14)).tint(RobinStyle.navy)
                .frame(minHeight: 44)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 22)
    }

    private func subtitle(for product: RobinProduct) -> String {
        switch product {
        case .portal: "Tu proceso de admisión"
        case .robinjr: "Orientación para tu futuro"
        case .community: "Tu comunidad en el extranjero"
        }
    }
}

struct RobinAdminHomeView: View {
    let profile: RobinProfile?
    let bookings: [RobinAdminBooking]
    let isLoading: Bool
    let onOpen: (RobinAdminDestination) -> Void
    let onOpenCalendar: () -> Void
    let onRefresh: () -> Void

    private var firstName: String {
        profile?.name.split(separator: " ").first.map(String.init) ?? "equipo"
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 23) {
                RobinBrandHeader()
                VStack(alignment: .leading, spacing: 7) {
                    Text("Hola, \(firstName)")
                        .font(.custom(RobinStyle.display, size: 34)).foregroundStyle(RobinStyle.navy)
                    Text("Tu equipo y los productos Robin, en un mismo lugar.")
                        .font(.custom(RobinStyle.subtitle, size: 17)).foregroundStyle(RobinStyle.muted)
                }
                .padding(.top, 6)

                VStack(alignment: .leading, spacing: 8) {
                    RobinSectionHeading(title: "Áreas de trabajo")
                    ForEach(RobinAdminDestination.allCases) { destination in
                        Button { onOpen(destination) } label: {
                            HStack(spacing: 14) {
                                if let product = destination.robinProduct {
                                    RobinProductLogo(product: product, size: 36)
                                        .frame(width: 44, height: 44)
                                } else {
                                    Image(systemName: destination.symbol)
                                        .font(.system(size: 20, weight: .regular))
                                        .foregroundStyle(RobinStyle.navy)
                                        .frame(width: 44, height: 44)
                                        .background(RobinStyle.soft, in: RoundedRectangle(cornerRadius: 11))
                                }
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(destination.title)
                                        .font(.custom(RobinStyle.textSemibold, size: 15))
                                        .foregroundStyle(RobinStyle.navy)
                                    Text(destination.subtitle)
                                        .font(.custom(RobinStyle.text, size: 13))
                                        .foregroundStyle(RobinStyle.muted)
                                }
                                Spacer(minLength: 2)
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(RobinStyle.muted)
                            }
                            .padding(.vertical, 9)
                            .contentShape(Rectangle())
                            .overlay(alignment: .bottom) { Rectangle().fill(RobinStyle.border).frame(height: 1) }
                        }
                        .buttonStyle(.plain)
                    }
                }

                Button(action: onOpenCalendar) {
                    HStack(spacing: 12) {
                        Image(systemName: "calendar")
                            .font(.system(size: 21)).frame(width: 28)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(isLoading ? "Cargando calendario…" : bookings.isEmpty ? "Calendario al día" : "\(bookings.count) llamadas próximas")
                                .font(.custom(RobinStyle.textSemibold, size: 15))
                            Text("Ver las reservas del equipo")
                                .font(.custom(RobinStyle.text, size: 13))
                                .foregroundStyle(RobinStyle.muted)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundStyle(RobinStyle.navy)
                    .padding(15)
                    .background(RobinStyle.soft, in: RoundedRectangle(cornerRadius: 11))
                }
                .buttonStyle(.plain)
                .padding(.bottom, 12)
            }
            .padding(.horizontal, 20).padding(.top, 12)
        }
        .background(RobinStyle.canvas.ignoresSafeArea())
        .refreshable { onRefresh() }
    }
}

struct RobinAdminCalendarView: View {
    let bookings: [RobinAdminBooking]
    let isLoading: Bool
    let hasError: Bool
    let onRefresh: () -> Void
    @State private var selectedDay = Date()

    private var selectedBookings: [RobinAdminBooking] {
        bookings.filter { Calendar.current.isDate($0.startAt, inSameDayAs: selectedDay) }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                RobinBrandHeader()
                RobinPageHeading(title: "Calendario", subtitle: "Llamadas programadas con tus alumnos.")
                DatePicker("Selecciona un día", selection: $selectedDay, displayedComponents: .date)
                    .datePickerStyle(.graphical)
                    .tint(RobinStyle.navy)
                    .padding(12)
                    .background(RobinStyle.paper, in: RoundedRectangle(cornerRadius: 16))

                VStack(alignment: .leading, spacing: 10) {
                    RobinSectionHeading(title: selectedDay.formatted(.dateTime.weekday(.wide).day().month(.wide)))
                    if isLoading && bookings.isEmpty {
                        ProgressView("Cargando llamadas…").tint(RobinStyle.navy)
                    } else if hasError {
                        Text("No se ha podido actualizar el calendario. Desliza hacia abajo para reintentar.")
                            .font(.custom(RobinStyle.text, size: 14)).foregroundStyle(RobinStyle.muted)
                    } else if selectedBookings.isEmpty {
                        Text("No hay llamadas programadas para este día.")
                            .font(.custom(RobinStyle.text, size: 14)).foregroundStyle(RobinStyle.muted)
                            .padding(.vertical, 15)
                    }
                    ForEach(selectedBookings) { booking in
                        HStack(alignment: .top, spacing: 14) {
                            Text(booking.startAt.formatted(.dateTime.hour().minute()))
                                .font(.custom(RobinStyle.textSemibold, size: 14))
                                .foregroundStyle(RobinStyle.navy)
                                .frame(width: 54, alignment: .leading)
                            VStack(alignment: .leading, spacing: 5) {
                                Text(booking.student)
                                    .font(.custom(RobinStyle.textSemibold, size: 15))
                                    .foregroundStyle(RobinStyle.navy)
                                Text("\(booking.topic) · \(booking.durationMinutes) min")
                                    .font(.custom(RobinStyle.text, size: 13))
                                    .foregroundStyle(RobinStyle.muted)
                                if booking.cancellationRequested {
                                    Text("Solicitud de cancelación")
                                        .font(.custom(RobinStyle.textSemibold, size: 12))
                                        .foregroundStyle(RobinStyle.danger)
                                }
                                if let url = booking.joinURL {
                                    Link("Unirse a la llamada", destination: url)
                                        .font(.custom(RobinStyle.textSemibold, size: 13))
                                        .foregroundStyle(RobinStyle.navy)
                                }
                            }
                        }
                        .padding(15)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(RobinStyle.paper, in: RoundedRectangle(cornerRadius: 12))
                    }
                }
                .padding(.bottom, 15)
            }
            .padding(.horizontal, 20).padding(.top, 12)
        }
        .background(RobinStyle.canvas.ignoresSafeArea())
        .refreshable { onRefresh() }
    }
}
