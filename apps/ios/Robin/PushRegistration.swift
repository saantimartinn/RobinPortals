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
    private var token: String?
    private weak var webView: WKWebView?
    private var requestingPermission = false

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func attach(_ view: WKWebView) {
        webView = view
        guard let url = view.url, RobinAddress.isInternalSite(url) else { return }
        view.evaluateJavaScript("fetch('/portal/api/me', {credentials:'same-origin'}).then(r => r.ok)") { [weak self] value, _ in
            guard value as? Bool == true else { return }
            self?.requestPermission()
        }
    }

    private func requestPermission() {
        guard !requestingPermission else { return }
        requestingPermission = true
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { [weak self] granted, _ in
            guard let self else { return }
            self.requestingPermission = false
            if granted { DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() } }
        }
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        token = deviceToken.map { String(format: "%02x", $0) }.joined()
        registerForProducts()
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        token = nil
    }

    private func registerForProducts() {
        guard let token else { return }
        WKWebsiteDataStore.default().httpCookieStore.getAllCookies { cookies in
            let hostCookies = cookies.filter { $0.domain == "project-robin.com" || $0.domain == ".project-robin.com" }
            let cookieHeader = hostCookies.map { "\($0.name)=\($0.value)" }.joined(separator: "; ")
            guard !cookieHeader.isEmpty else { return }
            for path in ["/portal/api/mobile/push", "/robinjr/api/mobile/push", "/therobinplan/api/mobile/push"] {
                guard let url = URL(string: "https://project-robin.com\(path)") else { continue }
                var request = URLRequest(url: url)
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.setValue(cookieHeader, forHTTPHeaderField: "Cookie")
                request.httpBody = try? JSONSerialization.data(withJSONObject: ["token": token])
                URLSession.shared.dataTask(with: request).resume()
            }
        }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        defer { completionHandler() }
        guard let product = response.notification.request.content.userInfo["product"] as? String,
              let id = response.notification.request.content.userInfo["notificationId"] as? String,
              ["portal", "robinjr", "community"].contains(product) else { return }
        let path = product == "community" ? "/therobinplan/" : "/\(product)/"
        guard let url = URL(string: "https://project-robin.com\(path)?notification=\(id.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") else { return }
        DispatchQueue.main.async { self.webView?.load(URLRequest(url: url)) }
    }
}
