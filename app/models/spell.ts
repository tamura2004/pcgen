import spellsData from "./data/spells.json";

export type SpellSelection = {
  invocations: string[];
  cantrips: string[];
  level1: string[];
};

type SpellCount = {
  invocations: number;
  cantrips: number;
  level1: number;
};

type SpellData = {
  invocations?: string[];
  cantrips: string[];
  level1: string[];
};

const SPELL_COUNTS: Record<string, SpellCount> = {
  ウィザード: { invocations: 0, cantrips: 3, level1: 6 },
  ウォーロック: { invocations: 1, cantrips: 2, level1: 2 },
  クレリック: { invocations: 0, cantrips: 3, level1: 3 },
  ソーサラー: { invocations: 0, cantrips: 4, level1: 2 },
  ドルイド: { invocations: 0, cantrips: 2, level1: 4 },
  バード: { invocations: 0, cantrips: 2, level1: 4 },
  パラディン: { invocations: 0, cantrips: 0, level1: 2 },
  レンジャー: { invocations: 0, cantrips: 0, level1: 2 },
};

function pickUnique<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

export function selectSpells(className: string, feat: string): SpellSelection {
  const counts = SPELL_COUNTS[className] ?? { invocations: 0, cantrips: 0, level1: 0 };
  const data = (spellsData as Record<string, SpellData>)[className];

  const result: SpellSelection = {
    invocations: data ? pickUnique(data.invocations ?? [], counts.invocations) : [],
    cantrips: data ? pickUnique(data.cantrips, counts.cantrips) : [],
    level1: data ? pickUnique(data.level1, counts.level1) : [],
  };

  // 魔法の嗜み特技による追加呪文
  const match = feat.match(/魔法の嗜み（(.+)）/);
  if (match) {
    const featClass = match[1];
    const featData = (spellsData as Record<string, SpellData>)[featClass];
    if (featData) {
      const extraCantrips = pickUnique(
        featData.cantrips.filter((s) => !result.cantrips.includes(s)),
        2,
      );
      const extraLevel1 = pickUnique(
        featData.level1.filter((s) => !result.level1.includes(s)),
        1,
      );
      result.cantrips.push(...extraCantrips);
      result.level1.push(...extraLevel1);
    }
  }

  return result;
}

export function hasSpells(spells: SpellSelection): boolean {
  return (
    spells.invocations.length > 0 ||
    spells.cantrips.length > 0 ||
    spells.level1.length > 0
  );
}
