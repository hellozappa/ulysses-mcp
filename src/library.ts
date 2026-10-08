/** API response parsing and bounded library traversal; no UI or transport side effects. */
export interface Item {
  identifier: string;
  title: string;
  type: string;
  containers?: Item[];
  sheets?: Item[];
  text?: string;
  keywords?: string[];
  notes?: string[];
  changeToken?: string;
  isMaterial?: boolean;
}

export function callbackValue<T>(response: string, key: string): T {
  const data = JSON.parse(response);
  const value = data[key];
  if (value === undefined) throw new Error(`Ulysses callback omitted ${key}`);
  // The helper already URL-decodes query parameters. Never decode them a second time.
  return typeof value === "string" ? JSON.parse(value) : value;
}

export function walk(items: Item[], includeExtras = true): Item[] {
  const result: Item[] = [];
  const seen = new Set<string>();
  function visit(item: Item) {
    if (!item.identifier || seen.has(item.identifier)) return;
    seen.add(item.identifier);
    if (!includeExtras && item.type === "projectExtras") return;
    result.push(item);
    for (const child of item.containers ?? []) visit(child);
    for (const child of item.sheets ?? []) visit(child);
  }
  items.forEach(visit);
  return result;
}

export function projectSections(project: Item) {
  if (project.type !== "project") throw new Error("Identifier must refer to an actual Ulysses Project");
  const children = walk(project.containers ?? []);
  return {
    project,
    main: children.filter(x => x.type === "projectMain"),
    extras: children.filter(x => x.type === "projectExtras"),
  };
}

export function requiredString(args: Record<string, unknown>, key: string, allowEmpty = false): string {
  const value = args[key];
  if (typeof value !== "string" || (!allowEmpty && !value.trim())) throw new Error(`${key} must be a string${allowEmpty ? "" : " and cannot be empty"}`);
  return value;
}

export function boundedInteger(value: unknown, fallback: number, min: number, max: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) throw new Error(`Expected an integer from ${min} through ${max}`);
  return value;
}
