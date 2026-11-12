// Store-Build (Play/App Store, Observe/Operate): VitalOS-Produkt setzt VITE_VOS_EDITION bzw.
// VITE_VOS_PRODUCT_BUILD. Standalone- und Owner-Builds setzen beides nicht und bleiben unverändert.
export const IS_STORE_BUILD = ['store', 'observe', 'operate'].includes(import.meta.env?.VITE_VOS_EDITION)
  || import.meta.env?.VITE_VOS_PRODUCT_BUILD === '1';
