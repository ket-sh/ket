import { parse } from 'yaml';

export type YamlSource = { held: unknown } | { refusals: string[] };

export function heldInYaml(source: string, subject: string): YamlSource {
  try {
    const held: unknown = parse(source);

    return { held };
  } catch (cause) {
    return { refusals: [`the ${subject} is not yaml: ${String(cause)}`] };
  }
}
