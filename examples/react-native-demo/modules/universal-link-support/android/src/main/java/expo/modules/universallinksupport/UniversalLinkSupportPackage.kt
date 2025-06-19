package expo.modules.universallinksupport

import android.content.Context
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactActivityLifecycleListener
import expo.modules.core.interfaces.ApplicationLifecycleListener
import android.app.Activity
import android.os.Bundle
import android.content.Intent;
import android.app.Application;
import android.content.res.Configuration;
import android.util.Log
import android.net.Uri

typealias UniversalLinkObserver = (data: Uri?) -> Unit

object Notifier {
  private val observers = mutableListOf<UniversalLinkObserver>()
  var currentData: Uri? = null

  fun registerObserver(observer: UniversalLinkObserver) {
    observers.add(observer)
  }

  fun unregisterObserver(observer: UniversalLinkObserver) {
    observers.remove(observer)
  }

  fun notifyObservers(data: Uri?) {
    data?.let { d ->
      currentData = d
      observers.forEach { it(data) }
    }
  }
}

class UniversalLinkSupportReactActivityLifecycleListener : ReactActivityLifecycleListener {
  override fun onCreate(activity: Activity, savedInstanceState: Bundle?) {
    // Log.i("UniversalLink", "onCreate ==> ${activity.intent?.action} :: ${activity.intent?.data}")
    val data: Uri? = activity.intent?.data
    val action = activity.intent?.action
    if (action == Intent.ACTION_VIEW) {
      Notifier.notifyObservers(data)
    }
  }

  override fun onNewIntent(intent: Intent): Boolean {
    // Log.i("UniversalLink", "onNewIntent ==> ${intent.action} :: ${intent.data}")
    if (intent.action == Intent.ACTION_VIEW) {
      Notifier.notifyObservers(intent.data)
    }
    return false;
  }
}


class UniversalLinkSupportPackage : Package {
  override fun createReactActivityLifecycleListeners(activityContext: Context): List<ReactActivityLifecycleListener> {
    return listOf(UniversalLinkSupportReactActivityLifecycleListener())
  }
}