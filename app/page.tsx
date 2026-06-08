"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  Container,
  Card,
  CardContent,
  Box,
  Chip,
  Divider,
  Snackbar,
  Alert,
  Paper,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { type ClassDef, CLASSES } from "./models/class";
import { ATTACK_STAT_INDEX } from "./models/weapon";
import { type SpellSelection, selectSpells, hasSpells } from "./models/spell";

// ========== データ定義 ==========

type BackgroundDef = {
  name: string;
  statIndices: number[]; // 対応する能力値のインデックス（重複あり選択元）
  feat: string;
};

const RACES = [
  "エルフ",
  "ゴライアス",
  "ティーフリング",
  "ドラゴンボーン",
  "ドワーフ",
  "ノーム",
  "ハーフエルフ",
  "ハーフオーク",
  "ハーフリング",
  "ヒューマン",
];

// 背景：statIndicesは対応する3つの能力値インデックス（重複あり選択元）
const BACKGROUNDS: BackgroundDef[] = [
  {
    name: "侍祭",
    statIndices: [3, 4, 5],
    feat: "《魔法の嗜み（クレリック）》",
  },
  { name: "犯罪者", statIndices: [1, 2, 3], feat: "《警戒》" },
  {
    name: "賢者",
    statIndices: [2, 3, 4],
    feat: "《魔法の嗜み（ウィザード）》",
  },
  { name: "兵士", statIndices: [0, 1, 2], feat: "《凶暴な戦士》" },
];

const STAT_LABELS = ["筋力", "敏捷", "耐久", "知力", "判断", "魅力"] as const;

// ========== ユーティリティ ==========

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function modifier(stat: number): number {
  return Math.floor((stat - 10) / 2);
}

function modifierStr(stat: number): string {
  const m = modifier(stat);
  return m >= 0 ? `+${m}` : `${m}`;
}

// AC = 防具基本値 + min(敏捷補正, maxDexBonus) + シールド +2
// バーバリアン・モンクはさらに判断補正を加算
function calcAC(cls: ClassDef, effectiveStats: number[]): number {
  const dexMod = modifier(effectiveStats[1]);
  const wisMod = modifier(effectiveStats[4]);
  const dexBonus =
    cls.armor.maxDexBonus === null
      ? dexMod
      : Math.min(dexMod, cls.armor.maxDexBonus);

  let ac = cls.armor.baseAC + dexBonus;
  if (cls.hasShield) ac += 2;
  if (cls.name === "バーバリアン" || cls.name === "モンク") ac += wisMod;
  return ac;
}

// ========== 型定義 ==========

type Character = {
  cls: ClassDef;
  race: string;
  background: BackgroundDef;
  bgStatBonuses: number[]; // 長さ6、各能力値への背景ボーナス
  spells: SpellSelection;
};

type CharacterJSON = {
  kind: "character";
  data: {
    name: string;
    memo: string;
    initiative: number;
    status: { label: string; value: number; max: number }[];
    params: { label: string; value: string }[];
    commands: string;
  };
};

// ========== キャラクター生成 ==========

function generateCharacter(): Character {
  const cls = randomPick(CLASSES);
  const race = randomPick(RACES);
  const background = randomPick(BACKGROUNDS);

  // 背景の対応能力値から重複ありで3回選び、+1ずつ加算
  const bgStatBonuses = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const statIdx = randomPick(background.statIndices);
    bgStatBonuses[statIdx]++;
  }

  const spells = selectSpells(cls.name, background.feat);

  return { cls, race, background, bgStatBonuses, spells };
}

function buildMemo(
  race: string,
  className: string,
  feat: string,
  spells: SpellSelection,
): string {
  const lines = [`${race}/${className}`, feat];
  if (spells.invocations.length > 0) {
    lines.push(`妖術：${spells.invocations.join("、")}`);
  }
  if (spells.cantrips.length > 0) {
    lines.push(`初級呪文：${spells.cantrips.join("、")}`);
  }
  if (spells.level1.length > 0) {
    lines.push(`１レベル呪文：${spells.level1.join("、")}`);
  }
  return lines.join("\n");
}

function buildJSON(char: Character): CharacterJSON {
  const { cls, race, background, bgStatBonuses, spells } = char;
  const effectiveStats = cls.stats.map((s, i) => s + bgStatBonuses[i]);

  const dex = effectiveStats[1];
  const attackStatIdx = ATTACK_STAT_INDEX[cls.weapon.attackType];
  const modStatLabel = `${STAT_LABELS[attackStatIdx]}補正`;

  const ac = calcAC(cls, effectiveStats);
  const hp = cls.hp + modifier(effectiveStats[2]); // 耐久補正を加算

  const commands = [
    `1d20+{${modStatLabel}}+2 ${cls.weapon.name}[${cls.weapon.attackType}]命中`,
    `${cls.weapon.damageDie}+{${modStatLabel}} ダメージ`,
  ].join("\n");

  // 能力値＋補正をparamsに追加
  const params = [
    ...STAT_LABELS.map((label, i) => ({
      label,
      value: String(effectiveStats[i]),
    })),
    ...STAT_LABELS.map((label, i) => ({
      label: `${label}補正`,
      value: modifierStr(effectiveStats[i]),
    })),
  ];

  return {
    kind: "character",
    data: {
      name: "player1",
      memo: buildMemo(race, cls.name, background.feat, spells),
      initiative: modifier(dex),
      status: [
        { label: "hp", value: hp, max: hp },
        { label: "AC", value: ac, max: ac },
        { label: "move", value: 6, max: 6 },
      ],
      params,
      commands,
    },
  };
}

// ========== コンポーネント ==========

function StatBox({
  label,
  value,
  bonus = 0,
}: {
  label: string;
  value: number;
  bonus?: number;
}) {
  const mod = modifier(value);
  const modStr = mod >= 0 ? `+${mod}` : `${mod}`;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        textAlign: "center",
        borderRadius: 2,
        minWidth: 72,
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="h6" fontWeight="bold" lineHeight={1.2}>
        {value}
        {bonus > 0 && (
          <Typography component="span" variant="caption" color="success.main">
            {" "}
            (+{bonus})
          </Typography>
        )}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {modStr}
      </Typography>
    </Paper>
  );
}

function StatusChip({ label, value }: { label: string; value: number }) {
  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="h5" fontWeight="bold">
        {value}
      </Typography>
    </Box>
  );
}

// ========== メインページ ==========

export default function Home() {
  const [character, setCharacter] = useState<Character | null>(null);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState("");
  const [snackSeverity, setSnackSeverity] = useState<"success" | "error">(
    "success",
  );

  const handleGenerate = useCallback(() => {
    setCharacter(generateCharacter());
  }, []);

  useEffect(() => {
    handleGenerate();
  }, [handleGenerate]);

  const handleCopy = async () => {
    if (!character) return;
    try {
      const json = buildJSON(character);
      await navigator.clipboard.writeText(JSON.stringify(json, null, 2));
      setSnackMessage("クリップボードにコピーしました");
      setSnackSeverity("success");
    } catch {
      setSnackMessage("コピーに失敗しました");
      setSnackSeverity("error");
    }
    setSnackOpen(true);
  };

  if (!character) return null;

  const { cls, race, background, bgStatBonuses, spells } = character;
  const json = buildJSON(character);
  const effectiveStats = cls.stats.map((s, i) => s + bgStatBonuses[i]);
  const ac = calcAC(cls, effectiveStats);
  const hp = cls.hp + modifier(effectiveStats[2]); // 耐久補正を加算

  // 背景ボーナスの表示テキスト生成
  const bonusText = STAT_LABELS.map((label, i) =>
    bgStatBonuses[i] > 0 ? `${label}+${bgStatBonuses[i]}` : null,
  )
    .filter(Boolean)
    .join("、");

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            キャラクター生成
          </Typography>
          <Tooltip title="再生成">
            <IconButton color="inherit" onClick={handleGenerate} sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="JSONをコピー">
            <IconButton color="inherit" onClick={handleCopy}>
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Card elevation={3}>
          <CardContent>
            {/* クラス・種族・背景 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {cls.name}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Chip
                  label={race}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
                <Chip
                  label={background.name}
                  color="secondary"
                  variant="outlined"
                  size="small"
                />
              </Box>
            </Box>

            {/* ステータス */}
            <Box
              sx={{ display: "flex", justifyContent: "space-around", mb: 2 }}
            >
              <StatusChip label="HP" value={hp} />
              <StatusChip label="AC" value={ac} />
              <StatusChip label="移動" value={6} />
              <StatusChip
                label="イニシアチブ"
                value={modifier(effectiveStats[1])}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* パラメータ */}
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              能力値
            </Typography>
            {bonusText && (
              <Typography
                variant="caption"
                color="success.main"
                display="block"
                sx={{ mb: 1 }}
              >
                背景ボーナス：{bonusText}
              </Typography>
            )}
            <Grid container spacing={1}>
              {STAT_LABELS.map((label, i) => (
                <Grid size={4} key={label}>
                  <StatBox
                    label={label}
                    value={effectiveStats[i]}
                    bonus={bgStatBonuses[i]}
                  />
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* 武器・防具 */}
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              武器・防具
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 1 }}>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  武器
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {cls.weapon.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {cls.weapon.attackType}・{cls.weapon.damageDie}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  防具
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {cls.armor.name}
                  {cls.hasShield ? "＋シールド" : ""}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  AC {ac}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* 特技 */}
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                特技
              </Typography>
              <Typography variant="body2">{background.feat}</Typography>
            </Box>

            {hasSpells(spells) && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    呪文
                  </Typography>
                  {spells.invocations.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        妖術
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
                        {spells.invocations.map((s) => (
                          <Chip key={s} label={s} size="small" color="warning" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {spells.cantrips.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        初級呪文
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
                        {spells.cantrips.map((s) => (
                          <Chip key={s} label={s} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {spells.level1.length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        １レベル呪文
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
                        {spells.level1.map((s) => (
                          <Chip key={s} label={s} size="small" color="primary" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </>
            )}

            <Divider sx={{ my: 2 }} />

            {/* コマンド */}
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              コマンド
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                fontFamily: "monospace",
                fontSize: "0.85rem",
                whiteSpace: "pre",
                borderRadius: 1,
              }}
            >
              {json.data.commands}
            </Paper>
          </CardContent>
        </Card>
      </Container>

      <Snackbar
        open={snackOpen}
        autoHideDuration={2500}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity={snackSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
