/**
 * Canvas renderer: stage, procedural fighters, effects and HUD.
 * Everything is drawn from primitives; the game ships no image assets.
 */

import { MOVES, VIEW, WORLD } from './config.js';

const { width: VW, height: VH } = VIEW;

export function renderScene(ctx, engine, ui) {
  drawBackground(ctx, engine.cameraX, engine.frame);
  ctx.save();
  const shakeX = engine.shake > 0.4 ? (Math.random() - 0.5) * engine.shake : 0;
  const shakeY = engine.shake > 0.4 ? (Math.random() - 0.5) * engine.shake : 0;
  ctx.translate(-engine.cameraX + shakeX, shakeY);

  drawFighter(ctx, engine.p1, engine);
  drawFighter(ctx, engine.p2, engine);
  for (const p of engine.projectiles) drawProjectile(ctx, p);
  drawParticles(ctx, engine);
  ctx.restore();

  drawHUD(ctx, engine, ui);
  drawAnnouncements(ctx, engine);

  if (ui.debug) {
    ctx.save();
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#57ff9a';
    ctx.fillText(
      `phase=${engine.phase} t=${engine.phaseTimer} cam=${engine.cameraX.toFixed(0)} frame=${engine.frame}`,
      14,
      92,
    );
    ctx.fillText(
      `p1 x=${engine.p1.x.toFixed(0)} ${engine.p1.state} hp=${engine.p1.hp} | p2 x=${engine.p2.x.toFixed(0)} ${engine.p2.state} hp=${engine.p2.hp}`,
      14,
      108,
    );
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/* Stage                                                               */
/* ------------------------------------------------------------------ */

function drawBackground(ctx, cameraX, t) {
  const sky = ctx.createLinearGradient(0, 0, 0, VH);
  sky.addColorStop(0, '#070417');
  sky.addColorStop(0.42, '#241040');
  sky.addColorStop(0.7, '#6d2550');
  sky.addColorStop(0.86, '#1a0d22');
  sky.addColorStop(1, '#08040e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VW, VH);

  // Moon with a soft halo.
  const moonX = 735 - cameraX * 0.04;
  const halo = ctx.createRadialGradient(moonX, 118, 10, moonX, 118, 120);
  halo.addColorStop(0, 'rgba(255,220,170,0.55)');
  halo.addColorStop(1, 'rgba(255,150,120,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(moonX - 130, -10, 260, 260);
  ctx.fillStyle = '#ffe3b3';
  ctx.beginPath();
  ctx.arc(moonX, 118, 54, 0, Math.PI * 2);
  ctx.fill();

  drawSkyline(ctx, cameraX * 0.16, 150, 'rgba(24,16,44,0.9)', 300);
  drawSkyline(ctx, cameraX * 0.34, 110, 'rgba(14,10,28,0.95)', 360);
  drawNeonSigns(ctx, cameraX * 0.34, t);

  // Street.
  const street = ctx.createLinearGradient(0, WORLD.ground - 40, 0, VH);
  street.addColorStop(0, '#0d0818');
  street.addColorStop(1, '#05030a');
  ctx.fillStyle = street;
  ctx.fillRect(0, WORLD.ground, VW, VH - WORLD.ground);

  // Neon curb line.
  ctx.save();
  ctx.shadowColor = '#ff3d9a';
  ctx.shadowBlur = 18;
  ctx.fillStyle = 'rgba(255,61,154,0.85)';
  ctx.fillRect(0, WORLD.ground - 2, VW, 2);
  ctx.restore();

  // Perspective floor grid.
  ctx.save();
  ctx.strokeStyle = 'rgba(120,80,200,0.18)';
  ctx.lineWidth = 1;
  const offset = cameraX * 0.6;
  for (let i = -2; i < 16; i += 1) {
    const x = i * 96 - (offset % 96);
    ctx.beginPath();
    ctx.moveTo(x, WORLD.ground);
    ctx.lineTo(x + (x - VW / 2) * 0.55, VH);
    ctx.stroke();
  }
  for (let j = 1; j < 5; j += 1) {
    const y = WORLD.ground + j * j * 9;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VW, y);
    ctx.stroke();
  }
  ctx.restore();

  // Floor reflections.
  const glow = ctx.createLinearGradient(0, WORLD.ground, 0, VH);
  glow.addColorStop(0, 'rgba(255,70,160,0.10)');
  glow.addColorStop(1, 'rgba(60,180,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, WORLD.ground, VW, VH - WORLD.ground);
}

function drawSkyline(ctx, offset, baseHeight, color, baseY) {
  ctx.fillStyle = color;
  const bw = 78;
  for (let i = -2; i < 16; i += 1) {
    const x = i * bw - (offset % bw);
    const h = baseHeight + ((i * 53 + 31) % 5) * 26;
    ctx.fillRect(x, baseY - h, bw - 8, h);
    ctx.fillStyle = 'rgba(255,214,140,0.5)';
    for (let wy = 0; wy < 4; wy += 1) {
      for (let wx = 0; wx < 2; wx += 1) {
        if ((i * 7 + wy * 3 + wx * 5) % 3 === 0) {
          ctx.fillRect(x + 12 + wx * 26, baseY - h + 16 + wy * 22, 7, 9);
        }
      }
    }
    ctx.fillStyle = color;
  }
}

function drawNeonSigns(ctx, offset, t) {
  const signs = [
    { x: 180, y: 250, w: 70, h: 16, color: '#38e8ff' },
    { x: 620, y: 220, w: 96, h: 14, color: '#ff4fa3' },
    { x: 980, y: 268, w: 58, h: 14, color: '#ffd166' },
  ];
  const pulse = 0.75 + Math.sin(t * 0.05) * 0.15;
  for (const s of signs) {
    const x = s.x - (offset % 1400);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = s.color;
    ctx.fillRect(x, s.y, s.w, s.h);
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/* Fighters                                                            */
/* ------------------------------------------------------------------ */

function capsule(ctx, x1, y1, x2, y2, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function limb(ctx, x1, y1, x2, y2, width, color) {
  capsule(ctx, x1, y1, x2, y2, width + 3, 'rgba(0,0,0,0.3)');
  capsule(ctx, x1, y1, x2, y2, width, color);
}

function drawFighter(ctx, f, engine) {
  const c = f.char.colors;
  const air = Math.max(0, WORLD.ground - f.y);

  // Floor spotlight for separation from the dark street.
  const spot = ctx.createRadialGradient(f.x, WORLD.ground, 4, f.x, WORLD.ground, 96);
  spot.addColorStop(0, `${c.aura}33`);
  spot.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = spot;
  ctx.beginPath();
  ctx.ellipse(f.x, WORLD.ground, 96, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shadow.
  ctx.save();
  ctx.globalAlpha = Math.max(0.08, 0.34 - air / 700);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(f.x, WORLD.ground + 5, Math.max(14, 32 - air * 0.04), 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.facing, 1);

  if (f.state === 'knockdown' || f.state === 'ko') {
    ctx.translate(0, -18);
    ctx.rotate(-Math.PI / 2.25);
  }

  const crouch = f.crouching && !f.airborne;
  const t = engine.frame;
  const bob = f.state === 'idle' ? Math.sin(t * 0.07) * 1.6 : 0;
  const walk = f.state === 'walk' ? Math.sin(f.walkPhase) : 0;

  let hipY = crouch ? -46 : -78 + bob * 0.4;
  let shoulderY = crouch ? -94 : -130 + bob;
  let headY = crouch ? -116 : -152 + bob;
  let lean = 0;

  if (f.state === 'hitstun' || f.state === 'blockstun') lean = f.state === 'hitstun' ? -0.22 : 0.08;
  if (f.state === 'getup') lean = 0.2;
  if (f.airborne) {
    hipY = -84;
    shoulderY = -132;
    headY = -154;
  }

  // Attack timing.
  let ext = 0;
  let move = null;
  if (f.state === 'attack' && f.move) {
    move = MOVES[f.move];
    const total = move.startup + move.active + move.recovery;
    if (f.moveFrame <= move.startup) ext = (f.moveFrame / Math.max(1, move.startup)) * 0.45;
    else if (f.moveFrame <= move.startup + move.active) ext = 1;
    else ext = Math.max(0, 1 - (f.moveFrame - move.startup - move.active) / Math.max(1, move.recovery));
    lean += 0.12 * ext;
  }

  const rearArm = { x: -21, y: shoulderY + 34 };
  const leadArm = { x: 25, y: shoulderY + 30 };
  const rearFoot = { x: -16, y: 0 };
  const leadFoot = { x: 14 + walk * 6, y: 0 };

  if (f.state === 'walk') {
    rearFoot.x = -16 - walk * 10;
    leadFoot.x = 14 + walk * 10;
    leadArm.x = 14 - walk * 6;
    rearArm.x = -14 + walk * 6;
  }
  if (f.airborne) {
    rearFoot.y = -26;
    leadFoot.y = -34;
    leadFoot.x = 20;
    rearFoot.x = -18;
  }
  if (crouch) {
    rearFoot.x = -18;
    leadFoot.x = 20;
    rearArm.y = shoulderY + 26;
    leadArm.y = shoulderY + 26;
  }

  if (f.state === 'blockstun' || f.blocking) {
    leadArm.x = 22;
    leadArm.y = shoulderY + 22;
    rearArm.x = 14;
    rearArm.y = shoulderY + 30;
  }

  if (move) {
    if (f.move === 'lp' || f.move === 'hp') {
      const reach = f.move === 'lp' ? 54 : 74;
      leadArm.x = 18 + reach * ext;
      leadArm.y = shoulderY + 4;
    } else if (f.move === 'kick') {
      leadFoot.x = 16 + 76 * ext;
      leadFoot.y = hipY + 10 - 26 * ext;
      rearFoot.x = -18;
    } else if (f.move === 'low') {
      leadFoot.x = 16 + 66 * ext;
      leadFoot.y = -10;
      hipY = -46;
      shoulderY = -94;
      headY = -116;
    } else if (f.move === 'jumpAtk') {
      leadFoot.x = 34;
      leadFoot.y = -30;
      leadArm.x = 24;
      leadArm.y = shoulderY + 6;
    } else if (f.move === 'special' || f.move === 'super') {
      leadArm.x = 26 + 16 * ext;
      leadArm.y = shoulderY + 24;
      rearArm.x = 10;
      rearArm.y = shoulderY + 26;
    }
  }

  ctx.save();
  ctx.rotate(lean * 0.5);

  // Rear leg.
  limb(ctx, 0, hipY, rearFoot.x * 0.9, (hipY + rearFoot.y) / 2, 15, c.primaryDark);
  limb(ctx, rearFoot.x * 0.9, (hipY + rearFoot.y) / 2, rearFoot.x, rearFoot.y, 13, c.primaryDark);

  // Rear arm.
  limb(ctx, 0, shoulderY + 8, rearArm.x * 0.7, (shoulderY + rearArm.y) / 2, 12, c.primaryDark);
  limb(ctx, rearArm.x * 0.7, (shoulderY + rearArm.y) / 2, rearArm.x, rearArm.y, 10, c.primaryDark);

  // Torso.
  const hipW = 11;
  const shoulderW = 15;
  ctx.fillStyle = c.primary;
  ctx.beginPath();
  ctx.moveTo(-hipW, hipY);
  ctx.quadraticCurveTo(-shoulderW - 2, (hipY + shoulderY) / 2, -shoulderW, shoulderY);
  ctx.lineTo(shoulderW, shoulderY);
  ctx.quadraticCurveTo(shoulderW + 2, (hipY + shoulderY) / 2, hipW, hipY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Belt.
  ctx.fillStyle = c.secondary;
  ctx.fillRect(-hipW - 1, hipY - 7, hipW * 2 + 2, 5);

  // Front leg.
  limb(ctx, 0, hipY, leadFoot.x * 0.9, (hipY + leadFoot.y) / 2, 16, c.primary);
  limb(ctx, leadFoot.x * 0.9, (hipY + leadFoot.y) / 2, leadFoot.x, leadFoot.y, 14, c.primary);

  // Front arm.
  limb(ctx, 0, shoulderY + 8, leadArm.x * 0.65, (shoulderY + leadArm.y) / 2, 13, c.primary);
  limb(ctx, leadArm.x * 0.65, (shoulderY + leadArm.y) / 2, leadArm.x, leadArm.y, 11, c.primary);

  // Hand.
  ctx.fillStyle = c.skin;
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(leadArm.x, leadArm.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Head.
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.arc(2, headY, 16, 0, Math.PI * 2);
  ctx.fill();

  // Hair.
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  ctx.arc(1, headY - 2, 16.5, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-10, headY + 2, 8, 12, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Headband.
  ctx.fillStyle = c.secondary;
  ctx.fillRect(-15, headY - 7, 32, 4);
  ctx.strokeStyle = c.secondary;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-14, headY - 5);
  ctx.quadraticCurveTo(-26, headY + 2 + Math.sin(t * 0.15) * 3, -32, headY + 10);
  ctx.stroke();

  // Eye.
  ctx.fillStyle = '#101018';
  ctx.beginPath();
  ctx.arc(9, headY - 2, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(10, headY - 3, 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Effects                                                             */
/* ------------------------------------------------------------------ */

function drawProjectile(ctx, p) {
  const x = p.x;
  const y = p.y;
  const r = p.radius;
  const color = p.kind === 'super' ? '#ffe066' : '#63c8ff';

  ctx.save();
  const g = ctx.createRadialGradient(x, y, 2, x, y, r * 1.6);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, color);
  g.addColorStop(1, 'rgba(80,180,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.5;
  ctx.fillStyle = color;
  for (let i = 1; i <= 3; i += 1) {
    ctx.beginPath();
    ctx.arc(x - p.facing * i * 14, y + Math.sin(i + p.life * 0.2) * 4, r * (0.7 - i * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles(ctx, engine) {
  for (const p of engine.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------------ */
/* HUD                                                                 */
/* ------------------------------------------------------------------ */

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawHealthBar(ctx, f, x, y, w, h, mirror) {
  const ratio = Math.max(0, f.hp / f.maxHp);
  const ghost = f.ghostHp ?? ratio;
  const fill = mirror ? x + w * (1 - ratio) : x;
  const fillW = w * ratio;
  const ghostW = w * Math.max(ratio, ghost);

  ctx.save();
  roundRect(ctx, x, y, w, h, 4);
  ctx.fillStyle = 'rgba(8,6,16,0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  roundRect(ctx, x, y, w, h, 4);
  ctx.clip();

  // Ghost (damage trail).
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  if (mirror) ctx.fillRect(x + w - ghostW, y, ghostW, h);
  else ctx.fillRect(x, y, ghostW, h);

  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, f.hp / f.maxHp > 0.3 ? '#ffe27a' : '#ff6b6b');
  g.addColorStop(1, f.hp / f.maxHp > 0.3 ? '#ff9f1c' : '#c81d25');
  ctx.fillStyle = g;
  if (mirror) ctx.fillRect(x + w - fillW, y, fillW, h);
  else ctx.fillRect(fill, y, fillW, h);
  ctx.restore();
  ctx.restore();
}

function drawHUD(ctx, engine, ui) {
  const { p1, p2 } = engine;

  // Names.
  ctx.font = '600 15px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(p1.char.name, 28, 22);
  ctx.textAlign = 'right';
  ctx.fillText(p2.char.name, VW - 28, 22);

  drawHealthBar(ctx, p1, 28, 30, 380, 20, false);
  drawHealthBar(ctx, p2, VW - 408, 30, 380, 20, true);

  // Round pips.
  for (let i = 0; i < 2; i += 1) {
    drawPip(ctx, 30 + i * 16, 58, p1.wins > i, '#ffd166');
    drawPip(ctx, VW - 30 - i * 16, 58, p2.wins > i, '#ffd166');
  }

  // Timer.
  ctx.textAlign = 'center';
  ctx.font = '700 34px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = engine.secondsLeft <= 10 ? '#ff5c5c' : '#ffffff';
  ctx.fillText(String(engine.secondsLeft).padStart(2, '0'), VW / 2, 52);

  // Meter bars.
  drawMeter(ctx, p1, 28, VH - 26, 300, false);
  drawMeter(ctx, p2, VW - 328, VH - 26, 300, true);

  // Combo counters.
  drawCombo(ctx, engine, 'p1', 120, 130, false);
  drawCombo(ctx, engine, 'p2', VW - 120, 130, true);

  if (ui.muted) {
    ctx.textAlign = 'right';
    ctx.font = '12px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('MUTED (M)', VW - 28, VH - 44);
  }
}

function drawPip(ctx, x, y, filled, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = filled ? color : 'rgba(255,255,255,0.18)';
  ctx.fillRect(-5, -5, 10, 10);
  ctx.restore();
}

function drawMeter(ctx, f, x, y, w, mirror) {
  const ratio = Math.max(0, Math.min(1, f.meter / 100));
  const h = 9;
  ctx.save();
  roundRect(ctx, x, y, w, h, 4);
  ctx.fillStyle = 'rgba(8,6,16,0.8)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.stroke();

  ctx.save();
  roundRect(ctx, x, y, w, h, 4);
  ctx.clip();
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, '#2fd6ff');
  g.addColorStop(0.6, '#7b6bff');
  g.addColorStop(1, '#ff5cc8');
  ctx.fillStyle = g;
  const fillW = w * ratio;
  ctx.fillRect(mirror ? x + w - fillW : x, y, fillW, h);
  ctx.restore();

  if (ratio >= 1) {
    ctx.shadowColor = '#ffe066';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffe066';
    ctx.font = '700 11px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = mirror ? 'right' : 'left';
    ctx.fillText('SUPER READY', mirror ? x + w : x, y - 6);
  }
  ctx.restore();
}

function drawCombo(ctx, engine, id, x, y, mirror) {
  const combo = engine.combo[id];
  if (!combo || combo < 2) return;
  const alpha = Math.min(1, engine.comboTimer[id] / 20);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = mirror ? 'right' : 'left';
  ctx.font = '800 30px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.shadowColor = '#ff8a00';
  ctx.shadowBlur = 14;
  ctx.fillText(String(combo), x, y);
  ctx.font = '700 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('HITS', x + (mirror ? -34 : 34), y - 2);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Announcements                                                       */
/* ------------------------------------------------------------------ */

function bigText(ctx, text, y, size, color, alpha = 1, scale = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(VW / 2, y);
  ctx.scale(scale, scale);
  ctx.textAlign = 'center';
  ctx.font = `800 ${size}px "Segoe UI", system-ui, sans-serif`;
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.strokeText(text, 0, 0);
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawAnnouncements(ctx, engine) {
  const { phase, phaseTimer } = engine;

  if (phase === 'intro') {
    const t = Math.min(1, phaseTimer / 16);
    const scale = 0.8 + t * 0.2;
    const alpha = phaseTimer > 70 ? Math.max(0, 1 - (phaseTimer - 70) / 26) : 1;
    bigText(ctx, `ROUND ${engine.round}`, 210, 62, '#ffffff', alpha, scale);
  } else if (phase === 'fight' && phaseTimer < 42) {
    const t = phaseTimer / 42;
    bigText(ctx, 'FIGHT!', 205, 78, '#ffd166', Math.max(0, 1 - t * 0.9), 1 + t * 0.25);
  } else if (phase === 'ko') {
    const timedOut = engine.lastWinner === null && engine.timer <= 0;
    const text = engine.lastWinner ? 'K.O.' : timedOut ? 'TIME UP' : 'DOUBLE K.O.';
    bigText(ctx, text, 205, 88, '#ff5c5c', 1, 1 + Math.sin(phaseTimer * 0.2) * 0.02);
    if (phaseTimer > 60 && engine.lastWinner) {
      bigText(ctx, `${engine.lastWinner.char.name} WINS`, 275, 30, '#ffffff', Math.min(1, (phaseTimer - 60) / 20));
    }
  } else if (phase === 'roundEnd') {
    const text = engine.lastWinner ? `${engine.lastWinner.char.name} WINS THE ROUND` : 'DRAW';
    bigText(ctx, text, 230, 34, '#ffffff', Math.min(1, phaseTimer / 18));
  } else if (phase === 'matchOver') {
    ctx.fillStyle = 'rgba(4,2,10,0.62)';
    ctx.fillRect(0, 0, VW, VH);
    bigText(ctx, `${engine.matchWinner?.char.name ?? 'NOBODY'} WINS`, 220, 62, '#ffd166');
    bigText(ctx, 'PRESS ENTER TO PLAY AGAIN', 286, 18, '#ffffff', 0.85 + Math.sin(engine.frame * 0.08) * 0.15);
  }
}

/* ------------------------------------------------------------------ */
/* Title screen                                                        */
/* ------------------------------------------------------------------ */

export function drawTitle(ctx, t) {
  drawBackground(ctx, 340, t);
  ctx.fillStyle = 'rgba(4,2,10,0.5)';
  ctx.fillRect(0, 0, VW, VH);

  // Fighters stand behind the menu, facing each other.
  drawFighter(ctx, demoFighter('kai', 292, 468, 1), { frame: t });
  drawFighter(ctx, demoFighter('rin', 668, 468, -1), { frame: t });

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '800 84px "Segoe UI", system-ui, sans-serif';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.strokeText('NEON RUMBLE', VW / 2, 156);
  ctx.shadowColor = '#ff4fa3';
  ctx.shadowBlur = 30;
  const grad = ctx.createLinearGradient(0, 92, 0, 180);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.5, '#ffd6f2');
  grad.addColorStop(1, '#ff4fa3');
  ctx.fillStyle = grad;
  ctx.fillText('NEON RUMBLE', VW / 2, 156);

  ctx.shadowBlur = 0;
  ctx.font = '500 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('a dependency-free 2D fighting game', VW / 2, 188);
  ctx.restore();

  // Prompt panel keeps the copy readable over the fighters.
  ctx.save();
  const panelW = 470;
  const panelH = 108;
  const panelX = VW / 2 - panelW / 2;
  const panelY = 318;
  roundRect(ctx, panelX, panelY, panelW, panelH, 14);
  ctx.fillStyle = 'rgba(6,3,14,0.74)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,79,163,0.28)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'center';
  const blink = 0.62 + Math.sin(t * 0.1) * 0.38;
  ctx.globalAlpha = blink;
  ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('PRESS ENTER — 1P VS CPU', VW / 2, 356);
  ctx.globalAlpha = 0.85;
  ctx.font = '600 14px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#a9d8ff';
  ctx.fillText('PRESS 2 — LOCAL 2P', VW / 2, 384);
  ctx.globalAlpha = 0.55;
  ctx.font = '12px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('P2 uses the arrow keys and numpad 1 / 2 / 3', VW / 2, 406);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.fillText('P1  A / D  move   W  jump   S  crouch   J  jab   K  heavy   L  kick', VW / 2, 462);
  ctx.fillText('special: ↓ ↘ → + attack        super: ↓ ↘ → ↓ ↘ → + heavy (100 meter)', VW / 2, 484);
  ctx.fillText('ESC pause        R restart        M mute', VW / 2, 506);
  ctx.restore();
}

function demoFighter(charKey, x, y, facing) {
  return {
    char: CHARACTERS_REF[charKey],
    charKey,
    x,
    y,
    facing,
    hp: 1000,
    maxHp: 1000,
    meter: 0,
    wins: 0,
    state: 'idle',
    crouching: false,
    blocking: false,
    airborne: false,
    walkPhase: 0,
    moveFrame: 0,
    height: 150,
    hurtbox: { x: x - 24, y: y - 150, w: 48, h: 150 },
  };
}

// Imported lazily to keep the renderer's public surface small.
import { CHARACTERS as CHARACTERS_REF } from './config.js';

export function drawPause(ctx) {
  ctx.fillStyle = 'rgba(4,2,10,0.7)';
  ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center';
  ctx.font = '800 52px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('PAUSED', VW / 2, VH / 2 - 10);
  ctx.font = '16px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('ESC resume   ·   R restart   ·   Q quit to title', VW / 2, VH / 2 + 32);
}

export function drawLoading(ctx) {
  ctx.fillStyle = '#070417';
  ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('loading…', VW / 2, VH / 2);
}
