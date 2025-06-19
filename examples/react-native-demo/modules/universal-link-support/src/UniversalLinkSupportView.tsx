import { requireNativeView } from 'expo';
import * as React from 'react';

import { UniversalLinkSupportViewProps } from './UniversalLinkSupport.types';

const NativeView: React.ComponentType<UniversalLinkSupportViewProps> =
  requireNativeView('UniversalLinkSupport');

export default function UniversalLinkSupportView(props: UniversalLinkSupportViewProps) {
  return <NativeView {...props} />;
}
