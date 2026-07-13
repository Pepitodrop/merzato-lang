const PALETTE = new Map([
  ['#FFC0C0', [0, 0]], ['#FFFFC0', [1, 0]], ['#C0FFC0', [2, 0]],
  ['#C0FFFF', [3, 0]], ['#C0C0FF', [4, 0]], ['#FFC0FF', [5, 0]],
  ['#FF0000', [0, 1]], ['#FFFF00', [1, 1]], ['#00FF00', [2, 1]],
  ['#00FFFF', [3, 1]], ['#0000FF', [4, 1]], ['#FF00FF', [5, 1]],
  ['#C00000', [0, 2]], ['#C0C000', [1, 2]], ['#00C000', [2, 2]],
  ['#00C0C0', [3, 2]], ['#0000C0', [4, 2]], ['#C000C0', [5, 2]]
]);

const TRANSITIONS = [
  ['NOP', 'PUSH', 'POP'],
  ['ADD', 'SUB', 'MUL'],
  ['DIV', 'MOD', 'NOT'],
  ['CMPGT', 'JMP', 'JZ'],
  ['DUP', 'LOAD', 'STORE'],
  ['SYS', 'OUTN', 'OUTC']
];

function decodeEntities(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function attributes(tag) {
  const result = {};
  const pattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const match of tag.matchAll(pattern)) {
    result[match[1]] = decodeEntities(match[2] ?? match[3] ?? '');
  }
  return result;
}

function parseJsonArgs(raw, order) {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) throw new Error('must be a JSON array');
    return value.map(item => typeof item === 'number' && Number.isInteger(item) ? BigInt(item) : item);
  } catch (error) {
    throw new SyntaxError(`Invalid data-args on art block ${order}: ${error.message}`);
  }
}

function blockValue(block) {
  if (block.attrs['data-value'] !== undefined) return BigInt(block.attrs['data-value']);
  if (block.attrs['data-codels'] !== undefined) return BigInt(block.attrs['data-codels']);
  const width = Number(block.attrs.width ?? 1);
  const height = Number(block.attrs.height ?? 1);
  const codelSize = Number(block.attrs['data-codel-size'] ?? 1);
  const area = Math.max(1, Math.round((width / codelSize) * (height / codelSize)));
  return BigInt(area);
}

function registerFromNotes(source, destination) {
  const interval = destination.note - source.note;
  return { type: 'register', index: ((interval % 16) + 16) % 16 };
}

export function compileArtSvg(svgSource, { midiNotes = [] } = {}) {
  const rectTags = [...svgSource.matchAll(/<rect\b[^>]*>/gi)].map(match => match[0]);
  const blocks = rectTags
    .map(tag => attributes(tag))
    .filter(attrs => attrs['data-order'] !== undefined)
    .map(attrs => {
      const order = Number(attrs['data-order']);
      const fill = String(attrs.fill ?? '').toUpperCase();
      const colour = PALETTE.get(fill);
      if (!colour) throw new SyntaxError(`Art block ${order} uses unsupported Piet colour '${fill}'`);
      return { attrs, order, colour, note: 60 };
    })
    .sort((a, b) => a.order - b.order);

  blocks.forEach((block, index) => {
    const midiNote = midiNotes[index]?.pitch;
    block.note = Number(midiNote ?? block.attrs['data-note'] ?? 60);
    if (!Number.isInteger(block.note)) {
      throw new SyntaxError(`Art block ${block.order} has an invalid note`);
    }
  });

  if (blocks.length < 2) throw new SyntaxError('A Merzato artwork needs at least two ordered colour blocks');
  if (midiNotes.length > 0 && midiNotes.length < blocks.length) {
    throw new SyntaxError(`MIDI score has ${midiNotes.length} notes, but the artwork has ${blocks.length} blocks`);
  }

  const instructions = [];
  const labels = {};
  const score = blocks.map(block => ({ order: block.order, note: block.note }));

  for (let i = 0; i < blocks.length - 1; i += 1) {
    const source = blocks[i];
    const destination = blocks[i + 1];
    const label = destination.attrs['data-label'];
    if (label) labels[label] = instructions.length;

    const hueDelta = (destination.colour[0] - source.colour[0] + 6) % 6;
    const lightDelta = (destination.colour[1] - source.colour[1] + 3) % 3;
    const op = TRANSITIONS[hueDelta][lightDelta];

    if (op === 'SYS') {
      for (const arg of parseJsonArgs(destination.attrs['data-args'], destination.order)) {
        instructions.push({ op: 'PUSH', args: [arg], artOrder: destination.order });
      }
      const phrase = destination.attrs['data-merz'];
      if (!phrase) throw new SyntaxError(`SYS transition into block ${destination.order} needs data-merz`);
      instructions.push({ op: 'SYS', args: [phrase], artOrder: destination.order });
      if (destination.attrs['data-store']) {
        const register = destination.attrs['data-store'];
        if (!/^r(?:[0-9]|1[0-5])$/i.test(register)) {
          throw new SyntaxError(`Invalid data-store register '${register}'`);
        }
        instructions.push({ op: 'STORE', args: [{ type: 'register', index: Number(register.slice(1)) }] });
      }
      continue;
    }

    if (op === 'PUSH') {
      instructions.push({ op, args: [blockValue(source)], artOrder: destination.order });
      continue;
    }
    if (op === 'LOAD' || op === 'STORE') {
      instructions.push({ op, args: [registerFromNotes(source, destination)], artOrder: destination.order });
      continue;
    }
    if (op === 'JMP' || op === 'JZ') {
      const target = destination.attrs['data-target'];
      if (!target) throw new SyntaxError(`${op} transition into block ${destination.order} needs data-target`);
      instructions.push({ op, args: [target], artOrder: destination.order });
      continue;
    }

    instructions.push({ op, args: [], artOrder: destination.order });
  }

  instructions.push({ op: 'HALT', args: [] });
  return { instructions, labels, entry: 0, sourceType: 'svg-art', score };
}

export { PALETTE, TRANSITIONS };
