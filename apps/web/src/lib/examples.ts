/** Invented example workspaces from `examples/` (`12` §6); loaded lazily as text. */
const files = import.meta.glob('../../../../examples/*.workspace.json', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

export type ExampleId = string;

export function exampleIds(): ExampleId[] {
  return Object.keys(files)
    .map((path) => /([^/]+)\.workspace\.json$/.exec(path)?.[1] ?? '')
    .filter((id) => id !== '')
    .sort();
}

export async function loadExample(id: ExampleId): Promise<string | undefined> {
  const entry = Object.entries(files).find(([path]) => path.endsWith(`/${id}.workspace.json`));
  return entry?.[1]();
}
