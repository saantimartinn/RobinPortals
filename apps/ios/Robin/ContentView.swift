import SwiftUI
import UIKit
import WebKit

private enum RobinAddress {
    static let start: URL = {
        #if DEBUG && targetEnvironment(simulator)
        URL(string: "http://localhost:8888/portal/")!
        #else
        URL(string: "https://project-robin.com/portal/")!
        #endif
    }()
}

struct ContentView: View {
    @State private var error: String?
    @State private var reloadNumber = 0

    var body: some View {
        ZStack {
            Color(red: 254 / 255, green: 251 / 255, blue: 229 / 255)
                .ignoresSafeArea()

            RobinWebView(
                startURL: RobinAddress.start,
                onLoaded: { error = nil },
                onError: { error = $0.localizedDescription }
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
    }
}

private struct RobinWebView: UIViewRepresentable {
    let startURL: URL
    let onLoaded: () -> Void
    let onError: (Error) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onLoaded: onLoaded, onError: onError)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 254 / 255, green: 251 / 255, blue: 229 / 255, alpha: 1)
        webView.load(URLRequest(url: startURL))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        let onLoaded: () -> Void
        let onError: (Error) -> Void

        init(onLoaded: @escaping () -> Void, onError: @escaping (Error) -> Void) {
            self.onLoaded = onLoaded
            self.onError = onError
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            onLoaded()
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            onError(error)
        }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url else {
                decisionHandler(.cancel)
                return
            }
            if url.host == webView.url?.host || url.host == "localhost" || url.host == "project-robin.com" || url.host == "www.project-robin.com" {
                decisionHandler(.allow)
                return
            }
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        }

        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = action.request.url {
                if url.host == webView.url?.host || url.host == "localhost" || url.host == "project-robin.com" || url.host == "www.project-robin.com" {
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
