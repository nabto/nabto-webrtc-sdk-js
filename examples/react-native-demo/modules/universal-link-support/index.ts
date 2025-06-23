// Reexport the native module. On web, it will be resolved to UniversalLinkSupportModule.web.ts
// and on native platforms to UniversalLinkSupportModule.ts
export { default } from './src/UniversalLinkSupportModule';
export { default as UniversalLinkSupportView } from './src/UniversalLinkSupportView';
export * from  './src/UniversalLinkSupport.types';
