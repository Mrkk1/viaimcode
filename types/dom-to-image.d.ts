declare module 'dom-to-image-more' {
  export interface DomToImageOptions {
    width?: number;
    height?: number;
    quality?: number;
    style?: Record<string, string>;
    filter?: (node: Node) => boolean;
    bgcolor?: string;
    cacheBust?: boolean;
    imagePlaceholder?: string;
  }

  export default {
    toSvg: (node: HTMLElement, options?: DomToImageOptions) => Promise<string>,
    toPng: (node: HTMLElement, options?: DomToImageOptions) => Promise<string>,
    toJpeg: (node: HTMLElement, options?: DomToImageOptions) => Promise<string>,
    toBlob: (node: HTMLElement, options?: DomToImageOptions) => Promise<Blob>,
    toPixelData: (node: HTMLElement, options?: DomToImageOptions) => Promise<Uint8Array>,
  };
} 