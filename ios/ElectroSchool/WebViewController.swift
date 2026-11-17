// ElectroSchool pro iPadOS – WKWebView se sdíleným HTML/JS (složka app) a práce se soubory.
import UIKit
import WebKit
import UniformTypeIdentifiers

final class WebViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate, UIDocumentPickerDelegate {
    private var web: WKWebView!
    private var ready = false
    private var pending: URL?
    private var known: [String: URL] = [:]      // cesta -> URL z výběru souborů (oprávnění)
    private var savingAs: String?               // jméno souboru při „Uložit jako“
    static let cadType = UTType(filenameExtension: "cad") ?? .data

    override func loadView() {
        let cfg = WKWebViewConfiguration()
        let ucc = cfg.userContentController
        ucc.add(WeakHandler(self), name: "es")
        ucc.addUserScript(WKUserScript(source: "document.body.classList.add('ios')", injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        web = WKWebView(frame: .zero, configuration: cfg)
        web.navigationDelegate = self
        web.uiDelegate = self
        web.scrollView.isScrollEnabled = false
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.isOpaque = false
        web.backgroundColor = .systemBackground
        if #available(iOS 16.4, *) { web.isInspectable = true }
        view = web
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        let dir = Bundle.main.resourceURL!.appendingPathComponent("app", isDirectory: true)
        web.loadFileURL(dir.appendingPathComponent("index.html"), allowingReadAccessTo: dir)
    }

    override var prefersHomeIndicatorAutoHidden: Bool { true }

    // ---------------------------------------------------------- soubory
    func open(url: URL) {
        guard ready else { pending = url; return }
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        var data: Data?
        var err: NSError?
        NSFileCoordinator().coordinate(readingItemAt: url, options: [], error: &err) { u in data = try? Data(contentsOf: u) }
        guard let d = data else { alert("Soubor nelze přečíst.", url.lastPathComponent); return }
        known[url.path] = url
        js("ESApp.loadFile(\(q(url.lastPathComponent)), \(q(d.base64EncodedString())), \(q(url.path)))")
    }

    private func write(_ data: Data, to url: URL) -> Bool {
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        var ok = false
        var err: NSError?
        NSFileCoordinator().coordinate(writingItemAt: url, options: .forReplacing, error: &err) { u in
            ok = (try? data.write(to: u, options: .atomic)) != nil || (try? data.write(to: u)) != nil
        }
        return ok
    }

    private func tempFile(_ name: String, _ data: Data) -> URL? {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let u = dir.appendingPathComponent(name)
        return (try? data.write(to: u)) != nil ? u : nil
    }

    // ---------------------------------------------------------- zprávy z JS
    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let m = message.body as? [String: Any], let cmd = m["cmd"] as? String else { return }
        switch cmd {
        case "ready":
            ready = true
            if let u = pending { pending = nil; open(url: u) }
        case "title":
            let name = (m["name"] as? String) ?? ""
            let dirty = (m["dirty"] as? Bool) ?? false
            view.window?.windowScene?.title = (dirty ? "• " : "") + name
        case "open":
            let p = UIDocumentPickerViewController(forOpeningContentTypes: [Self.cadType, .data], asCopy: false)
            p.delegate = self; p.allowsMultipleSelection = false
            savingAs = nil
            present(p, animated: true)
        case "save":
            guard let b64 = m["data"] as? String, let data = Data(base64Encoded: b64) else { return }
            let name = (m["name"] as? String) ?? "schema.cad"
            if let path = m["path"] as? String, let url = known[path] {
                if write(data, to: url) { js("ESApp.saved(\(q(url.lastPathComponent)), \(q(url.path)))") }
                else { alert("Soubor se nepodařilo uložit.", url.lastPathComponent) }
                return
            }
            guard let tmp = tempFile(name.lowercased().hasSuffix(".cad") ? name : name + ".cad", data) else { return }
            let p = UIDocumentPickerViewController(forExporting: [tmp], asCopy: true)
            p.delegate = self
            savingAs = tmp.lastPathComponent
            present(p, animated: true)
        case "export":
            guard let b64 = m["data"] as? String, let data = Data(base64Encoded: b64),
                  let tmp = tempFile((m["name"] as? String) ?? "schema.png", data) else { return }
            let a = UIActivityViewController(activityItems: [tmp], applicationActivities: nil)
            if let pop = a.popoverPresentationController {
                pop.sourceView = view
                pop.sourceRect = CGRect(x: view.bounds.midX, y: view.safeAreaInsets.top + 40, width: 1, height: 1)
                pop.permittedArrowDirections = .up
            }
            present(a, animated: true)
        default: break
        }
    }

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let u = urls.first else { return }
        if savingAs != nil {
            savingAs = nil
            known[u.path] = u
            js("ESApp.saved(\(q(u.lastPathComponent)), \(q(u.path)))")
        } else {
            open(url: u)
        }
    }
    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { savingAs = nil }

    // ---------------------------------------------------------- menu
    @objc func menuCmd(_ sender: UICommand) {
        guard let c = sender.propertyList as? String else { return }
        js("ESApp.cmd('\(c)')")
    }
    @objc func open(_ sender: Any?) { js("ESApp.cmd('open')") }
    @objc func tabCmd(_ sender: UICommand) {
        guard let t = sender.propertyList as? String else { return }
        js("ESApp.setTab('\(t)')")
    }

    // ---------------------------------------------------------- pomocné
    func webView(_ webView: WKWebView, decidePolicyFor nav: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if nav.request.url?.isFileURL == true || nav.request.url?.scheme == "about" { decisionHandler(.allow); return }
        if let u = nav.request.url, nav.navigationType == .linkActivated { UIApplication.shared.open(u) }
        decisionHandler(.cancel)
    }
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(a, animated: true)
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "Zrušit", style: .cancel) { _ in completionHandler(false) })
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        present(a, animated: true)
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { webView.reload() }

    private func alert(_ title: String, _ text: String) {
        let a = UIAlertController(title: title, message: text, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "OK", style: .default))
        present(a, animated: true)
    }
    private func js(_ s: String) { web.evaluateJavaScript(s, completionHandler: nil) }
    private func q(_ s: String) -> String {
        let d = try! JSONSerialization.data(withJSONObject: [s]); let t = String(data: d, encoding: .utf8)!
        return String(t.dropFirst().dropLast())
    }
}

// zabrání cyklu odkazů WKUserContentController -> controller
private final class WeakHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ t: WKScriptMessageHandler) { target = t }
    func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) { target?.userContentController(c, didReceive: m) }
}
