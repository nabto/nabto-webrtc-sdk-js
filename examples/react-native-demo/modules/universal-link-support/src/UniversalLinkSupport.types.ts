import type { StyleProp, ViewStyle } from 'react-native';

export type OnLoadEventPayload = {
  url: string;
};

export type UniversalLinkSupportModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
  onUniversalLink: (params: UniversalLinkEventPayload) => void;
};

export type UniversalLinkEventPayload = {
  data?: string;
};

export type ChangeEventPayload = {
  value: string;
};

export type UniversalLinkSupportViewProps = {
  url: string;
  onLoad: (event: { nativeEvent: OnLoadEventPayload }) => void;
  style?: StyleProp<ViewStyle>;
};
