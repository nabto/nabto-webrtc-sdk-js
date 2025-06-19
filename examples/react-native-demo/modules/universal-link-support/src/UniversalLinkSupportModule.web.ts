import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './UniversalLinkSupport.types';

type UniversalLinkSupportModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class UniversalLinkSupportModule extends NativeModule<UniversalLinkSupportModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(UniversalLinkSupportModule);
