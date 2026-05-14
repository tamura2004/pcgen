import weaponsData from "./data/weapons.json";

export type WeaponDef = {
  name: string;
  attackType: "近接攻撃" | "遠隔攻撃" | "軽量攻撃";
  damageDie: string;
};

// 攻撃種別→使用する能力値インデックス（近接:筋力0, 遠隔・軽量:敏捷1）
export const ATTACK_STAT_INDEX: Record<"近接攻撃" | "遠隔攻撃" | "軽量攻撃", number> = {
  近接攻撃: 0,
  遠隔攻撃: 1,
  軽量攻撃: 1,
};

export const WEAPONS: WeaponDef[] = weaponsData as WeaponDef[];

export function findWeapon(name: string): WeaponDef {
  const w = WEAPONS.find((w) => w.name === name);
  if (!w) throw new Error(`Weapon not found: ${name}`);
  return w;
}
