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
                        action: openNotificationSettings,
                        accessory: permissionEnabled ? "checkmark" : "arrow.up.right"
                    )
                    settingCard(
                        symbol: "arrow.clockwise",
                        title: "Actualizar sesión",
                        detail: "Comprobar de nuevo tus accesos",
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
                        action: onReportProblem,
                        accessory: "arrow.right"
                    )
                    Link(destination: URL(string: "https://project-robin.com/admin/politica-de-privacidad.html")!) {
                        settingRow(
                            symbol: "hand.raised",
                            title: "Política de privacidad",
                            detail: "Cómo cuidamos tus datos",
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
                    .foregroundStyle(RobinStyle.danger)
                    .padding(.horizontal, 16).padding(.vertical, 16)
                    .background(RobinStyle.paper)
                    .overlay(alignment: .bottom) { Rectangle().fill(RobinStyle.border).frame(height: 1) }
                }
                .buttonStyle(.plain)
                .frame(minHeight: 52)
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
                .frame(width: 58, height: 58)
                .background(RobinStyle.soft, in: RoundedRectangle(cornerRadius: 15, style: .continuous))
            VStack(alignment: .leading, spacing: 4) {
                Text(displayName)
                    .font(.custom(RobinStyle.subtitle, size: 21)).foregroundStyle(RobinStyle.navy)
                    .lineLimit(1)
                if let email = profile?.email {
                    Text(email).font(.custom(RobinStyle.text, size: 14)).foregroundStyle(RobinStyle.muted).lineLimit(1)
                }
                Label(activeProduct?.title ?? "Acceso activo", systemImage: "checkmark.seal.fill")
                    .font(.custom(RobinStyle.textSemibold, size: 13)).foregroundStyle(RobinStyle.navy)
                    .padding(.top, 3)
            }
            Spacer(minLength: 0)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RobinStyle.paper)
    }

    private func settingCard(symbol: String, title: String, detail: String,
                              action: @escaping () -> Void, accessory: String) -> some View {
        Button(action: action) {
            settingRow(symbol: symbol, title: title, detail: detail, accessory: accessory)
        }
        .buttonStyle(.plain)
    }

    private func settingRow(symbol: String, title: String, detail: String, accessory: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: symbol).font(.system(size: 17, weight: .regular)).foregroundStyle(RobinStyle.navy)
                .frame(width: 28, height: 28)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.custom(RobinStyle.textSemibold, size: 15)).foregroundStyle(RobinStyle.navy)
                Text(detail).font(.custom(RobinStyle.text, size: 13)).foregroundStyle(RobinStyle.muted).lineLimit(2)
            }
            Spacer(minLength: 2)
            Image(systemName: accessory).font(.system(size: 11, weight: .semibold)).foregroundStyle(RobinStyle.muted)
        }
        .padding(.vertical, 9)
        .frame(minHeight: 48)
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
            permissionText = "Desactivadas. Toca para abrir Ajustes."
        case .notDetermined:
            permissionEnabled = false
            permissionText = "Aún no se han solicitado"
        @unknown default:
            permissionEnabled = false
            permissionText = "No disponible"
        }
    }
}
