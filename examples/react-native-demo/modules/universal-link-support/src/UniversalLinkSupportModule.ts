import { NativeModule, requireNativeModule } from 'expo';

import { UniversalLinkSupportModuleEvents } from './UniversalLinkSupport.types';

declare class UniversalLinkSupportModule extends NativeModule<UniversalLinkSupportModuleEvents> {
  getInitialUniversalLink(): string | undefined
}

// This call loads the native module object from the JSI.
export default requireNativeModule<UniversalLinkSupportModule>('UniversalLinkSupport');
