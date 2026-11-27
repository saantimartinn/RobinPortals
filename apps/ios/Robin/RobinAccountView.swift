import SwiftUI
import UIKit
import UserNotifications

struct RobinAccountView: View {
    @Environment(\.scenePhase) private var scenePhase
    let profile: RobinProfile?
    let activeProduct: RobinProduct?
    let onReportProblem: () -> Void
    let onRefresh: () -> Void
    let onLogout: () -> Void
    @State private var permissionText = "Comprobando…"
    @State private var permissionEnabled = false
    private var displayName: String {
        guard let name = profile?.name, !name.isEmpty else { return "Cuenta Robin" }
        return name
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 23) {
                RobinBrandHeader()
                RobinPageHeading(
                    eyebrow: "Robin contigo",
                    title: "Tu cuenta",
                    subtitle: "Gestiona tu sesión y encuentra ayuda cuando la necesites."
                )

                profileCard

                VStack(alignment: .leading, spacing: 11) {
                    RobinSectionHeading(title: "Preferencias")
                    settingCard(
                        symbol: permissionEnabled ? "bell.badge.fill" : "bell.slash",
                        title: "Notificaciones",
                        detail: permissionText,
                        accent: permissionEnabled ? RobinStyle.gold : RobinStyle.soft,
                        action: openNotificationSettings,
                        accessory: permissionEnabled ? "checkmark" : "arrow.up.right"
                    )
                    settingCard(
                        symbol: "arrow.clockwise",
                        title: "Actualizar sesión",
                        detail: "Comprobar de nuevo tus accesos",
                        accent: RobinStyle.soft,
                        action: onRefresh,
                        accessory: "arrow.right"
                    )
                }

                VStack(alignment: .leading, spacing: 11) {
                    RobinSectionHeading(title: "Ayuda y privacidad")
                    settingCard(
                        symbol: "bubble.left.and.bubble.right",
                        title: "Reportar un problema",
                        detail: "Escribe al equipo de Robin",
                        accent: RobinStyle.gold.opacity(0.25),
                        action: onReportProblem,
                        accessory: "arrow.right"
                    )
                    Link(destination: URL(string: "https://project-robin.com/admin/politica-de-privacidad.html")!) {
                        settingRow(
                            symbol: "hand.raised",
                            title: "Política de privacidad",
                            detail: "Cómo cuidamos tus datos",
                            accent: RobinStyle.soft,
                            accessory: "arrow.up.right"
                        )
                    }
                    .buttonStyle(.plain)
                }

                Button(role: .destructive, action: onLogout) {
                    HStack(spacing: 10) {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                        Text("Cerrar sesión").font(.custom(RobinStyle.textSemibold, size: 14))
                        Spacer()
                        Image(systemName: "chevron.right").font(.system(size: 11, weight: .bold))
                    }
                    .foregroundStyle(Color(red: 0.68, green: 0.22, blue: 0.25))
                    .padding(.horizontal, 16).padding(.vertical, 16)
                    .background(RobinStyle.paper)
                    .overlay(alignment: .bottom) { Rectangle().fill(RobinStyle.border).frame(height: 1) }
                }
                .buttonStyle(.plain)
                .padding(.top, 2).padding(.bottom, 15)
            }
            .padding(.horizontal, 20).padding(.top, 12)
        }
        .background(RobinStyle.canvas.ignoresSafeArea())
        .onAppear { Task { await refreshPermission() } }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await refreshPermission() } }
        }
    }

    private var profileCard: some View {
        HStack(spacing: 14) {
            Text(RobinStyle.initials(for: profile?.name))
                .font(.custom(RobinStyle.display, size: 22)).foregroundStyle(RobinStyle.navy)
                .frame(width: 58, height: 58).background(RobinStyle.gold.opacity(0.38))
            VStack(alignment: .leading, spacing: 4) {
                Text(displayName)
                    .font(.custom(RobinStyle.subtitle, size: 21)).foregroundStyle(RobinStyle.navy)
                    .lineLimit(1)
                if let email = profile?.email {
                    Text(email).font(.custom(RobinStyle.text, size: 12)).foregroundStyle(RobinStyle.muted).lineLimit(1)
                }
                Label(activeProduct?.title ?? "Acceso activo", systemImage: "checkmark.seal.fill")
                    .font(.custom(RobinStyle.textSemibold, size: 10)).foregroundStyle(RobinStyle.navy)
                    .padding(.top, 3)
            }
            Spacer(minLength: 0)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RobinStyle.paper)
        .overlay(alignment: .leading) { Rectangle().fill(RobinStyle.gold).frame(width: 4) }
    }

    private func settingCard(symbol: String, title: String, detail: String, accent: Color,
                              action: @escaping () -> Void, accessory: String) -> some View {
        Button(action: action) {
            settingRow(symbol: symbol, title: title, detail: detail, accent: accent, accessory: accessory)
        }
        .buttonStyle(.plain)
    }

    private func settingRow(symbol: String, title: String, detail: String, accent: Color, accessory: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: symbol).font(.system(size: 16, weight: .semibold)).foregroundStyle(RobinStyle.navy)
                .frame(width: 38, height: 38).background(accent)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.custom(RobinStyle.textSemibold, size: 14)).foregroundStyle(RobinStyle.navy)
                Text(detail).font(.custom(RobinStyle.text, size: 11)).foregroundStyle(RobinStyle.muted).lineLimit(2)
            }
            Spacer(minLength: 2)
            Image(systemName: accessory).font(.system(size: 11, weight: .semibold)).foregroundStyle(RobinStyle.muted)
        }
        .padding(.vertical, 9)
        .contentShape(Rectangle())
        .overlay(alignment: .bottom) { Rectangle().fill(RobinStyle.border).frame(height: 1) }
    }

    private func openNotificationSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
    }

    private func refreshPermission() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            permissionEnabled = true
            permissionText = "Activadas en este iPhone"
        case .denied:
            permissionEnabled = false
            permissionText = "Desactivadas · toca para abrir Ajustes"
        case .notDetermined:
            permissionEnabled = false
            permissionText = "Aún no se han solicitado"
        @unknown default:
            permissionEnabled = false
            permissionText = "No disponible"
        }
    }
}
