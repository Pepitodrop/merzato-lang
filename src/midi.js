function readVarLen(buffer, state) {
  let value = 0;
  for (let count = 0; count < 4; count += 1) {
    if (state.offset >= buffer.length) throw new Error('Unexpected end of MIDI file');
    const byte = buffer[state.offset++];
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) return value;
  }
  throw new Error('Invalid MIDI variable-length value');
}

export function parseMidiNotes(input) {
  const buffer = input instanceof Uint8Array ? input : new Uint8Array(input);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const text = (offset, length) => String.fromCharCode(...buffer.slice(offset, offset + length));
  if (text(0, 4) !== 'MThd') throw new Error('Not a Standard MIDI file');
  const headerLength = view.getUint32(4);
  const trackCount = view.getUint16(10);
  let offset = 8 + headerLength;
  const allTracks = [];

  for (let trackIndex = 0; trackIndex < trackCount; trackIndex += 1) {
    if (text(offset, 4) !== 'MTrk') throw new Error(`Missing MTrk chunk ${trackIndex}`);
    const length = view.getUint32(offset + 4);
    const end = offset + 8 + length;
    const state = { offset: offset + 8 };
    let runningStatus = null;
    let tick = 0;
    const notes = [];

    while (state.offset < end) {
      tick += readVarLen(buffer, state);
      let status = buffer[state.offset++];
      if (status < 0x80) {
        if (runningStatus === null) throw new Error('Invalid MIDI running status');
        state.offset -= 1;
        status = runningStatus;
      } else if (status < 0xf0) {
        runningStatus = status;
      }

      if (status === 0xff) {
        state.offset += 1;
        const metaLength = readVarLen(buffer, state);
        state.offset += metaLength;
        continue;
      }
      if (status === 0xf0 || status === 0xf7) {
        const sysexLength = readVarLen(buffer, state);
        state.offset += sysexLength;
        continue;
      }

      const kind = status & 0xf0;
      const channel = status & 0x0f;
      const data1 = buffer[state.offset++];
      const twoByte = ![0xc0, 0xd0].includes(kind);
      const data2 = twoByte ? buffer[state.offset++] : 0;
      if (kind === 0x90 && data2 > 0) {
        notes.push({ pitch: data1, velocity: data2, tick, channel });
      }
    }

    allTracks.push(notes);
    offset = end;
  }

  return allTracks.find(track => track.length > 0) ?? [];
}
