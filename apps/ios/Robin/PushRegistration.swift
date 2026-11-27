import Foundation
import UIKit
import UserNotifications
import WebKit

final class PushRegistration: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    static weak var active: PushRegistration?

    override init() {
        super.init()
        Self.active = self
    }
    private var token: String? = UserDefaults.standard.string(forKey: "robin.apns.token")
    private weak var webView: WKWebView?
    private var requestingPermission = false
    private var pendingNotificationURL: URL?
    var onOpenNotification: ((URL) -> Void)?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func attach(_ view: WKWebView) {
        webView = view
        guard let url = view.url, RobinAddress.isInternalSite(url) else { return }
        let pageURL = view.url
        Task { @MainActor [weak self] in
            guard let value = try? await view.callAsyncJavaScript("const response = await fetch('/portal/api/me', {credentials:'same-origin'}); const user = response.ok ? await response.json() : null; return !!user && !user.is_application_admin;", arguments: [:], in: nil, contentWorld: .page),
                  view.url == pageURL, let signedIn = value as? Bool else { return }
            if signedIn {
                self?.sessionValidated(isSignedIn: true)
                if let target = self?.pendingNotificationURL {
                    self?.pendingNotificationURL = nil
                    if view.url != target { view.load(URLRequest(url: target)) }
                }
            } else {
                self?.unregisterForProducts()
            }
        }
    }

    func sessionValidated(isSignedIn: Bool) {
        if isSignedIn { requestPermission() }
        else { unregisterForProducts() }
    }

    func logout(completion: @escaping () -> Void) {
        unregisterForProducts(completion: completion)
        UserDefaults.standard.removeObject(forKey: "robin.apns.token")
        token = nil
        webView = nil
    }

    private func requestPermission() {
        guard !requestingPermission else { return }
        requestingPermission = true
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { [weak self] granted, _ in
            guard let self else { return }
            self.requestingPermission = false
            if granted {
                self.registerForProducts()
                DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() }
            }
            else { self.unregisterForProducts() }
        }
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        token = deviceToken.map { String(format: "%02x", $0) }.joined()
        UserDefaults.standard.set(token, forKey: "robin.apns.token")
        registerForProducts()
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        token = nil
    }

    private func registerForProducts() { sendDeviceRequest(method: "POST") }

    private func unregisterForProducts(completion: (() -> Void)? = nil) {
        sendDeviceRequest(method: "DELETE", completion: completion)
    }

    private func sendDeviceRequest(method: String, completion: (() -> Void)? = nil) {
        guard let token else { completion?(); return }
        WKWebsiteDataStore.default().httpCookieStore.getAllCookies { cookies in
            guard let host = RobinAddress.origin.host?.lowercased() else { completion?(); return }
            let hostCookies = cookies.filter {
                let domain = $0.domain.trimmingCharacters(in: CharacterSet(charactersIn: ".")).lowercased()
                return host == domain || host.hasSuffix("." + domain)
            }
            let cookieHeader = hostCookies.map { "\($0.name)=\($0.value)" }.joined(separator: "; ")
            guard method == "DELETE" || !cookieHeader.isEmpty else { completion?(); return }
            for path in ["/portal/api/mobile/push", "/robinjr/api/mobile/push", "/therobinplan/api/mobile/push"] {
                let url = RobinAddress.origin.appending(path: String(path.dropFirst()))
                var request = URLRequest(url: url)
                request.httpMethod = method
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.setValue(cookieHeader, forHTTPHeaderField: "Cookie")
                request.setValue("ios", forHTTPHeaderField: "X-Robin-Native-Client")
                request.httpBody = try? JSONSerialization.data(withJSONObject: ["token": token])
                URLSession.shared.dataTask(with: request).resume()
            }
            completion?()
        }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .badge, .sound])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        defer { completionHandler() }
        guard let product = response.notification.request.content.userInfo["product"] as? String,
              let id = response.notification.request.content.userInfo["notificationId"] as? String,
              let productValue = RobinProduct(rawValue: product),
              UUID(uuidString: id) != nil,
              let url = productValue.noticeURL(id: id, origin: RobinAddress.origin) else { return }
        DispatchQueue.main.async {
            self.pendingNotificationURL = url
            self.onOpenNotification?(url)
            self.webView?.load(URLRequest(url: url))
        }
    }
}
