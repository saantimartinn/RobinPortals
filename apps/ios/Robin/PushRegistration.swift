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

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func attach(_ view: WKWebView) {
        webView = view
        guard let url = view.url, RobinAddress.isInternalSite(url) else { return }
        let pageURL = view.url
        view.evaluateJavaScript("fetch('/portal/api/me', {credentials:'same-origin'}).then(r => r.ok ? r.json() : null).then(u => !!u && !u.is_application_admin)") { [weak self] value, error in
            guard error == nil, view.url == pageURL, let signedIn = value as? Bool else { return }
            if signedIn {
                self?.requestPermission()
                if let target = self?.pendingNotificationURL {
                    self?.pendingNotificationURL = nil
                    if view.url != target { view.load(URLRequest(url: target)) }
                }
            } else {
                self?.unregisterForProducts()
            }
        }
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

    private func unregisterForProducts() { sendDeviceRequest(method: "DELETE") }

    private func sendDeviceRequest(method: String) {
        guard let token else { return }
        WKWebsiteDataStore.default().httpCookieStore.getAllCookies { cookies in
            let hostCookies = cookies.filter { $0.domain == "project-robin.com" || $0.domain.hasSuffix(".project-robin.com") }
            let cookieHeader = hostCookies.map { "\($0.name)=\($0.value)" }.joined(separator: "; ")
            guard method == "DELETE" || !cookieHeader.isEmpty else { return }
            for path in ["/portal/api/mobile/push", "/robinjr/api/mobile/push", "/therobinplan/api/mobile/push"] {
                guard let url = URL(string: "https://project-robin.com\(path)") else { continue }
                var request = URLRequest(url: url)
                request.httpMethod = method
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.setValue(cookieHeader, forHTTPHeaderField: "Cookie")
                request.setValue("ios", forHTTPHeaderField: "X-Robin-Native-Client")
                request.httpBody = try? JSONSerialization.data(withJSONObject: ["token": token])
                URLSession.shared.dataTask(with: request).resume()
            }
        }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .badge, .sound])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        defer { completionHandler() }
        guard let product = response.notification.request.content.userInfo["product"] as? String,
              let id = response.notification.request.content.userInfo["notificationId"] as? String,
              ["portal", "robinjr", "community"].contains(product) else { return }
        let path = product == "community" ? "/therobinplan/" : "/\(product)/"
        guard let url = URL(string: "https://project-robin.com\(path)?notification=\(id.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") else { return }
        DispatchQueue.main.async {
            self.pendingNotificationURL = url
            self.webView?.load(URLRequest(url: url))
        }
    }
}
