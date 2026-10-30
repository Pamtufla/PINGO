import SwiftUI
import WebKit

@main
struct PingoApp: App {
    var body: some Scene { WindowGroup { GameView() } }
}

struct GameView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.0.0"
        config.applicationNameForUserAgent = "PingoIOS/\(version)"
        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        web.isOpaque = false
        web.backgroundColor = .black
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.load(URLRequest(url: Coordinator.origin))
        return web
    }
    func updateUIView(_ view: WKWebView, context: Context) {}
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        static let origin = URL(string: Bundle.main.object(forInfoDictionaryKey: "PingoWebURL") as? String ?? "https://pingo-halloween.onrender.com")!
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url else { decisionHandler(.cancel); return }
            if url.scheme == "https" && url.host == Self.origin.host { decisionHandler(.allow); return }
            decisionHandler(.cancel)
            if url.scheme == "https" && !url.path.lowercased().hasSuffix(".apk") { UIApplication.shared.open(url) }
        }
        func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            decisionHandler(origin.protocol == "https" && origin.host == Self.origin.host && type == .microphone ? .prompt : .deny)
        }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            let page = "<meta name='viewport' content='width=device-width'><h1>Sin conexión</h1><p>No se pudo cargar Pingo. Revisa tu conexión y vuelve a abrir la app.</p>"
            webView.loadHTMLString(page, baseURL: nil)
        }
    }
}
