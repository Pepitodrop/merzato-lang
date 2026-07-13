export type MerzatoValue = bigint | number | string | boolean | null | undefined | object;

export interface RegisterOperand {
  type: 'register';
  index: number;
}

export interface Instruction {
  op: string;
  args: Array<MerzatoValue | RegisterOperand>;
  line?: number;
  artOrder?: number;
}

export interface Program {
  instructions: Instruction[];
  labels: Record<string, number>;
  entry: number;
  sourceType: 'assembly' | 'svg-art' | string;
  filename?: string;
  score?: ReadonlyArray<{ order: number; note: number }>;
}

export interface VMOptions {
  maxSteps?: number;
  maxStackDepth?: number;
  maxCallDepth?: number;
  maxHeapCells?: number;
  maxStringLength?: number;
}

export interface VMRunResult {
  readonly steps: number;
  readonly pc: number;
  readonly halted: boolean;
  readonly stack: readonly MerzatoValue[];
  readonly registers: readonly MerzatoValue[];
  readonly heapSize: number;
}

export interface MerzatoHost {
  output(value: MerzatoValue, mode: 'number' | 'char', vm: MerzatoVM): void | Promise<void>;
  call(name: string, vm: MerzatoVM): void | Promise<void>;
  dispose?(): void;
}

export class MerzatoVM {
  constructor(program: Program, host?: MerzatoHost, options?: VMOptions);
  readonly program: Program;
  readonly host: MerzatoHost;
  readonly registers: MerzatoValue[];
  readonly stack: MerzatoValue[];
  readonly callStack: number[];
  readonly heap: Map<string, MerzatoValue>;
  pc: number;
  halted: boolean;
  running: boolean;
  disposed: boolean;
  readonly runQueue: Promise<unknown>;
  push(value: MerzatoValue): void;
  pop(): MerzatoValue;
  peek(): MerzatoValue;
  step(): Promise<void>;
  run(maxSteps?: number): Promise<VMRunResult>;
  runFrom(label: string | number | bigint, options?: number | { maxSteps?: number; values?: MerzatoValue[] }): Promise<VMRunResult>;
  reset(options?: { clearMemory?: boolean }): void;
  snapshot(steps?: number): VMRunResult;
  dispose(): void;
}

export class ConsoleHost implements MerzatoHost {
  constructor(options?: { write?: boolean; output?: { write(text: string): unknown } });
  outputText: string;
  output(value: MerzatoValue, mode: 'number' | 'char'): void;
  call(name: string, vm: MerzatoVM): Promise<void>;
}

export interface BrowserCapabilities {
  dom?: boolean;
  events?: boolean;
  style?: boolean;
  log?: boolean;
  network?: boolean;
  prompt?: boolean;
}

export class BrowserHost implements MerzatoHost {
  constructor(options?: {
    root?: Element;
    consoleElement?: Element | null;
    documentRef?: Document;
    windowRef?: Window;
    fetchImpl?: typeof fetch;
    capabilities?: BrowserCapabilities;
    allowedOrigins?: string[];
    requestTimeoutMs?: number;
    maxResponseBytes?: number;
  });
  outputText: string;
  output(value: MerzatoValue, mode: 'number' | 'char'): void;
  call(name: string, vm: MerzatoVM): Promise<void>;
  dispose(): void;
}

export function assemble(source: string, options?: { filename?: string }): Program;
export function compileArtSvg(source: string, options?: {
  midiNotes?: MidiNote[];
  filename?: string;
  maxSourceBytes?: number;
  maxBlocks?: number;
}): Program;
export function validateProgram(program: Program, options?: { freeze?: boolean }): Program;

export interface MidiNote {
  readonly pitch: number;
  readonly velocity: number;
  readonly tick: number;
  readonly channel: number;
  readonly track: number;
}

export interface MidiFile {
  readonly format: number;
  readonly division: number;
  readonly tracks: ReadonlyArray<ReadonlyArray<MidiNote>>;
}

export function parseMidiFile(input: ArrayBuffer | Uint8Array, options?: {
  maxBytes?: number;
  maxTracks?: number;
  maxEventsPerTrack?: number;
}): MidiFile;
export function parseMidiNotes(input: ArrayBuffer | Uint8Array, options?: {
  track?: 'first' | 'merge' | number;
  maxBytes?: number;
  maxTracks?: number;
  maxEventsPerTrack?: number;
}): ReadonlyArray<MidiNote>;

export class MerzatoError extends Error { code: string; }
export class MerzatoSyntaxError extends SyntaxError { code: string; line?: number; column?: number; artOrder?: number; }
export class MerzatoValidationError extends MerzatoError {}
export class MerzatoRuntimeError extends MerzatoError { pc?: number; line?: number; artOrder?: number; }
export class MerzatoResourceError extends MerzatoRuntimeError {}

export const VERSION: string;
export const REGISTER_COUNT: number;
export const VALID_OPS: Set<string>;
export const INSTRUCTION_SIGNATURES: Readonly<Record<string, readonly string[]>>;
export const DEFAULT_CAPABILITIES: Readonly<Required<BrowserCapabilities>>;
export const PALETTE: Map<string, [number, number]>;
export const TRANSITIONS: string[][];
export function normalizeMerzName(name: unknown): string;
