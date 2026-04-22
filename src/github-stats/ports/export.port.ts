export const EXPORT_PORT = Symbol('EXPORT_PORT');

export interface ExportPort {
  toCsv(rows: Record<string, unknown>[]): string;
}
