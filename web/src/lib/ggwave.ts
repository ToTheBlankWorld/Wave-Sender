import ggwaveFactory, { type GgwaveModule } from 'ggwave'

let modulePromise: Promise<GgwaveModule> | null = null

export const loadGgwave = () => {
  modulePromise ??= ggwaveFactory()
  return modulePromise
}

export const protocolFor = (ggwave: GgwaveModule, protocol: 'audible' | 'ultrasound') =>
  protocol === 'ultrasound'
    ? ggwave.ProtocolId.GGWAVE_PROTOCOL_ULTRASOUND_FAST
    : ggwave.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_FAST

export const bytesAsFloats = (bytes: Int8Array) =>
  new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))

// ggwave's browser binding reads the raw bytes of each Float32 audio callback.
export const floatsAsBytes = (samples: Float32Array) =>
  new Int8Array(samples.buffer.slice(samples.byteOffset, samples.byteOffset + samples.byteLength))
