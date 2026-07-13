import { MerzatoSyntaxError } from './errors.js';
import { validateProgram } from './validator.js';

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

function syntax(message, details = {}) {
  return new MerzatoSyntaxError(message, { code: 'INVALID_ARTWORK', ...details });
}

function decodeEntities(value) {
  const decoded = value.replace(/&(?:quot|apos|lt|gt|amp|#\d+|#x[0-9a-fA-F]+);/g, entity => {
    const named = {
      '&quot;': '"',
      '&apos;': "'",
      '&lt;': '<',
      '&gt;': '>',
      '&amp;': '&'
    };
    if (named[entity]) return named[entity];
    const hex = entity.startsWith('&#x');
    const raw = entity.slice(hex ? 3 : 2, -1);
    const codePoint = Number.parseInt(raw, hex ? 16 : 10);
    if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
      throw syntax(`Invalid XML entity '${entity}'`);
    }
    return String.fromCodePoint(codePoint);
  });
  if (/&[A-Za-z#][^;]*;/.test(decoded)) {
    throw syntax('Unknown or unsupported XML entity in executable SVG attribute');
  }
  return decoded;
}

function extractStartTags(source, localName) {
  const tags = [];
  let index = 0;
  while (index < source.length) {
    const open = source.indexOf('<', index);
    if (open === -1) break;
    index = open + 1;
    if (source.startsWith('!--', index)) {
      const end = source.indexOf('-->', index + 3);
      if (end === -1) throw syntax('Unterminated SVG comment');
      index = end + 3;
      continue;
    }
    if (source[index] === '?') {
      const end = source.indexOf('?>', index + 1);
      if (end === -1) throw syntax('Unterminated SVG processing instruction');
      index = end + 2;
      continue;
    }
    if (source.startsWith('![CDATA[', index)) {
      const end = source.indexOf(']]>', index + 8);
      if (end === -1) throw syntax('Unterminated SVG CDATA section');
      index = end + 3;
      continue;
    }
    if (source[index] === '!') {
      const end = source.indexOf('>', index + 1);
      if (end === -1) throw syntax('Unterminated SVG declaration');
      index = end + 1;
      continue;
    }
    if (source[index] === '/') continue;

    const nameMatch = source.slice(index).match(/^([A-Za-z_][\w:.-]*)/);
    if (!nameMatch) continue;
    const name = nameMatch[1].split(':').at(-1).toLowerCase();
    let cursor = index + nameMatch[1].length;
    let quote = null;
    let escaped = false;
    while (cursor < source.length) {
      const char = source[cursor];
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (quote) {
        if (char === quote) quote = null;
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '>') {
        break;
      }
      cursor += 1;
    }
    if (cursor >= source.length) throw syntax('Unterminated SVG start tag');
    if (name === localName) tags.push(source.slice(open, cursor + 1));
    index = cursor + 1;
  }
  return tags;
}

function attributes(tag) {
  const result = Object.create(null);
  const tagNameEnd = tag.search(/[\s/>]/);
  let index = tagNameEnd;
  while (index < tag.length - 1) {
    while (index < tag.length && /[\s/]/.test(tag[index])) index += 1;
    if (tag[index] === '>' || index >= tag.length - 1) break;
    const nameMatch = tag.slice(index).match(/^([:\w.-]+)/);
    if (!nameMatch) throw syntax(`Invalid attribute syntax near '${tag.slice(index, index + 20)}'`);
    const name = nameMatch[1];
    index += name.length;
    while (/\s/.test(tag[index])) index += 1;
    if (tag[index] !== '=') throw syntax(`Attribute '${name}' must have a value`);
    index += 1;
    while (/\s/.test(tag[index])) index += 1;
    const quote = tag[index];
    if (quote !== '"' && quote !== "'") throw syntax(`Attribute '${name}' must be quoted`);
    index += 1;
    const start = index;
    while (index < tag.length && tag[index] !== quote) index += 1;
    if (index >= tag.length) throw syntax(`Unterminated attribute '${name}'`);
    if (Object.hasOwn(result, name)) throw syntax(`Duplicate attribute '${name}'`);
    result[name] = decodeEntities(tag.slice(start, index));
    index += 1;
  }
  return result;
}

function parseInteger(raw, name, order, { min = undefined, max = undefined } = {}) {
  if (!/^[+-]?\d+$/.test(String(raw))) {
    throw syntax(`Art block ${order} has invalid ${name} '${raw}'`, { artOrder: order });
  }
  const value = BigInt(raw);
  if (min !== undefined && value < BigInt(min)) {
    throw syntax(`Art block ${order} has ${name} below ${min}`, { artOrder: order });
  }
  if (max !== undefined && value > BigInt(max)) {
    throw syntax(`Art block ${order} has ${name} above ${max}`, { artOrder: order });
  }
  return value;
}

function parseJsonArgs(raw, order) {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) throw new Error('must be a JSON array');
    return value.map(item => {
      if (typeof item === 'number') {
        if (!Number.isSafeInteger(item)) throw new Error('numbers must be safe integers');
        return BigInt(item);
      }
      if (typeof item === 'string' || typeof item === 'boolean' || item === null) return item;
      throw new Error('arguments must be strings, booleans, null, or integers');
    });
  } catch (error) {
    throw syntax(`Invalid data-args on art block ${order}: ${error.message}`, {
      artOrder: order,
      cause: error
    });
  }
}

function blockValue(block) {
  if (block.attrs['data-value'] !== undefined) {
    return parseInteger(block.attrs['data-value'], 'data-value', block.order);
  }
  if (block.attrs['data-codels'] !== undefined) {
    return parseInteger(block.attrs['data-codels'], 'data-codels', block.order, { min: 1 });
  }
  const width = Number(block.attrs.width ?? 1);
  const height = Number(block.attrs.height ?? 1);
  const codelSize = Number(block.attrs['data-codel-size'] ?? 1);
  if (![width, height, codelSize].every(Number.isFinite) || width <= 0 || height <= 0 || codelSize <= 0) {
    throw syntax(`Art block ${block.order} has invalid dimensions`, { artOrder: block.order });
  }
  const area = Math.max(1, Math.round((width / codelSize) * (height / codelSize)));
  if (!Number.isSafeInteger(area)) {
    throw syntax(`Art block ${block.order} codel area is too large`, { artOrder: block.order });
  }
  return BigInt(area);
}

function registerFromNotes(source, destination) {
  const interval = destination.note - source.note;
  return { type: 'register', index: ((interval % 16) + 16) % 16 };
}

function validateLabel(label, order) {
  if (!/^[A-Za-z_][\w.-]*$/.test(label)) {
    throw syntax(`Art block ${order} has invalid label '${label}'`, { artOrder: order });
  }
}

export function compileArtSvg(svgSource, {
  midiNotes = [],
  filename = '<artwork>',
  maxSourceBytes = 5_000_000,
  maxBlocks = 10_000
} = {}) {
  if (typeof svgSource !== 'string') throw new TypeError('SVG source must be a string');
  if (!Number.isSafeInteger(maxSourceBytes) || maxSourceBytes <= 0) {
    throw new RangeError('maxSourceBytes must be a positive safe integer');
  }
  if (!Number.isSafeInteger(maxBlocks) || maxBlocks <= 0) {
    throw new RangeError('maxBlocks must be a positive safe integer');
  }
  const bytes = new TextEncoder().encode(svgSource).byteLength;
  if (bytes > maxSourceBytes) {
    throw syntax(`SVG source exceeds ${maxSourceBytes} bytes`);
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(svgSource)) {
    throw syntax('DOCTYPE and ENTITY declarations are not allowed in Merzato artwork');
  }
  if (extractStartTags(svgSource, 'svg').length === 0) {
    throw syntax('Merzato artwork must contain an SVG root element');
  }

  const rectTags = extractStartTags(svgSource, 'rect');
  const seenOrders = new Set();
  const blocks = rectTags
    .map(tag => attributes(tag))
    .filter(attrs => attrs['data-order'] !== undefined)
    .map(attrs => {
      const order = Number(attrs['data-order']);
      if (!Number.isSafeInteger(order) || order < 0) {
        throw syntax(`Invalid data-order '${attrs['data-order']}'`);
      }
      if (seenOrders.has(order)) throw syntax(`Duplicate data-order '${order}'`, { artOrder: order });
      seenOrders.add(order);
      const fill = String(attrs.fill ?? '').toUpperCase();
      const colour = PALETTE.get(fill);
      if (!colour) throw syntax(`Art block ${order} uses unsupported Piet colour '${fill}'`, { artOrder: order });
      return { attrs, order, colour, note: 60 };
    })
    .sort((a, b) => a.order - b.order);

  if (blocks.length > maxBlocks) throw syntax(`Artwork exceeds ${maxBlocks} executable blocks`);
  if (blocks.length < 2) throw syntax('A Merzato artwork needs at least two ordered colour blocks');
  if (!Array.isArray(midiNotes)) throw new TypeError('midiNotes must be an array');
  if (midiNotes.length > 0 && midiNotes.length < blocks.length) {
    throw syntax(`MIDI score has ${midiNotes.length} notes, but the artwork has ${blocks.length} blocks`);
  }

  blocks.forEach((block, index) => {
    const midiNote = midiNotes[index]?.pitch;
    block.note = Number(midiNote ?? block.attrs['data-note'] ?? 60);
    if (!Number.isInteger(block.note) || block.note < 0 || block.note > 127) {
      throw syntax(`Art block ${block.order} has invalid MIDI note '${String(block.note)}'`, {
        artOrder: block.order
      });
    }
  });

  const instructions = [];
  const labels = Object.create(null);
  const score = blocks.map(block => Object.freeze({ order: block.order, note: block.note }));

  for (let index = 0; index < blocks.length - 1; index += 1) {
    const source = blocks[index];
    const destination = blocks[index + 1];
    const label = destination.attrs['data-label'];
    if (label) {
      validateLabel(label, destination.order);
      if (Object.hasOwn(labels, label)) {
        throw syntax(`Duplicate art label '${label}'`, { artOrder: destination.order });
      }
      labels[label] = instructions.length;
    }

    const hueDelta = (destination.colour[0] - source.colour[0] + 6) % 6;
    const lightDelta = (destination.colour[1] - source.colour[1] + 3) % 3;
    const op = TRANSITIONS[hueDelta][lightDelta];

    if (op === 'SYS') {
      for (const arg of parseJsonArgs(destination.attrs['data-args'], destination.order)) {
        instructions.push({ op: 'PUSH', args: [arg], artOrder: destination.order });
      }
      const phrase = destination.attrs['data-merz'];
      if (!phrase?.trim()) {
        throw syntax(`SYS transition into block ${destination.order} needs data-merz`, {
          artOrder: destination.order
        });
      }
      instructions.push({ op: 'SYS', args: [phrase], artOrder: destination.order });
      if (destination.attrs['data-store']) {
        const register = destination.attrs['data-store'];
        if (!/^r(?:[0-9]|1[0-5])$/i.test(register)) {
          throw syntax(`Invalid data-store register '${register}'`, { artOrder: destination.order });
        }
        instructions.push({
          op: 'STORE',
          args: [{ type: 'register', index: Number(register.slice(1)) }],
          artOrder: destination.order
        });
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
      if (!target) {
        throw syntax(`${op} transition into block ${destination.order} needs data-target`, {
          artOrder: destination.order
        });
      }
      instructions.push({ op, args: [target], artOrder: destination.order });
      continue;
    }

    instructions.push({ op, args: [], artOrder: destination.order });
  }

  instructions.push({ op: 'HALT', args: [] });
  const program = {
    instructions,
    labels,
    entry: 0,
    sourceType: 'svg-art',
    filename,
    score: Object.freeze(score)
  };
  return validateProgram(program, { freeze: true });
}

export { PALETTE, TRANSITIONS };
