/**
 * Select / stage / VS screens. Canvas primitives only, no image assets.
 */

import { CHARACTERS } from './config.js';
import { CHARACTER_MOVES } from './characters.js';
import { STAGE_BY_ID } from './stages.js';

const VW = 960;
const VH = 540;
const P1 = '#38e8ff';
const P2 = '#ff4fa3';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 4, 18, 0.78)';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function statBar(ctx, x, y, w, label, value, color) {
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '12px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y);
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < value ? color : 'rgba(255,255,255,0.14)';
    ctx.fillRect(x + 42 + i * 22, y - 9, 18, 8);
  }
}

function drawGrid(ctx, state, t) {
  const cols = 4;
  const cellW = 124;
  const cellH = 104;
  const gap = 14;
  const startX = (VW - (cols * cellW + (cols - 1) * gap)) / 2;
  const startY = 148;
  const total = state.roster.length + 1;

  for (let i = 0; i < total; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (cellW + gap);
    const y = startY + row * (cellH + gap + 8);
    const isRandom = i >= state.roster.length;
    const charId = isRandom ? null : state.roster[i];
    const char = charId ? CHARACTERS[charId] : null;
    const moves = charId ? CHARACTER_MOVES[charId] : null;

    const grad = ctx.createLinearGradient(x, y, x, y + cellH);
    if (char) {
      grad.addColorStop(0, char.colors.primary);
      grad.addColorStop(1, char.colors.primaryDark);
    } else {
      grad.addColorStop(0, '#3a3550');
      grad.addColorStop(1, '#191527');
    }
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, cellW, cellH, 12);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    roundRect(ctx, x, y + cellH - 34, cellW, 34, 12);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 21px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillText(char ? char.name : 'RANDOM', x + cellW / 2, y + 34);
    ctx.font = '12px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(char ? char.tagline : '? ? ?', x + cellW / 2, y + 54);
    if (moves) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '11px "Segoe UI", "Microsoft YaHei", sans-serif';
      ctx.fillText('U · ' + moves.role, x + cellW / 2, y + cellH - 12);
    }

    for (const id of ['p1', 'p2']) {
      if (state.cursor[id] === i) {
        ctx.save();
        ctx.strokeStyle = id === 'p1' ? P1 : P2;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.65 + Math.sin(t * 0.12) * 0.25;
        roundRect(ctx, x - 4, y - 4, cellW + 8, cellH + 8, 14);
        ctx.stroke();
        ctx.restore();
      }
      if (state.pick[id] && charId === state.pick[id]) {
        ctx.fillStyle = id === 'p1' ? 'rgba(56,232,255,0.85)' : 'rgba(255,79,163,0.85)';
        ctx.font = 'bold 11px "Segoe UI", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(id.toUpperCase() + ' LOCK', x + cellW - 8, y + 16);
      }
    }
  }
}

function drawPlayerPanel(ctx, state, id, x, y, w, h) {
  const color = id === 'p1' ? P1 : P2;
  panel(ctx, x, y, w, h, color);
  ctx.textAlign = 'left';
  ctx.fillStyle = color;
  ctx.font = 'bold 14px "Segoe UI", sans-serif';
  ctx.fillText(id.toUpperCase(), x + 14, y + 24);

  const pick = state.pick[id];
  if (!pick) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '13px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillText(state.locked[id] ? 'LOCKED' : '选择中…', x + 14, y + 52);
    return;
  }
  const char = CHARACTERS[pick];
  const moves = CHARACTER_MOVES[pick];
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillText(char.name, x + 14, y + 56);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '12px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillText(char.tagline, x + 14, y + 76);
  ctx.fillStyle = color;
  ctx.font = 'bold 12px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillText(moves.role + ' · ' + moves.weapon, x + 14, y + 98);

  const stats = moves.stats;
  statBar(ctx, x + 14, y + 132, w - 28, '速度', stats.speed, color);
  statBar(ctx, x + 14, y + 156, w - 28, '力量', stats.power, color);
  statBar(ctx, x + 14, y + 180, w - 28, '距离', stats.range, color);
  statBar(ctx, x + 14, y + 204, w - 28, '难度', stats.difficulty, color);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '11px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillText('U 远程 · S 必杀 · 超杀', x + 14, y + h - 14);
}

export function drawCharacterSelect(ctx, state, t) {
  const bg = ctx.createLinearGradient(0, 0, 0, VH);
  bg.addColorStop(0, '#0a0618');
  bg.addColorStop(1, '#1a0b2e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VW, VH);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillText('SELECT YOUR FIGHTER', VW / 2, 56);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '13px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillText(state.mode === 'cpu' ? '1P vs CPU · 难度 ' + state.difficulty.toFixed(1) : 'LOCAL 2P', VW / 2, 80);

  drawGrid(ctx, state, t);
  drawPlayerPanel(ctx, state, 'p1', 16, 140, 176, 300);
  drawPlayerPanel(ctx, state, 'p2', VW - 192, 140, 176, 300);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 18px "Segoe UI", sans-serif';
  ctx.fillText(Math.max(0, Math.ceil(state.timer / 60)), VW / 2, 470);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '12px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillText('P1: A/D 选择 · J 确认 · K 返回', VW / 2, 496);
  ctx.fillText('P2: 方向键选择 · 小键盘1 确认 · 小键盘2 返回', VW / 2, 516);
}

export function drawStageSelect(ctx, state, t) {
  const bg = ctx.createLinearGradient(0, 0, 0, VH);
  bg.addColorStop(0, '#07040f');
  bg.addColorStop(1, '#1b0b28');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VW, VH);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillText('SELECT STAGE', VW / 2, 52);

  const chooser = state.stageChooser;
  ctx.fillStyle = chooser === 'p1' ? P1 : P2;
  ctx.font = '13px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillText((chooser === 'p1' ? 'P1' : 'P2') + ' 选择地图' + (state.lastLoser ? ' · 上局败者' : ''), VW / 2, 76);

  const ids = state.stages.concat(['random']);
  const cols = 3;
  const w = 250;
  const h = 170;
  const gap = 20;
  const startX = (VW - (cols * w + (cols - 1) * gap)) / 2;
  const startY = 110;

  for (let i = 0; i < ids.length; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (w + gap);
    const y = startY + row * (h + 18);
    const id = ids[i];
    const stage = id === 'random' ? null : STAGE_BY_ID[id];

    const grad = ctx.createLinearGradient(x, y, x, y + h);
    if (stage) {
      grad.addColorStop(0, stage.palette.skyBottom);
      grad.addColorStop(1, stage.palette.ground);
    } else {
      grad.addColorStop(0, '#3a3550');
      grad.addColorStop(1, '#191527');
    }
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, w, h, 14);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, x, y + h - 54, w, 54, 14);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillText(stage ? stage.name : 'RANDOM', x + 16, y + h - 28);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillText(stage ? stage.subtitle + ' · BGM ' + stage.music : '随机地图', x + 16, y + h - 10);

    if (state.stageCursor === i) {
      ctx.strokeStyle = chooser === 'p1' ? P1 : P2;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.7 + Math.sin(t * 0.12) * 0.25;
      roundRect(ctx, x - 4, y - 4, w + 8, h + 8, 16);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 18px "Segoe UI", sans-serif';
  ctx.fillText(Math.max(0, Math.ceil(state.timer / 60)), VW / 2, 500);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '12px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillText('J / 小键盘1 确认 · K / 小键盘2 返回', VW / 2, 522);
}

export function drawVS(ctx, state, frame) {
  const p1 = CHARACTERS[state.pick.p1];
  const p2 = CHARACTERS[state.pick.p2];
  const stage = STAGE_BY_ID[state.stage];
  const t = Math.min(1, frame / 30);

  ctx.fillStyle = '#05030c';
  ctx.fillRect(0, 0, VW, VH);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(VW * 0.62, 0);
  ctx.lineTo(VW * 0.38, VH);
  ctx.lineTo(0, VH);
  ctx.closePath();
  ctx.fillStyle = p1.colors.primary;
  ctx.globalAlpha = 0.28;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(VW, 0);
  ctx.lineTo(VW * 0.62, 0);
  ctx.lineTo(VW * 0.38, VH);
  ctx.lineTo(VW, VH);
  ctx.closePath();
  ctx.fillStyle = p2.colors.primary;
  ctx.globalAlpha = 0.28;
  ctx.fill();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.globalAlpha = t;
  ctx.fillStyle = p1.colors.primary;
  ctx.font = 'bold 56px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillText(p1.name, VW * 0.27, VH * 0.48);
  ctx.fillStyle = p2.colors.primary;
  ctx.fillText(p2.name, VW * 0.73, VH * 0.48);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px "Segoe UI", sans-serif';
  ctx.fillText('VS', VW / 2, VH * 0.46);

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '16px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillText(CHARACTER_MOVES[state.pick.p1].role + '  ·  ' + CHARACTER_MOVES[state.pick.p2].role, VW / 2, VH * 0.56);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 20px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillText(stage.name, VW / 2, VH * 0.68);
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(VW * 0.3, VH * 0.82, VW * 0.4, 4);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(VW * 0.3, VH * 0.82, VW * 0.4 * Math.min(1, frame / 90), 4);
}
