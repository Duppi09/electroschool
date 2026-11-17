// ElectroSchool pro iPadOS – životní cyklus aplikace, scéna a menu (klávesové zkratky).
import UIKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool { true }

    func application(_ application: UIApplication, configurationForConnecting session: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let c = UISceneConfiguration(name: "Default", sessionRole: session.role)
        c.delegateClass = SceneDelegate.self
        return c
    }

    // menu (iPadOS s klávesnicí / lištou menu)
    override func buildMenu(with builder: UIMenuBuilder) {
        super.buildMenu(with: builder)
        guard builder.system == .main else { return }
        func cmd(_ title: String, _ c: String, _ key: String, _ mods: UIKeyModifierFlags = .command) -> UIKeyCommand {
            UIKeyCommand(title: title, action: #selector(WebViewController.menuCmd(_:)), input: key, modifierFlags: mods, propertyList: c)
        }
        func tab(_ title: String, _ t: String, _ key: String) -> UIKeyCommand {
            UIKeyCommand(title: title, action: #selector(WebViewController.tabCmd(_:)), input: key, modifierFlags: .command, propertyList: t)
        }
        builder.remove(menu: .newScene)
        // „Otevřít… ⌘O“ má systém (akce open:), obslouží ji WebViewController.open(_:)
        builder.insertChild(UIMenu(title: "", options: .displayInline, children: [
            cmd("Nový", "new", "n"),
            cmd("Uložit", "save", "s"), cmd("Uložit jako…", "saveas", "s", [.command, .shift]),
            cmd("Exportovat jako PNG…", "png", "e", [.command, .shift]),
        ]), atStartOfMenu: .file)
        builder.insertSibling(UIMenu(title: "Simulace", children: [cmd("Spustit / zastavit simulaci", "sim", "r")]), afterMenu: .view)
        builder.insertSibling(UIMenu(title: "Nástroje", children: [
            tab("Schéma", "schema", "1"), tab("Realita", "real", "2"), tab("Kalkulačky", "calc", "3"),
        ]), afterMenu: .view)
        builder.insertChild(UIMenu(title: "", options: .displayInline, children: [cmd("Zobrazit vše", "fit", "0")]), atStartOfMenu: .view)
    }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    let vc = WebViewController()

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
        guard let ws = scene as? UIWindowScene else { return }
        let w = UIWindow(windowScene: ws)
        w.rootViewController = vc
        w.makeKeyAndVisible()
        window = w
        ws.title = "ElectroSchool"
        if let u = options.urlContexts.first?.url { vc.open(url: u) }
    }

    // otevření souboru .cad z aplikace Soubory
    func scene(_ scene: UIScene, openURLContexts contexts: Set<UIOpenURLContext>) {
        if let u = contexts.first?.url { vc.open(url: u) }
    }
}
