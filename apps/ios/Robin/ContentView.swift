import SwiftUI
import UIKit
import WebKit
import LocalAuthentication
import Security

private enum RobinAddress {
    static let start: URL = {
        #if DEBUG && targetEnvironment(simulator)
        URL(string: "http://localhost:8888/portal/")!
        #else
        URL(string: "https://project-robin.com/portal/")!
        #endif
    }()

    static func isInternalSite(_ url: URL) -> Bool {
        if url.scheme == "https" && (url.host == "project-robin.com" || url.host == "www.project-robin.com") {
            return true
        }
        #if DEBUG && targetEnvironment(simulator)
        return url.scheme == "http" && url.host == "localhost" && url.port == 8888
        #else
        return false
        #endif
    }

    static func isTrustedPortal(_ url: URL) -> Bool {
        return isInternalSite(url) && (url.path == "/login" || url.path == "/portal" || url.path.hasPrefix("/portal/"))
    }
}

struct ContentView: View {
    @State private var error: String?
    @State private var reloadNumber = 0
    @State private var pendingCredential: RobinCredential?
    @State private var showsSavePrompt = false
    @State private var authenticationError: String?
    @State private var authenticating = false
    @State private var webViewBox = WeakWebViewBox()

    var body: some View {
        ZStack {
            Color(red: 254 / 255, green: 251 / 255, blue: 229 / 255)
                .ignoresSafeArea()

            RobinWebView(
                startURL: RobinAddress.start,
                onLoaded: { error = nil },
                onError: { error = $0.localizedDescription },
                onCreated: { webViewBox.value = $0 },
                onAuthMessage: handleAuthMessage
            )
            .id(reloadNumber)

            if let error {
                VStack(spacing: 16) {
                    Text("No se puede abrir Robin")
                        .font(.title2.weight(.semibold))
                    Text(error)
                        .font(.footnote)
                        .multilineTextAlignment(.center)
                    Button("Reintentar") {
                        self.error = nil
                        reloadNumber += 1
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color(red: 45 / 255, green: 58 / 255, blue: 100 / 255))
                }
                .padding(28)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(red: 254 / 255, green: 251 / 255, blue: 229 / 255))
            }
        }
        .alert("Guardar contraseña en este iPhone", isPresented: $showsSavePrompt) {
            Button("Ahora no", role: .cancel) { pendingCredential = nil }
            Button("Guardar") { savePendingCredential() }
        } message: {
            Text("Robin protegerá la contraseña en el llavero del iPhone. Podrás entrar con Face ID o Touch ID la próxima vez que cierres sesión.")
        }
        .alert("No se pudo usar la biometría", isPresented: Binding(
            get: { authenticationError != nil },
            set: { if !$0 { authenticationError = nil } }
        )) {
            Button("Aceptar", role: .cancel) { authenticationError = nil }
        } message: {
            Text(authenticationError ?? "Vuelve a entrar con tu contraseña.")
        }
    }

    private func handleAuthMessage(_ message: WKScriptMessage, _ webView: WKWebView) {
        guard message.frameInfo.isMainFrame,
              let url = message.frameInfo.request.url,
              RobinAddress.isTrustedPortal(url),
              let body = message.body as? [String: Any],
              let action = body["action"] as? String else { return }

        switch action {
        case "status":
            sendCredentialStatus(to: webView)
        case "loginSucceeded":
            guard let username = body["username"] as? String,
                  let password = body["password"] as? String,
                  !username.isEmpty, username.count <= 320,
                  !password.isEmpty, password.count <= 1024 else { return }
            let savedUsername = UserDefaults.standard.string(forKey: RobinCredentialStore.savedUsernameKey)
            if savedUsername == username {
                do {
                    try RobinCredentialStore.save(RobinCredential(username: username, password: password))
                } catch {
                    UserDefaults.standard.removeObject(forKey: RobinCredentialStore.savedUsernameKey)
                    authenticationError = error.localizedDescription
                }
            } else {
                let context = LAContext()
                guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil) else { return }
                pendingCredential = RobinCredential(username: username, password: password)
                showsSavePrompt = true
            }
        case "authenticate":
            guard !authenticating else { return }
            authenticating = true
            Task {
                defer { authenticating = false }
                do {
                    let context = LAContext()
                    var policyError: NSError?
                    guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &policyError) else {
                        throw RobinCredentialStore.Failure.biometryUnavailable
                    }
                    try await context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                                                     localizedReason: "Entrar en Robin con la contraseña guardada")
                    let credential = try RobinCredentialStore.load(using: context)
                    let result = try await webView.callAsyncJavaScript("""
                        const response = await fetch('/portal/api/auth/login', {
                            method: 'POST', credentials: 'same-origin',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username, password })
                        });
                        return response.status;
                        """, arguments: ["username": credential.username, "password": credential.password],
                        in: nil, contentWorld: .page)
                    let status = result as? Int ?? 0
                    guard (200..<300).contains(status) else {
                        if status == 401 {
                            RobinCredentialStore.delete()
                            UserDefaults.standard.removeObject(forKey: RobinCredentialStore.savedUsernameKey)
                            throw RobinCredentialStore.Failure.loginRejected
                        }
                        throw RobinCredentialStore.Failure.serviceUnavailable
                    }
                    webView.load(URLRequest(url: RobinAddress.start))
                } catch {
                    if case RobinCredentialStore.Failure.keychain(errSecItemNotFound) = error {
                        UserDefaults.standard.removeObject(forKey: RobinCredentialStore.savedUsernameKey)
                    }
                    authenticationError = error.localizedDescription
                }
            }
        case "passwordChanged":
            guard let password = body["password"] as? String,
                  !password.isEmpty, password.count <= 1024,
                  let username = UserDefaults.standard.string(forKey: RobinCredentialStore.savedUsernameKey) else { return }
            do {
                try RobinCredentialStore.save(RobinCredential(username: username, password: password))
            } catch {
                UserDefaults.standard.removeObject(forKey: RobinCredentialStore.savedUsernameKey)
                authenticationError = error.localizedDescription
            }
        default:
            break
        }
    }

    private func sendCredentialStatus(to webView: WKWebView) {
        let saved = UserDefaults.standard.string(forKey: RobinCredentialStore.savedUsernameKey) != nil
        let context = LAContext()
        let available = saved && context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
        let method = context.biometryType == .touchID ? "Touch ID" : "Face ID"
        webView.evaluateJavaScript("window.dispatchEvent(new CustomEvent('robin-native-auth-status', { detail: { available: \(available), method: '\(method)' } }))")
    }

    private func savePendingCredential() {
        guard let credential = pendingCredential else { return }
        pendingCredential = nil
        do {
            try RobinCredentialStore.save(credential)
            UserDefaults.standard.set(credential.username, forKey: RobinCredentialStore.savedUsernameKey)
            if let webView = webViewBox.value { sendCredentialStatus(to: webView) }
        } catch {
            UserDefaults.standard.removeObject(forKey: RobinCredentialStore.savedUsernameKey)
            authenticationError = error.localizedDescription
        }
    }
}

private final class WeakWebViewBox {
    weak var value: WKWebView?
}

private struct RobinCredential {
    let username: String
    let password: String
}

private enum RobinCredentialStore {
    static let savedUsernameKey = "robin.savedUsername"
    private static let service = "com.projectrobin.ios.login"

    enum Failure: LocalizedError {
        case biometryUnavailable
        case loginRejected
        case serviceUnavailable
        case keychain(OSStatus)

        var errorDescription: String? {
            switch self {
            case .biometryUnavailable: "Configura Face ID o Touch ID en el iPhone, o entra con tu contraseña."
            case .loginRejected: "La contraseña guardada ya no es válida. Entra con tu contraseña actual."
            case .serviceUnavailable: "No se pudo iniciar sesión ahora. Inténtalo de nuevo más tarde."
            case .keychain: "No se pudo acceder al llavero del iPhone. Entra con tu contraseña."
            }
        }
    }

    static func save(_ credential: RobinCredential) throws {
        var error: Unmanaged<CFError>?
        guard let access = SecAccessControlCreateWithFlags(nil,
            kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly, .biometryCurrentSet, &error) else {
            throw Failure.biometryUnavailable
        }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
        ]
        let deleteStatus = SecItemDelete(query as CFDictionary)
        guard deleteStatus == errSecSuccess || deleteStatus == errSecItemNotFound else {
            throw Failure.keychain(deleteStatus)
        }
        var attributes = query
        attributes[kSecAttrAccount as String] = credential.username
        attributes[kSecAttrAccessControl as String] = access
        attributes[kSecValueData as String] = Data(credential.password.utf8)
        let status = SecItemAdd(attributes as CFDictionary, nil)
        guard status == errSecSuccess else { throw Failure.keychain(status) }
    }

    static func load(using context: LAContext) throws -> RobinCredential {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecMatchLimit as String: kSecMatchLimitOne,
            kSecReturnAttributes as String: true,
            kSecReturnData as String: true,
            kSecUseAuthenticationContext as String: context,
        ]
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess,
              let item = result as? [String: Any],
              let username = item[kSecAttrAccount as String] as? String,
              let data = item[kSecValueData as String] as? Data,
              let password = String(data: data, encoding: .utf8) else {
            throw Failure.keychain(status)
        }
        return RobinCredential(username: username, password: password)
    }

    static func delete() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
        ]
        SecItemDelete(query as CFDictionary)
    }
}

private struct RobinWebView: UIViewRepresentable {
    let startURL: URL
    let onLoaded: () -> Void
    let onError: (Error) -> Void
    let onCreated: (WKWebView) -> Void
    let onAuthMessage: (WKScriptMessage, WKWebView) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onLoaded: onLoaded, onError: onError, onAuthMessage: onAuthMessage)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.userContentController.add(context.coordinator, name: "robinAuth")
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        context.coordinator.webView = webView
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 254 / 255, green: 251 / 255, blue: 229 / 255, alpha: 1)
        webView.load(URLRequest(url: startURL))
        onCreated(webView)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "robinAuth")
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        let onLoaded: () -> Void
        let onError: (Error) -> Void
        let onAuthMessage: (WKScriptMessage, WKWebView) -> Void
        weak var webView: WKWebView?

        init(onLoaded: @escaping () -> Void, onError: @escaping (Error) -> Void,
             onAuthMessage: @escaping (WKScriptMessage, WKWebView) -> Void) {
            self.onLoaded = onLoaded
            self.onError = onError
            self.onAuthMessage = onAuthMessage
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let webView else { return }
            onAuthMessage(message, webView)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            onLoaded()
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            reportNavigationError(error)
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            reportNavigationError(error)
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            if webView.url != nil {
                webView.reload()
            } else {
                webView.load(URLRequest(url: RobinAddress.start))
            }
        }

        private func reportNavigationError(_ error: Error) {
            let navigationError = error as NSError
            if navigationError.domain == NSURLErrorDomain && navigationError.code == NSURLErrorCancelled { return }
            onError(error)
        }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url else {
                decisionHandler(.cancel)
                return
            }
            if RobinAddress.isInternalSite(url) {
                decisionHandler(.allow)
                return
            }
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        }

        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = action.request.url {
                if RobinAddress.isInternalSite(url) {
                    webView.load(action.request)
                } else {
                    UIApplication.shared.open(url)
                }
            }
            return nil
        }

        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            let alert = UIAlertController(title: "Robin", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Aceptar", style: .default) { _ in completionHandler() })
            guard let presenter = webView.window?.rootViewController else {
                completionHandler()
                return
            }
            presenter.present(alert, animated: true)
        }

        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            let alert = UIAlertController(title: "Robin", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Cancelar", style: .cancel) { _ in completionHandler(false) })
            alert.addAction(UIAlertAction(title: "Aceptar", style: .default) { _ in completionHandler(true) })
            guard let presenter = webView.window?.rootViewController else {
                completionHandler(false)
                return
            }
            presenter.present(alert, animated: true)
        }

        func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
            let alert = UIAlertController(title: "Robin", message: prompt, preferredStyle: .alert)
            alert.addTextField { $0.text = defaultText }
            alert.addAction(UIAlertAction(title: "Cancelar", style: .cancel) { _ in completionHandler(nil) })
            alert.addAction(UIAlertAction(title: "Aceptar", style: .default) { _ in
                completionHandler(alert.textFields?.first?.text)
            })
            guard let presenter = webView.window?.rootViewController else {
                completionHandler(nil)
                return
            }
            presenter.present(alert, animated: true)
        }
    }
}
