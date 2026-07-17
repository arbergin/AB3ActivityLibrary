declare module "gifenc" {
  export type GIFPalette = number[][];

  export type GIFFrameOptions = {
    palette?: GIFPalette;
    delay?: number;
    repeat?: number;
    transparent?: boolean | number;
    dispose?: number;
  };

  export type GIFEncoderInstance = {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: GIFFrameOptions
    ): void;
    finish(): void;
    bytes(): Uint8Array | number[];
    bytesView?(): Uint8Array;
    reset?(): void;
  };

  export function GIFEncoder(options?: {
    auto?: boolean;
    initialCapacity?: number;
  }): GIFEncoderInstance;

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: Record<string, unknown>
  ): GIFPalette;

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: GIFPalette,
    format?: "rgb565" | "rgb444" | "rgba4444"
  ): Uint8Array;
}
