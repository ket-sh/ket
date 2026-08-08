type Answers<Row> = (row: Row) => boolean;

export function narrowedRows<Row>(
  rows: Row[],
  query: string,
  answersOf: (token: string) => Answers<Row>,
): Row[] {
  const asked = query
    .toLowerCase()
    .split(/\s+/u)
    .filter((token) => token !== '')
    .map((token) => answersOf(token));

  if (asked.length === 0) {
    return rows;
  }

  return rows.filter((row) => asked.every((answers) => answers(row)));
}
