/**
 * Lightweight Protobuf wire-format parser.
 *
 * Only handles wire types 0 (varint) and 2 (length-delimited),
 * which are sufficient for decoding Cursor's store.db root blobs.
 */

export interface ProtoField {
  fieldNumber: number;
  wireType: number;
  /** Varint value (wire type 0) */
  varint?: number;
  /** Raw bytes value (wire type 2) */
  bytes?: Buffer;
}

/**
 * Read a single varint from buf starting at `offset`.
 * Returns [value, nextOffset].
 */
export function readVarint(buf: Buffer, offset: number): [number, number] {
  let result = 0;
  let shift = 0;
  let pos = offset;

  while (pos < buf.length) {
    const byte = buf[pos];
    pos++;
    result |= (byte & 0x7f) << shift;
    shift += 7;
    if (!(byte & 0x80)) {
      break;
    }
  }

  return [result >>> 0, pos]; // >>> 0 forces unsigned 32-bit
}

/**
 * Parse one protobuf field from buf at `offset`.
 * Returns [field, nextOffset] or null if at end.
 */
export function parseField(buf: Buffer, offset: number): [ProtoField, number] | null {
  if (offset >= buf.length) return null;

  const [tag, afterTag] = readVarint(buf, offset);
  const fieldNumber = tag >>> 3;
  const wireType = tag & 0x07;

  if (wireType === 0) {
    // Varint
    const [value, afterValue] = readVarint(buf, afterTag);
    return [{ fieldNumber, wireType, varint: value }, afterValue];
  }

  if (wireType === 2) {
    // Length-delimited
    const [length, afterLength] = readVarint(buf, afterTag);
    const bytes = buf.subarray(afterLength, afterLength + length);
    return [{ fieldNumber, wireType, bytes }, afterLength + length];
  }

  // Unknown wire type — skip (shouldn't happen for our use case)
  throw new Error(
    `Unsupported protobuf wire type ${wireType} for field ${fieldNumber} at offset ${offset}`,
  );
}

/**
 * Parse all top-level fields from a protobuf-encoded buffer.
 * Returns a Map of fieldNumber → ProtoField[].
 */
export function parseMessage(buf: Buffer): Map<number, ProtoField[]> {
  const fields = new Map<number, ProtoField[]>();
  let offset = 0;

  while (offset < buf.length) {
    const result = parseField(buf, offset);
    if (!result) break;

    const [field, nextOffset] = result;
    const list = fields.get(field.fieldNumber);
    if (list) {
      list.push(field);
    } else {
      fields.set(field.fieldNumber, [field]);
    }
    offset = nextOffset;
  }

  return fields;
}

/**
 * Get the first field value by field number.
 */
export function getField(
  msg: Map<number, ProtoField[]>,
  fieldNumber: number,
): ProtoField | undefined {
  const list = msg.get(fieldNumber);
  return list?.[0];
}

/**
 * Get all field values by field number.
 */
export function getFields(msg: Map<number, ProtoField[]>, fieldNumber: number): ProtoField[] {
  return msg.get(fieldNumber) ?? [];
}

/**
 * Parse a field's bytes value as a nested protobuf message.
 */
export function parseFieldMessage(field: ProtoField): Map<number, ProtoField[]> | null {
  if (!field.bytes) return null;
  return parseMessage(field.bytes);
}

/**
 * Parse a field's bytes value as a UTF-8 string.
 */
export function parseFieldString(field: ProtoField): string | null {
  if (!field.bytes) return null;
  return field.bytes.toString('utf-8');
}

/**
 * Context token category extracted from store.db.
 */
export interface ContextCategory {
  key: string;
  displayName: string;
  tokens: number;
  bytes: number;
}

/**
 * Context stats extracted from a root blob.
 */
export interface ContextStats {
  contextTotalTokens: number;
  contextWindowLimit: number;
  categories: ContextCategory[];
}

/**
 * Parse context stats from a root blob buffer (the protobuf field 5 value).
 *
 * Structure:
 *   field 1 (varint)  → context total tokens
 *   field 2 (varint)  → context window limit
 *   field 3 (message) → inner container (mirror of above, plus categories)
 *     field 1 (varint)  → same total
 *     field 2 (varint)  → same limit
 *     field 3 (repeated message) → each category:
 *       field 1 (string) → internal key
 *       field 2 (string) → display name
 *       field 3 (varint) → token count
 *       field 4 (varint) → byte count
 */
export function parseContextStats(contextData: Buffer): ContextStats | null {
  const outer = parseMessage(contextData);

  const totalField = getField(outer, 1);
  const limitField = getField(outer, 2);
  const innerField = getField(outer, 3);

  if (!totalField || !innerField?.bytes) return null;

  const contextTotalTokens = totalField.varint ?? 0;
  const contextWindowLimit = limitField?.varint ?? 0;

  const inner = parseMessage(innerField.bytes);
  const categoryFields = getFields(inner, 3);

  const categories: ContextCategory[] = [];
  for (const catField of categoryFields) {
    if (!catField.bytes) continue;
    const catMsg = parseMessage(catField.bytes);

    const key = parseFieldString(getField(catMsg, 1)!) ?? '';
    const displayName = parseFieldString(getField(catMsg, 2)!) ?? '';
    const tokens = getField(catMsg, 3)?.varint ?? 0;
    const bytes = getField(catMsg, 4)?.varint ?? 0;

    if (key) {
      categories.push({ key, displayName, tokens, bytes });
    }
  }

  return { contextTotalTokens, contextWindowLimit, categories };
}
