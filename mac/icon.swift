// Vykreslí ikonu aplikace (1024 px PNG). Použití: swift icon.swift vystup.png
import Cocoa

let S: CGFloat = 1024
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(S), pixelsHigh: Int(S), bitsPerSample: 8, samplesPerPixel: 4,
                           hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
let bg = NSBezierPath(roundedRect: NSRect(x: 100, y: 100, width: 824, height: 824), xRadius: 185, yRadius: 185)
NSGradient(colors: [NSColor(red: 0.12, green: 0.45, blue: 0.95, alpha: 1), NSColor(red: 0.04, green: 0.22, blue: 0.62, alpha: 1)])!.draw(in: bg, angle: -90)
NSColor.white.setStroke(); NSColor.white.setFill()
func line(_ a: NSPoint, _ b: NSPoint, _ w: CGFloat = 30) { let p = NSBezierPath(); p.move(to: a); p.line(to: b); p.lineWidth = w; p.lineCapStyle = .round; p.stroke() }
// tři póly stykače
for x in [342, 512, 682] as [CGFloat] {
    line(NSPoint(x: x, y: 850), NSPoint(x: x, y: 760))
    line(NSPoint(x: x, y: 640), NSPoint(x: x - 62, y: 762))
    line(NSPoint(x: x, y: 640), NSPoint(x: x, y: 520))
}
// motor
let c = NSBezierPath(ovalIn: NSRect(x: 302, y: 150, width: 420, height: 420)); c.lineWidth = 30
NSColor(red: 0.04, green: 0.22, blue: 0.62, alpha: 1).setFill(); c.fill(); c.stroke()
let st = NSMutableParagraphStyle(); st.alignment = .center
("M" as NSString).draw(in: NSRect(x: 302, y: 300, width: 420, height: 220),
    withAttributes: [.font: NSFont.systemFont(ofSize: 190, weight: .bold), .foregroundColor: NSColor.white, .paragraphStyle: st])
("3~" as NSString).draw(in: NSRect(x: 302, y: 190, width: 420, height: 130),
    withAttributes: [.font: NSFont.systemFont(ofSize: 110, weight: .semibold), .foregroundColor: NSColor.white, .paragraphStyle: st])
NSGraphicsContext.current?.flushGraphics()
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
