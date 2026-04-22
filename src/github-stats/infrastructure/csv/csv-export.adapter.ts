import { Injectable } from '@nestjs/common';
import { ExportPort } from '../../ports/export.port';

@Injectable()
export class CsvExportAdapter implements ExportPort {
  toCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) {
      return '';
    }

    const headers = Object.keys(rows[0]);
    const body = rows.map((row) =>
      headers.map((header) => JSON.stringify(row[header] ?? '')).join(','),
    );

    return [headers.join(','), ...body].join('\n');
  }
}
