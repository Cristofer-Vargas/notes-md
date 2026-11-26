declare module 'wasm-media-encoders' {
  export interface WasmMediaEncoder {
    configure(options: {
      channels: 1 | 2
      sampleRate: number
      bitrate?: number
      vbrQuality?: number
      outputSampleRate?: number
    }): void
    encode(samples: Float32Array[]): Uint8Array
    finalize(): Uint8Array
  }

  export function createMp3Encoder(): Promise<WasmMediaEncoder>
}
