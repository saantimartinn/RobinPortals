import SwiftUI

@main
struct RobinApp: App {
    @UIApplicationDelegateAdaptor(PushRegistration.self) private var pushRegistration
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
