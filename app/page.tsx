'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import Grid from '@mui/material/Grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

// ========== データ定義 ==========

type ClassDef = {
  name: string;
  stats: [number, number, number, number, number, number]; // 筋力,敏捷,耐久,知力,判断,魅力
  hp: number;
  primaryStatIndex: number; // 攻撃に使うパラメータのインデックス
  attackDie: string;
  attackLabel: string;
};

const CLASSES: ClassDef[] = [
  { name: 'ウィザード',    stats: [8,  12, 13, 15, 14, 10], hp: 6,  primaryStatIndex: 3, attackDie: '1d6',  attackLabel: '呪文攻撃命中' },
  { name: 'ウォーロック',  stats: [8,  14, 13, 12, 10, 15], hp: 8,  primaryStatIndex: 5, attackDie: '1d10', attackLabel: '呪文攻撃命中' },
  { name: 'クレリック',    stats: [14,  8, 13, 10, 15, 12], hp: 8,  primaryStatIndex: 4, attackDie: '1d8',  attackLabel: '近接攻撃命中' },
  { name: 'ソーサラー',    stats: [10, 13, 14,  8, 12, 15], hp: 6,  primaryStatIndex: 5, attackDie: '1d6',  attackLabel: '呪文攻撃命中' },
  { name: 'ドルイド',      stats: [8,  12, 14, 13, 15, 10], hp: 8,  primaryStatIndex: 4, attackDie: '1d8',  attackLabel: '呪文攻撃命中' },
  { name: 'バード',        stats: [8,  14, 12, 13, 10, 15], hp: 8,  primaryStatIndex: 5, attackDie: '1d8',  attackLabel: '近接攻撃命中' },
  { name: 'バーバリアン',  stats: [15, 13, 14, 10, 12,  8], hp: 12, primaryStatIndex: 0, attackDie: '1d12', attackLabel: '近接攻撃命中' },
  { name: 'パラディン',    stats: [15, 10, 13,  8, 12, 14], hp: 10, primaryStatIndex: 0, attackDie: '1d8',  attackLabel: '近接攻撃命中' },
  { name: 'ファイター',    stats: [15, 14, 13,  8, 10, 12], hp: 10, primaryStatIndex: 0, attackDie: '1d8',  attackLabel: '近接攻撃命中' },
  { name: 'モンク',        stats: [12, 15, 13, 10, 14,  8], hp: 8,  primaryStatIndex: 1, attackDie: '1d6',  attackLabel: '近接攻撃命中' },
  { name: 'レンジャー',    stats: [12, 15, 13,  8, 14, 10], hp: 10, primaryStatIndex: 1, attackDie: '1d8',  attackLabel: '遠隔攻撃命中' },
  { name: 'ローグ',        stats: [12, 15, 13, 14, 10,  8], hp: 8,  primaryStatIndex: 1, attackDie: '1d6',  attackLabel: '近接攻撃命中' },
];

const RACES = [
  'エルフ', 'ゴライアス', 'ティーフリング', 'ドラゴンボーン',
  'ドワーフ', 'ノーム', 'ハーフエルフ', 'ハーフオーク', 'ハーフリング', 'ヒューマン',
];

const BACKGROUNDS = ['兵士', '犯罪者', '賢者', '侍祭'];

const STAT_LABELS = ['筋力', '敏捷', '耐久', '知力', '判断', '魅力'] as const;

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

// ========== 型定義 ==========

type Character = {
  cls: ClassDef;
  race: string;
  background: string;
};

type CharacterJSON = {
  kind: 'character';
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
  return {
    cls: randomPick(CLASSES),
    race: randomPick(RACES),
    background: randomPick(BACKGROUNDS),
  };
}

function buildJSON(char: Character): CharacterJSON {
  const { cls, race } = char;
  const dex = cls.stats[1];
  const primaryStat = cls.stats[cls.primaryStatIndex];
  const modStr = modifierStr(primaryStat);

  const commands = [
    `1d20${modStr}+2 ${cls.attackLabel}`,
    `${cls.attackDie}${modStr} ダメージ`,
  ].join('\n');

  return {
    kind: 'character',
    data: {
      name: 'player1',
      memo: `${race}/${cls.name}`,
      initiative: modifier(dex),
      status: [
        { label: 'hp',   value: cls.hp, max: cls.hp },
        { label: 'AC',   value: 10,     max: 10     },
        { label: 'move', value: 6,      max: 6      },
      ],
      params: STAT_LABELS.map((label, i) => ({
        label,
        value: String(cls.stats[i]),
      })),
      commands,
    },
  };
}

// ========== コンポーネント ==========

function StatBox({ label, value }: { label: string; value: number }) {
  const mod = modifier(value);
  const modStr = mod >= 0 ? `+${mod}` : `${mod}`;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        textAlign: 'center',
        borderRadius: 2,
        minWidth: 72,
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="h6" fontWeight="bold" lineHeight={1.2}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {modStr}
      </Typography>
    </Paper>
  );
}

function StatusChip({ label, value }: { label: string; value: number }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
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
  const [snackMessage, setSnackMessage] = useState('');
  const [snackSeverity, setSnackSeverity] = useState<'success' | 'error'>('success');

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
      setSnackMessage('クリップボードにコピーしました');
      setSnackSeverity('success');
    } catch {
      setSnackMessage('コピーに失敗しました');
      setSnackSeverity('error');
    }
    setSnackOpen(true);
  };

  if (!character) return null;

  const { cls, race, background } = character;
  const json = buildJSON(character);

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
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={race} color="primary" variant="outlined" size="small" />
                <Chip label={background} color="secondary" variant="outlined" size="small" />
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* ステータス */}
            <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2 }}>
              <StatusChip label="HP" value={cls.hp} />
              <StatusChip label="AC" value={10} />
              <StatusChip label="移動" value={6} />
              <StatusChip label="イニシアチブ" value={modifier(cls.stats[1])} />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* パラメータ */}
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              能力値
            </Typography>
            <Grid container spacing={1}>
              {STAT_LABELS.map((label, i) => (
                <Grid size={4} key={label}>
                  <StatBox label={label} value={cls.stats[i]} />
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* コマンド */}
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              コマンド
            </Typography>
            <Paper
              variant="outlined"
              sx={{ p: 1.5, fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre', borderRadius: 1 }}
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity={snackSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
