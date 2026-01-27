declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.webp';
declare module '*.svg' {
  import type React from 'react';
  export interface SvgProps {
    // biome-ignore lint/suspicious/noExplicitAny: intentional.
    [key: string]: any;
  }
  const content: React.FC<SvgProps>;
  export default content;
}
