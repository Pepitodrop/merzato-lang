const VALID_OPS = new Set([
  'NOP', 'PUSH', 'POP', 'DUP', 'SWAP',
  'ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'NOT', 'CMPGT',
  'LOAD', 'STORE', 'HLOAD', 'HSTORE',
  'JMP', 'JZ', 'JNZ', 'CALL', 'RET',
  'TOSTR', 'CONCAT', 'OUTN', 'OUTC', 'SYS', 'HALT'
]);

function stripComment(line) {
  let quote = null;
  let escaped = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ';') return line.slice(0, i);
  }
  return line;
}

function tokenize(line) {
  const tokens = [];
  const pattern = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s,]+/g;
  for (const match of line.matchAll(pattern)) tokens.push(match[0]);
  return tokens;
}

function parseString(token) {
  if (token.startsWith('"')) return JSON.parse(token);
  const inner = token.slice(1, -1)
    .replace(/\\'/g, "'")
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
  return inner;
}

function parseOperand(token) {
  if (/^r(?:[0-9]|1[0-5])$/i.test(token)) {
    return { type: 'register', index: Number(token.slice(1)) };
  }
  if (/^[+-]?\d+$/.test(token)) return BigInt(token);
  if ((token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'"))) {
    return parseString(token);
  }
  return token;
}

export function assemble(source) {
  const instructions = [];
  const labels = {};
  let entryLabel = null;

  const lines = source.split(/\r?\n/);
  for (let lineNumber = 1; lineNumber <= lines.length; lineNumber += 1) {
    let line = stripComment(lines[lineNumber - 1]).trim();
    if (!line) continue;

    if (line.startsWith('.entry')) {
      const [, name] = tokenize(line);
      if (!name) throw new SyntaxError(`Missing .entry label on line ${lineNumber}`);
      entryLabel = name;
      continue;
    }

    const labelMatch = line.match(/^([A-Za-z_][\w.-]*):/);
    if (labelMatch) {
      const label = labelMatch[1];
      if (Object.hasOwn(labels, label)) {
        throw new SyntaxError(`Duplicate label '${label}' on line ${lineNumber}`);
      }
      labels[label] = instructions.length;
      line = line.slice(labelMatch[0].length).trim();
      if (!line) continue;
    }

    const tokens = tokenize(line);
    if (tokens.length === 0) continue;
    let op = tokens.shift().toUpperCase();
    if (op === 'MERZ') op = 'SYS';
    if (!VALID_OPS.has(op)) {
      throw new SyntaxError(`Unknown instruction '${op}' on line ${lineNumber}`);
    }

    instructions.push({
      op,
      args: tokens.map(parseOperand),
      line: lineNumber
    });
  }

  const entry = entryLabel === null ? 0 : labels[entryLabel];
  if (entryLabel !== null && entry === undefined) {
    throw new SyntaxError(`Unknown entry label '${entryLabel}'`);
  }

  return { instructions, labels, entry, sourceType: 'assembly' };
}
