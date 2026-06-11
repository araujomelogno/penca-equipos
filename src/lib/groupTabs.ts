export interface GroupTabRange {
  label: string;
  groups: string[];
  /** Knockout stage code (e.g. "R32"); when set, the UI translates the label via i18n */
  stage?: string;
}

/** Build group tabs in ranges of 3 (e.g. A-C, D-F) */
export function buildGroupTabs(groups: string[]): GroupTabRange[] {
  const tabs: GroupTabRange[] = [];

  for (let i = 0; i < groups.length; i += 3) {
    const chunk = groups.slice(i, i + 3);
    const label =
      chunk.length === 1
        ? chunk[0]
        : `${chunk[0]}-${chunk[chunk.length - 1]}`;
    tabs.push({ label, groups: chunk });
  }

  return tabs;
}
