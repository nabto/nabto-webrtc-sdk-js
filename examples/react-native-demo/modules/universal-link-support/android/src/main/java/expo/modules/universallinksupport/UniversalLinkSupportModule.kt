package expo.modules.universallinksupport

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.URL
import android.util.Log
import androidx.core.os.bundleOf

class UniversalLinkSupportModule : Module() {
  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.


  private val universalLinkObserver: UniversalLinkObserver = { data -> 
    this@UniversalLinkSupportModule.sendEvent("onUniversalLink", bundleOf("data" to data))
  }

  override fun definition() = ModuleDefinition {
    // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
    // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
    // The module will be accessible from `requireNativeModule('UniversalLinkSupport')` in JavaScript.
    Name("UniversalLinkSupport")

    // Sets constant properties on the module. Can take a dictionary or a closure that returns a dictionary.
    Constants(
      "PI" to Math.PI
    )

    // Defines event names that the module can send to JavaScript.
    Events("onChange", "onUniversalLink")

    OnStartObserving { 
      Notifier.registerObserver(universalLinkObserver)
    }

    OnStopObserving {
      Notifier.registerObserver(universalLinkObserver)
    }

    Function("getInitialUniversalLink") {
      Notifier.currentData
    }

    // Enables the module to be used as a native view. Definition components that are accepted as part of
    // the view definition: Prop, Events.
    View(UniversalLinkSupportView::class) {
      // Defines a setter for the `url` prop.
      Prop("url") { view: UniversalLinkSupportView, url: URL ->
        view.webView.loadUrl(url.toString())
      }
      // Defines an event that the view can send to JavaScript.
      Events("onLoad")
    }
  }
}
