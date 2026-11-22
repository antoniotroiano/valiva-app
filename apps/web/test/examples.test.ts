import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PERSON_BLOCKS,
  applyWorkspace,
  defaultBlock,
  householdOverview,
  parseWorkspace,
  personContext,
  serializeWorkspace,
} from '@pathwise/core';
import type { PersonBlock } from '@pathwise/core';
import { WORKSPACE_FORMAT } from '../src/appConfig';
import { currentLegal } from '../src/legalConfig';
import { buildPersonProducts } from '../src/personProducts';

const YEAR = new Date().getFullYear();
const dir = join(__dirname, '../../../examples');
const files = readdirSync(dir).filter((f) => f.endsWith('.workspace.json'));

describe('examples/', () => {
  it('has at least three workspaces', () => {
    expect(files.length).toBeGreaterThanOrEqual(3);
  });

  for (const file of files) {
    describe(file, () => {
      const text = readFileSync(join(dir, file), 'utf8');
      const parsed = parseWorkspace(text, YEAR, WORKSPACE_FORMAT);

      it('parses without warnings and is marked synthetic', () => {
        expect(parsed.status).toBe('ok');
        if (parsed.status !== 'ok') return;
        expect(parsed.warnings).toEqual([]);
        expect(parsed.workspace.meta?.synthetic).toBe(true);
      });

      it('is byte-identical after parse and serialize (format golden)', () => {
        if (parsed.status !== 'ok') throw new Error('parse');
        expect(serializeWorkspace(parsed.workspace)).toBe(text);
      });

      it('gives a household overview', () => {
        if (parsed.status !== 'ok') throw new Error('parse');
        const { state, blocks } = applyWorkspace(parsed.workspace);
        const legal = currentLegal();
        if (!legal.ok) throw new Error('legal');
        const productsByPerson: Record<string, ReturnType<typeof buildPersonProducts>> = {};
        for (const person of state.household.persons) {
          const own = blocks[person.id] ?? {};
          const full = Object.fromEntries(
            PERSON_BLOCKS.map((b: PersonBlock) => [b, own[b] ?? defaultBlock(b, YEAR)]),
          ) as Parameters<typeof buildPersonProducts>[0];
          productsByPerson[person.id] = buildPersonProducts(
            full,
            personContext(state.household, person),
            legal,
          );
        }
        const outcome = householdOverview(
          state.household,
          productsByPerson,
          YEAR,
          legal.legal.incomeTax,
        );
        expect(outcome.ok).toBe(true);
      });
    });
  }
});
