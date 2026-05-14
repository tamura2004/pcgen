import classesData from "./data/classes.json";
import { type ArmorDef, findArmor } from "./armor";
import { type WeaponDef, findWeapon } from "./weapon";

export type ClassDef = {
  name: string;
  stats: [number, number, number, number, number, number]; // 筋力,敏捷,耐久,知力,判断,魅力
  hp: number;
  weapon: WeaponDef;
  armor: ArmorDef;
  hasShield: boolean;
};

type ClassRawData = {
  name: string;
  stats: number[];
  hp: number;
  weaponName: string;
  armorName: string;
  hasShield: boolean;
};

export const CLASSES: ClassDef[] = (classesData as ClassRawData[]).map((c) => ({
  name: c.name,
  stats: c.stats as [number, number, number, number, number, number],
  hp: c.hp,
  weapon: findWeapon(c.weaponName),
  armor: findArmor(c.armorName),
  hasShield: c.hasShield,
}));
