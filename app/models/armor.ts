import armorsData from "./data/armors.json";

// maxDexBonus: null=上限なし, 数値=敏捷補正の加算上限
export type ArmorDef = {
  name: string;
  baseAC: number;
  maxDexBonus: number | null;
};

export const ARMORS: ArmorDef[] = armorsData as ArmorDef[];

export function findArmor(name: string): ArmorDef {
  const a = ARMORS.find((a) => a.name === name);
  if (!a) throw new Error(`Armor not found: ${name}`);
  return a;
}
