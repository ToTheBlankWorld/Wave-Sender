declare module 'ggwave' {
  export interface GgwaveParameters {
    payloadLength: number
    sampleRateInp: number
    sampleRateOut: number
    sampleRate: number
    samplesPerFrame: number
    soundMarkerThreshold: number
    sampleFormatInp: unknown
    sampleFormatOut: unknown
    operatingMode: number
  }

  export interface GgwaveModule {
    ProtocolId: {
      GGWAVE_PROTOCOL_AUDIBLE_FAST: unknown
      GGWAVE_PROTOCOL_ULTRASOUND_FAST: unknown
    }
    getDefaultParameters: () => GgwaveParameters
    init: (parameters: GgwaveParameters) => number
    free: (instance: number) => void
    encode: (instance: number, payload: string, protocol: unknown, volume: number) => Int8Array
    decode: (instance: number, audio: Int8Array) => Int8Array
    disableLog?: () => void
  }

  export default function ggwaveFactory(): Promise<GgwaveModule>
}
