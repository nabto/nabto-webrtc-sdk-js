import Foundation
import ExpoModulesCore

public struct Notifier {
    private static var observer: ( (String) -> Void)? = nil
    private(set) static var currentData: String? = nil

    public static func registerObserver(obs: @escaping (String) -> Void) {
        self.observer = obs
    }

    public static func unregisterObserver() {
        self.observer = nil
    }

    public static func notifyObservers(_ path: String) {
        self.currentData = path
        self.observer?(path);
    }
}

public class UniversalLinkSupportAppLifecycleDelegate: ExpoAppDelegateSubscriber {
    public func applicationDidBecomeActive(_ application: UIApplication) {
        // The app has become active.
    }

    public func applicationWillResignActive(_ application: UIApplication) {
        // The app is about to become inactive.
    }

    public func applicationDidEnterBackground(_ application: UIApplication) {
        // The app is now in the background.
    }

    public func applicationWillEnterForeground(_ application: UIApplication) {
        // The app is about to enter the foreground.
    }

    public func applicationWillTerminate(_ application: UIApplication) {
        // The app is about to terminate.
    }

    public func application(
        _ application: UIApplication,
        continue userActivity: NSUserActivity,
        restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
    ) -> Bool {
        print("Launching from universal link")
        guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
            let incomingURL = userActivity.webpageURL,
            let components = NSURLComponents(url: incomingURL, resolvingAgainstBaseURL: true)
        else {
            return false
        }

        Notifier.notifyObservers(incomingURL.absoluteString)
        return true
    }
}
