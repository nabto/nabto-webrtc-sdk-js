import * as React from 'react';

import { UniversalLinkSupportViewProps } from './UniversalLinkSupport.types';

export default function UniversalLinkSupportView(props: UniversalLinkSupportViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
