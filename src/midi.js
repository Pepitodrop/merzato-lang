import { MerzatoSyntaxError, MerzatoResourceError } from './errors.js';

function midiError(message, details = {}) {
  return new MerzatoSyntaxError(message, { code: 'INVALID_MIDI', ...details });
}

function ensureAvailable(buffer, offset, length, context) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 ||
      offset + length > buffer.length) {
    throw midiError(`Unexpected end of MIDI file while reading ${context}`);
  }
}

function readUint16(view, buffer, offset, context) {
  ensureAvailable(buffer, offset, 2, context);
  return view.getUint16(offset);
}

function readUint32(view, buffer, offset, context) {
  ensureAvailable(buffer, offset, 4, context);
  return view.getUint32(offset);
}

function readText(buffer, offset, length, context) {
  ensureAvailable(buffer, offset, length, context);
  return String.fromCharCode(...buffer.slice(offset, offset + length));
}

function readByte(buffer, state, end, context) {
  if (state.offset >= end || state.offset >= buffer.length) {
    throw midiError(`Unexpected end of MIDI track while reading ${context}`, { track: state.track });
  }
  return buffer[state.offset++];
}

function readVarLen(buffer, state, end) {
  let value = 0;
  for (let count = 0; count < 4; count += 1) {
    const byte = readByte(buffer, state, end, 'variable-length value');
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) return value;
  }
  throw midiError('Invalid MIDI variable-length value', { track: state.track });
}

function systemDataLength(status) {
  switch (status) {
    case 0xf1: return 1;
    case 0xf2: return 2;
    case 0xf3: return 1;
    case 0xf6: return 0;
    case 0xf8:
    case 0xf9:
    case 0xfa:
    case 0xfb:
    case 0xfc:
    case 0xfd:
    case 0xfe:
      return 0;
    default:
      return null;
  }
}

function parseTrack(buffer, start, end, trackIndex, maxEvents) {
  const state = { offset: start, track: trackIndex };
  let runningStatus = null;
  let tick = 0;
  let eventCount = 0;
  const notes = [];

  while (state.offset < end) {
    eventCount += 1;
    if (eventCount > maxEvents) {
      throw new MerzatoResourceError(`MIDI track exceeds ${maxEvents} events`, {
        code: 'MIDI_EVENT_LIMIT',
        track: trackIndex,
        limit: maxEvents
      });
    }

    tick += readVarLen(buffer, state, end);
    let status = readByte(buffer, state, end, 'status byte');
    if (status < 0x80) {
      if (runningStatus === null) {
        throw midiError('Invalid MIDI running status', { track: trackIndex });
      }
      state.offset -= 1;
      status = runningStatus;
    } else if (status < 0xf0) {
      runningStatus = status;
    }

    if (status === 0xff) {
      runningStatus = null;
      const metaType = readByte(buffer, state, end, 'meta event type');
      const metaLength = readVarLen(buffer, state, end);
      ensureAvailable(buffer, state.offset, metaLength, 'meta event data');
      if (state.offset + metaLength > end) {
        throw midiError('Meta event extends beyond its track', { track: trackIndex });
      }
      state.offset += metaLength;
      if (metaType === 0x2f) break;
      continue;
    }

    if (status === 0xf0 || status === 0xf7) {
      runningStatus = null;
      const sysexLength = readVarLen(buffer, state, end);
      ensureAvailable(buffer, state.offset, sysexLength, 'SysEx data');
      if (state.offset + sysexLength > end) {
        throw midiError('SysEx event extends beyond its track', { track: trackIndex });
      }
      state.offset += sysexLength;
      continue;
    }

    if (status >= 0xf0) {
      const dataLength = systemDataLength(status);
      if (dataLength === null) {
        throw midiError(`Unsupported MIDI system status 0x${status.toString(16)}`, {
          track: trackIndex
        });
      }
      if (status < 0xf8) runningStatus = null;
      for (let index = 0; index < dataLength; index += 1) {
        const byte = readByte(buffer, state, end, 'system message data');
        if (byte >= 0x80) throw midiError('Invalid system message data byte', { track: trackIndex });
      }
      continue;
    }

    const kind = status & 0xf0;
    const channel = status & 0x0f;
    const data1 = readByte(buffer, state, end, 'channel event data');
    if (data1 >= 0x80) throw midiError('Invalid MIDI data byte', { track: trackIndex });
    const twoByte = ![0xc0, 0xd0].includes(kind);
    const data2 = twoByte ? readByte(buffer, state, end, 'channel event data') : 0;
    if (data2 >= 0x80) throw midiError('Invalid MIDI data byte', { track: trackIndex });

    if (kind === 0x90 && data2 > 0) {
      notes.push(Object.freeze({ pitch: data1, velocity: data2, tick, channel, track: trackIndex }));
    }
  }

  return Object.freeze(notes);
}

export function parseMidiFile(input, {
  maxBytes = 10_000_000,
  maxTracks = 256,
  maxEventsPerTrack = 1_000_000
} = {}) {
  const buffer = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (buffer.byteLength > maxBytes) {
    throw new MerzatoResourceError(`MIDI file exceeds ${maxBytes} bytes`, {
      code: 'MIDI_SIZE_LIMIT',
      limit: maxBytes
    });
  }
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (readText(buffer, 0, 4, 'MIDI header') !== 'MThd') throw midiError('Not a Standard MIDI file');
  const headerLength = readUint32(view, buffer, 4, 'MIDI header length');
  if (headerLength < 6) throw midiError(`Invalid MIDI header length ${headerLength}`);
  ensureAvailable(buffer, 8, headerLength, 'MIDI header');
  const format = readUint16(view, buffer, 8, 'MIDI format');
  const trackCount = readUint16(view, buffer, 10, 'MIDI track count');
  const division = readUint16(view, buffer, 12, 'MIDI division');
  if (![0, 1, 2].includes(format)) throw midiError(`Unsupported MIDI format ${format}`);
  if (trackCount === 0) throw midiError('MIDI file contains no tracks');
  if (trackCount > maxTracks) {
    throw new MerzatoResourceError(`MIDI file exceeds ${maxTracks} tracks`, {
      code: 'MIDI_TRACK_LIMIT',
      limit: maxTracks
    });
  }
  if (format === 0 && trackCount !== 1) throw midiError('MIDI format 0 must contain exactly one track');

  let offset = 8 + headerLength;
  const tracks = [];
  for (let trackIndex = 0; trackIndex < trackCount; trackIndex += 1) {
    if (readText(buffer, offset, 4, `track ${trackIndex} header`) !== 'MTrk') {
      throw midiError(`Missing MTrk chunk ${trackIndex}`, { track: trackIndex });
    }
    const length = readUint32(view, buffer, offset + 4, `track ${trackIndex} length`);
    const start = offset + 8;
    const end = start + length;
    ensureAvailable(buffer, start, length, `track ${trackIndex}`);
    tracks.push(parseTrack(buffer, start, end, trackIndex, maxEventsPerTrack));
    offset = end;
  }

  return Object.freeze({ format, division, tracks: Object.freeze(tracks) });
}

export function parseMidiNotes(input, { track = 'first', ...options } = {}) {
  const parsed = parseMidiFile(input, options);
  if (track === 'merge') {
    return Object.freeze(
      parsed.tracks.flat().slice().sort((left, right) =>
        left.tick - right.tick || left.track - right.track
      )
    );
  }
  if (track === 'first') return parsed.tracks.find(notes => notes.length > 0) ?? Object.freeze([]);
  if (!Number.isInteger(track) || track < 0 || track >= parsed.tracks.length) {
    throw new RangeError(`MIDI track index must be between 0 and ${parsed.tracks.length - 1}`);
  }
  return parsed.tracks[track];
}
