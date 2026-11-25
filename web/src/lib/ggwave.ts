import type { GgwaveModule } from 'ggwave'

export const GGWAVE_SAMPLE_RATE = 48_000
export const GGWAVE_SAMPLES_PER_FRAME = 1024

let modulePromise: Promise<GgwaveModule> | null = null
const textDecoder = new TextDecoder('utf-8', { fatal: false })

export const loadGgwave = () => {
  modulePromise ??= import('ggwave').then((module) => module.default())
  return modulePromise
}

export const protocolFor = (ggwave: GgwaveModule, protocol: 'audible' | 'ultrasound') =>
  protocol === 'ultrasound'
    ? ggwave.ProtocolId.GGWAVE_PROTOCOL_ULTRASOUND_FAST
    : ggwave.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_FAST

/**
 * Initializes ggwave at its native 48 kHz baseband so frequency bins stay
 * aligned across 44.1 kHz, 48 kHz, and 96 kHz audio devices.
 */
export const createGgwaveInstance = (
  ggwave: GgwaveModule,
  payloadLength = -1
) => {
  const parameters = ggwave.getDefaultParameters()
  parameters.payloadLength = payloadLength
  parameters.sampleRate = GGWAVE_SAMPLE_RATE
  parameters.sampleRateInp = GGWAVE_SAMPLE_RATE
  parameters.sampleRateOut = GGWAVE_SAMPLE_RATE
  parameters.samplesPerFrame = GGWAVE_SAMPLES_PER_FRAME
  return ggwave.init(parameters)
}

/**
 * Decodes ggwave output bytes into trimmed text, stripping zero padding from
 * fixed-length 64-byte payloads (used by the mobile app).
 */
export const decodePayloadText = (bytes: Int8Array | Uint8Array): string => {
  if (!bytes.length) return ''
  const nullIndex = bytes.indexOf(0)
  const slice = nullIndex === -1 ? bytes : bytes.subarray(0, nullIndex)
  if (!slice.length) return ''
  return textDecoder.decode(slice).trim()
}

/**
 * Buffers and resamples arbitrary Web Audio input chunks into exact
 * 1024-sample frames at 48 kHz so ggwave's C++ resampler never drops samples
 * across callback boundaries.
 */
export const createAudioFramePipeline = (
  inputSampleRate: number,
  onFrame: (frame: Float32Array) => void
) => {
  const frame = new Float32Array(GGWAVE_SAMPLES_PER_FRAME)
  let framePos = 0
  let srcPos = 0
  let prevSample = 0
  let hasPrev = false
  const step = inputSampleRate / GGWAVE_SAMPLE_RATE

  const pushSample = (sample: number) => {
    frame[framePos++] = sample
    if (framePos === GGWAVE_SAMPLES_PER_FRAME) {
      framePos = 0
      onFrame(frame)
    }
  }

  return (chunk: Float32Array) => {
    if (!chunk.length) return
    if (inputSampleRate === GGWAVE_SAMPLE_RATE) {
      for (let i = 0; i < chunk.length; i += 1) {
        pushSample(chunk[i])
      }
      return
    }

    while (srcPos < chunk.length - 1) {
      let sample: number
      if (srcPos < 0 && hasPrev) {
        const frac = srcPos + 1
        sample = prevSample * (1 - frac) + chunk[0] * frac
      } else {
        const idx = Math.floor(srcPos)
        const frac = srcPos - idx
        sample = chunk[idx] * (1 - frac) + chunk[idx + 1] * frac
      }
      pushSample(sample)
      srcPos += step
    }
    srcPos -= chunk.length
    prevSample = chunk[chunk.length - 1]
    hasPrev = true
  }
}

export const bytesAsFloats = (bytes: Int8Array) =>
  new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))

// ggwave's browser binding reads the raw bytes of each Float32 audio callback.
export const floatsAsBytes = (samples: Float32Array) =>
  new Int8Array(samples.buffer.slice(samples.byteOffset, samples.byteOffset + samples.byteLength))
