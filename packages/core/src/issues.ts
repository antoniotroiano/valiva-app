import type { ValidationIssue } from './types';

export type Range = { min?: number; max?: number };

export class IssueCollector {
  readonly issues: ValidationIssue[] = [];
  finite(field: string, v: number): boolean {
    if (!Number.isFinite(v)) {
      this.issues.push({ field, code: 'not_finite' });
      return false;
    }
    return true;
  }
  integer(field: string, v: number, range: Range): void {
    if (!this.finite(field, v)) return;
    if (!Number.isInteger(v)) this.issues.push({ field, code: 'not_integer' });
    else this.range(field, v, range);
  }
  number(field: string, v: number, range: Range): void {
    if (this.finite(field, v)) this.range(field, v, range);
  }
  range(field: string, v: number, { min, max }: Range): void {
    if ((min !== undefined && v < min) || (max !== undefined && v > max)) {
      this.issues.push({ field, code: 'out_of_range', min, max });
    }
  }
}
