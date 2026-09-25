// Module types for the graphics renderer's bundled files.
declare module "*.wasm" {
  const wasm: WebAssembly.Module;
  export default wasm;
}

declare module "*.ttf" {
  const data: ArrayBuffer;
  export default data;
}

declare module "jpeg-js/lib/encoder.js" {
  export default function encode(
    image: { data: Uint8Array | ArrayLike<number>; width: number; height: number },
    quality?: number,
  ): { data: Uint8Array; width: number; height: number };
}
