// ElectroSchool – nativní obal pro macOS (okno s WKWebView + menu + práce se soubory).
import Cocoa
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKScriptMessageHandler, WKNavigationDelegate {
    var window: NSWindow!
    var web: WKWebView!
    var ready = false
    var pending: URL?
    var dirty = false
    var closing = false

    func applicationDidFinishLaunching(_ note: Notification) {
        buildMenu()
        let cfg = WKWebViewConfiguration()
        cfg.userContentController.add(self, name: "es")
        web = WKWebView(frame: .zero, configuration: cfg)
        web.navigationDelegate = self
        web.allowsMagnification = false
        if #available(macOS 13.3, *) { web.isInspectable = true }

        let screen = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1280, height: 800)
        let size = NSSize(width: min(1440, screen.width * 0.86), height: min(940, screen.height * 0.88))
        window = NSWindow(contentRect: NSRect(origin: .zero, size: size),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "ElectroSchool"
        window.minSize = NSSize(width: 760, height: 480)
        window.contentView = web
        window.delegate = self
        window.center()
        window.setFrameAutosaveName("ElectroSchoolMain")
        window.makeKeyAndOrderFront(nil)

        let dir = Bundle.main.resourceURL!.appendingPathComponent("app", isDirectory: true)
        web.loadFileURL(dir.appendingPathComponent("index.html"), allowingReadAccessTo: dir)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    // otevření souboru z Finderu / přetažením na ikonu
    func application(_ sender: NSApplication, openFile filename: String) -> Bool {
        open(url: URL(fileURLWithPath: filename)); return true
    }

    func open(url: URL) {
        guard ready else { pending = url; return }
        guard let data = try? Data(contentsOf: url) else { alert("Soubor nelze přečíst.", url.path); return }
        NSDocumentController.shared.noteNewRecentDocumentURL(url)
        js("ESApp.loadFile(\(q(url.lastPathComponent)), \(q(data.base64EncodedString())), \(q(url.path)))")
    }

    // ---------------------------------------------------------- zprávy z JS
    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let m = message.body as? [String: Any], let cmd = m["cmd"] as? String else { return }
        switch cmd {
        case "ready":
            ready = true
            if let u = pending { pending = nil; open(url: u) }
            selfTest()
        case "title":
            dirty = (m["dirty"] as? Bool) ?? false
            window.title = ((m["name"] as? String) ?? "") + " – ElectroSchool"
            window.isDocumentEdited = dirty
        case "open":
            let p = NSOpenPanel()
            p.allowedFileTypes = ["cad", "CAD"]; p.allowsMultipleSelection = false
            p.beginSheetModal(for: window) { r in if r == .OK, let u = p.url { self.open(url: u) } }
        case "save", "export":
            guard let b64 = m["data"] as? String, let data = Data(base64Encoded: b64) else { return }
            let isCad = cmd == "save"
            if isCad, let path = m["path"] as? String {
                write(data, to: URL(fileURLWithPath: path), cad: true); return
            }
            let p = NSSavePanel()
            p.nameFieldStringValue = (m["name"] as? String) ?? (isCad ? "schema.cad" : "schema.png")
            p.allowedFileTypes = [isCad ? "cad" : "png"]
            p.beginSheetModal(for: window) { r in if r == .OK, let u = p.url { self.write(data, to: u, cad: isCad) } }
        default: break
        }
    }

    func write(_ data: Data, to url: URL, cad: Bool) {
        do {
            try data.write(to: url, options: .atomic)
            if cad {
                NSDocumentController.shared.noteNewRecentDocumentURL(url)
                js("ESApp.saved(\(q(url.lastPathComponent)), \(q(url.path)))")
                if closing { closing = false; dirty = false; window.close() }
            }
        } catch { closing = false; alert("Soubor se nepodařilo uložit.", error.localizedDescription) }
    }

    func windowShouldClose(_ sender: NSWindow) -> Bool {
        guard dirty else { return true }
        let a = NSAlert()
        a.messageText = "Zahodit neuložené změny?"
        a.informativeText = "Schéma obsahuje změny, které nejsou uložené."
        a.addButton(withTitle: "Uložit…"); a.addButton(withTitle: "Zrušit"); a.addButton(withTitle: "Zahodit")
        a.beginSheetModal(for: window) { r in
            if r == .alertFirstButtonReturn { self.closing = true; self.js("ESApp.cmd('save')") }
            else if r == .alertThirdButtonReturn { self.dirty = false; self.window.close() }
        }
        return false
    }

    // Vývojářský test: ES_SNAPSHOT=/cesta.png [ES_SCRIPT="js"] -> uloží snímek okna a skončí.
    func selfTest() {
        let env = ProcessInfo.processInfo.environment
        guard let out = env["ES_SNAPSHOT"] else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.web.evaluateJavaScript(env["ES_SCRIPT"] ?? "1") { _, err in
                if let err = err { print("JS chyba: \(err)") }
                DispatchQueue.main.asyncAfter(deadline: .now() + (Double(env["ES_WAIT"] ?? "") ?? 1.5)) {
                    self.web.evaluateJavaScript("document.title + ' | ' + JSON.stringify(Object.keys((ESApp._debug().sim||{}).coil||{}))") { r, _ in
                        print("STAV: \(r ?? "nil") | okno: \(self.window.title)")
                        self.web.takeSnapshot(with: nil) { img, _ in
                            if let t = img?.tiffRepresentation, let rep = NSBitmapImageRep(data: t), let png = rep.representation(using: .png, properties: [:]) {
                                try? png.write(to: URL(fileURLWithPath: out))
                            }
                            exit(0)
                        }
                    }
                }
            }
        }
    }

    func alert(_ title: String, _ text: String) {
        let a = NSAlert(); a.messageText = title; a.informativeText = text; a.beginSheetModal(for: window, completionHandler: nil)
    }
    func js(_ s: String) { web.evaluateJavaScript(s, completionHandler: nil) }
    func q(_ s: String) -> String {
        let d = try! JSONSerialization.data(withJSONObject: [s]); let t = String(data: d, encoding: .utf8)!
        return String(t.dropFirst().dropLast())
    }

    // odkazy ven neotvírat uvnitř aplikace
    func webView(_ webView: WKWebView, decidePolicyFor nav: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(nav.request.url?.isFileURL == true ? .allow : .cancel)
    }

    // ---------------------------------------------------------- menu
    @objc func menuCmd(_ sender: NSMenuItem) {
        guard let c = sender.representedObject as? String else { return }
        js("ESApp.cmd('\(c)')")
    }
    // úpravy: v dialogu s textovým polem standardní chování, jinak příkaz editoru
    @objc func editCmd(_ sender: NSMenuItem) {
        guard let c = sender.representedObject as? String else { return }
        web.evaluateJavaScript("document.getElementById('dlg').open || /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName) || document.body.classList.contains('calc')") { r, _ in
            if (r as? Bool) == true {
                let map = ["undo": "undo:", "redo": "redo:", "cut": "cut:", "copy": "copy:", "paste": "paste:", "selectall": "selectAll:", "delete": "delete:"]
                if let s = map[c] { NSApp.sendAction(Selector(s), to: nil, from: self) }
            } else { self.js("ESApp.cmd('\(c)')") }
        }
    }

    func item(_ title: String, _ cmd: String, _ key: String = "", shift: Bool = false, edit: Bool = false) -> NSMenuItem {
        let i = NSMenuItem(title: title, action: edit ? #selector(editCmd(_:)) : #selector(menuCmd(_:)), keyEquivalent: key)
        if shift { i.keyEquivalentModifierMask = [.command, .shift] }
        i.target = self; i.representedObject = cmd; return i
    }

    @objc func tabCmd(_ sender: NSMenuItem) { if let t = sender.representedObject as? String { js("ESApp.setTab('\(t)')") } }
    func tab(_ title: String, _ t: String, _ key: String) -> NSMenuItem {
        let i = NSMenuItem(title: title, action: #selector(tabCmd(_:)), keyEquivalent: key); i.target = self; i.representedObject = t; return i
    }

    func buildMenu() {
        let main = NSMenu()
        func sub(_ title: String, _ items: [NSMenuItem]) { let mi = NSMenuItem(); let m = NSMenu(title: title); items.forEach { m.addItem($0) }; mi.submenu = m; main.addItem(mi) }
        sub("ElectroSchool", [
            NSMenuItem(title: "O aplikaci ElectroSchool", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: ""),
            .separator(),
            NSMenuItem(title: "Skrýt ElectroSchool", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h"),
            .separator(),
            NSMenuItem(title: "Ukončit ElectroSchool", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"),
        ])
        sub("Soubor", [
            item("Nový", "new", "n"), item("Otevřít…", "open", "o"), .separator(),
            item("Uložit", "save", "s"), item("Uložit jako…", "saveas", "s", shift: true), .separator(),
            item("Exportovat jako PNG…", "png", "e"), .separator(),
            NSMenuItem(title: "Zavřít okno", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w"),
        ])
        sub("Úpravy", [
            item("Zpět", "undo", "z", edit: true), item("Znovu", "redo", "z", shift: true, edit: true), .separator(),
            item("Vyjmout", "cut", "x", edit: true), item("Kopírovat", "copy", "c", edit: true), item("Vložit", "paste", "v", edit: true),
            item("Vybrat vše", "selectall", "a", edit: true), .separator(),
            item("Otočit", "rotate"), item("Smazat", "delete"),
        ])
        sub("Zobrazení", [item("Přiblížit", "zoomin", "+"), item("Oddálit", "zoomout", "-"), item("Zobrazit vše", "fit", "0")])
        sub("Simulace", [item("Spustit / zastavit simulaci", "sim", "r")])
        sub("Nástroje", [tab("Schéma", "schema", "1"), tab("Realita", "real", "2"), tab("Kalkulačky", "calc", "3")])
        sub("Okno", [
            NSMenuItem(title: "Minimalizovat", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m"),
            NSMenuItem(title: "Zvětšit", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: ""),
        ])
        NSApp.mainMenu = main
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
