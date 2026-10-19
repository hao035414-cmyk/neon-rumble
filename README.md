# NEON RUMBLE

**A dependency-free 2D fighting game that runs in the browser.** Jab, kick, anti-air, block low, and land a super in a neon city â€” no engine, no build step, no image assets.

[**â–¶ Play it**](https://hao035414-cmyk.github.io/neon-rumble/) Â· [Report a bug](https://github.com/hao035414-cmyk/neon-rumble/issues)

![NEON RUMBLE](docs/fight.png)

## Features

- **Classic 1v1 fighting rules** â€” best of 3 rounds, 99-second timer, KO and time-over.
- **Six normals** â€” jab, heavy, kick, crouching low, jump-in, plus a projectile special and a 100-meter super.
- **Real fighting-game logic** â€” startup/active/recovery frames, hitstun, blockstun, knockdowns, invulnerable wake-up, pushback, combo scaling.
- **Correct blocking rules** â€” lows must be crouch-blocked, jump-ins are overheads, projectiles chip.
- **Motion inputs** â€” quarter-circle forward for the special, double quarter-circle for the super.
- **A readable CPU** â€” approaches, pokes, anti-airs, blocks and throws fireballs.
- **Local 2P** on one keyboard.
- **Zero dependencies** â€” plain ES modules + Canvas 2D. The simulation is DOM-free and unit-tested under Node.

## Play

### In the browser

Open the [live build](https://hao035414-cmyk.github.io/neon-rumble/), or serve the folder locally:

```bash
python -m http.server 8080
# http://localhost:8080
```

Any static file server works; there is nothing to install or compile.

### Controls

| Action | Player 1 | Player 2 |
| --- | --- | --- |
| Move | `A` / `D` | `â†` / `â†’` |
| Jump | `W` | `â†‘` |
| Crouch | `S` | `â†“` |
| Jab (light) | `J` | `1` (numpad) |
| Heavy | `K` | `2` (numpad) |
| Kick | `L` | `3` (numpad) |
| Special | `â†“ â†˜ â†’` + attack | `â†“ â†™ â†` + attack |
| Super (100 meter) | `â†“ â†˜ â†’ â†“ â†˜ â†’` + heavy | `â†“ â†™ â† â†“ â†™ â†` + heavy |

`Esc` pause Â· `R` restart Â· `M` mute.

### Rules

- First to **2 rounds** wins. A round ends on KO or when the 99-second timer expires (higher health wins).
- **Specials** are free; the **super** costs a full meter. Meter builds on hits, blocks and taking damage.
- **Lows** (`S` + kick) must be crouch-blocked; **jump attacks** are overheads and must be stand-blocked.
- Combos scale: every extra hit deals a little less damage.
- Knockdowns give a short invulnerable wake-up, so you cannot be looped forever.

## How it is built

| File | Responsibility |
| --- | --- |
| `src/config.js` | Frame data, characters, input maps |
| `src/fighter.js` | Per-fighter state machine, movement, boxes |
| `src/engine.js` | Hit resolution, projectiles, rounds, camera |
| `src/ai.js` | CPU opponent |
| `src/render.js` | Stage, procedural fighters, effects, HUD |
| `src/input.js` | Keyboard and motion recognition |
| `src/main.js` | Loop, title screen, pause, audio |

The simulation (`fighter.js` + `engine.js` + `ai.js`) never touches the DOM, which is why it can be tested headlessly:

```bash
npm test
```

The test suite runs a full CPU-vs-CPU match, then checks strikes, blocking, projectiles, supers, KO flow and round resets.

## Roadmap

- [ ] More characters and stages
- [ ] Throw / tech system
- [ ] Training mode with hitbox display
- [ ] Gamepad support
- [ ] Replay recording

## License

MIT â€” see [LICENSE](LICENSE).

This is an original fan-made project. It is not affiliated with, endorsed by, or containing assets from SNK, Capcom, or any commercial fighting game.

---

<details>
<summary>ä¸­æ–‡è¯´æ˜Ž</summary>

**NEON RUMBLE æ˜¯ä¸€ä¸ªé›¶ä¾èµ–çš„æµè§ˆå™¨ 2D æ ¼æ–—æ¸¸æˆã€‚**

- ä¸‰å±€ä¸¤èƒœã€99 ç§’è¯»ç§’ã€KO ä¸Žæ—¶é—´åˆ°åˆ¤å®š
- è½»æ‹³ / é‡æ‹³ / è¸¢ / ä¸‹æ®µ / è·³è·ƒæ”»å‡» / æ³¢åŠ¨ / 100 æ°”è¶…å¿…æ€
- èµ·æ‰‹å¸§ã€å‘½ä¸­ç¡¬ç›´ã€é˜²å¾¡ç¡¬ç›´ã€å‡»å€’ã€èµ·èº«æ— æ•Œã€è¿žæ®µé€’å‡
- ä¸‹æ®µå¿…é¡»è¹²é˜²ï¼Œè·³è·ƒæ”»å‡»æ˜¯ overheadï¼Œæ³¢åŠ¨æœ‰å‰Šè¡€
- æ‹›å¼æŒ‡ä»¤ï¼šä¸‹å‰ä¸‹å‰ + æ”»å‡»
- å•äºº CPU ä¸Žæœ¬åœ°åŒäºº

**è¿è¡Œ**ï¼šä»»æ„é™æ€æœåŠ¡å™¨å³å¯ï¼Œæˆ–ç›´æŽ¥æ‰“å¼€çº¿ä¸Šç‰ˆã€‚

**æµ‹è¯•**ï¼š`npm test` åœ¨ Node ä¸‹è·‘å®Œæ•´å¯¹å±€ä¸Žæˆ˜æ–—è§„åˆ™æ–­è¨€ã€‚

</details>
