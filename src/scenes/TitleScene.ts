import Phaser from 'phaser';
import { GameState } from '../engine/GameState';
import { CursorManager } from '../engine/CursorManager';
import sfxTextBlipUrl from '../assets/audio/sfx/sfx_text_blip.mp3';
import sfxBackspaceBurstUrl from '../assets/audio/sfx/sfx_backspace_burst.mp3';
import sfxSelectUrl from '../assets/audio/sfx/sfx_select.mp3';
import sfxCrtOnUrl from '../assets/audio/sfx/sfx_crt_on.mp3';
import sfxCrtOffUrl from '../assets/audio/sfx/sfx_crt_off.mp3';
import sfxTerminalTypingUrl from '../assets/audio/sfx/sfx_terminal_typing.mp3';
import sfxCrtStaticUrl from '../assets/audio/sfx/sfx_crt_static.mp3';
import voiceCaseyUrl from '../assets/audio/sfx/voices/voice_casey.mp3';
import voiceKevinUrl from '../assets/audio/sfx/voices/voice_kevin.mp3';
import bootLinesData from '../data/boot_lines.json';

// ── Colors (IBM 3278 amber — BRIGHT) ──

const FONT = '"Press Start 2P", monospace';
const AMBER = '#FFD000';
const DIM_AMBER = '#B89000';
const AMBER_HEX = 0xffd000;
const GLOW_COLOR = '#FFB000';
const GLOW_ALPHA = 0.25;
const SCANLINE_ALPHA = 0.015;
const SCREEN_BG = 0x0a0a08;

// ── CRT bezel geometry (fills most of canvas) ──

const BEZEL = 28;
const BOTTOM_BEZEL = 42;
const SCREEN_X = BEZEL;
const SCREEN_Y = BEZEL;
const SCREEN_W = 640 - BEZEL * 2;     // 584
const SCREEN_H = 360 - BEZEL - BOTTOM_BEZEL; // 290

const FONT_SIZE = 8;
const LINE_H = 16;
const CHAR_W = 8;
const TEXT_PAD = 16;

export class TitleScene extends Phaser.Scene {
  private skipped = false;
  private menuReady = false;
  private transitioning = false;

  private bezelContainer!: Phaser.GameObjects.Container;
  private screenContainer!: Phaser.GameObjects.Container;
  private overlayContainer!: Phaser.GameObjects.Container;

  private terminalText: Phaser.GameObjects.Text | null = null;
  private glowText: Phaser.GameObjects.Text | null = null;
  private cursorBlock: Phaser.GameObjects.Rectangle | null = null;
  private cursorTween: Phaser.Tweens.Tween | null = null;
  private currentString = '';

  private cursorManager: CursorManager | null = null;
  private powerLed: Phaser.GameObjects.Arc | null = null;
  private screenFlash: Phaser.GameObjects.Rectangle | null = null;

  // Menu — simple text objects with bounds-based click detection
  private newGameText: Phaser.GameObjects.Text | null = null;
  private continueText: Phaser.GameObjects.Text | null = null;
  private newGameBlink: Phaser.GameObjects.Text | null = null;
  private continueBlink: Phaser.GameObjects.Text | null = null;

  // Easter egg state
  private eggLedUsed = false;
  private eggLedActive = false;
  private eggModelClicks = 0;
  private eggModelLastClick = 0;
  private eggModelActive = false;
  private eggCornerClicks = 0;
  private eggCatShown = false;

  constructor() { super({ key: 'TitleScene' }); }

  preload(): void {
    this.load.audio('sfx_text_blip', sfxTextBlipUrl);
    this.load.audio('sfx_backspace_burst', sfxBackspaceBurstUrl);
    this.load.audio('sfx_select', sfxSelectUrl);
    this.load.audio('sfx_crt_on', sfxCrtOnUrl);
    this.load.audio('sfx_crt_off', sfxCrtOffUrl);
    this.load.audio('sfx_terminal_typing', sfxTerminalTypingUrl);
    this.load.audio('sfx_crt_static', sfxCrtStaticUrl);
    this.load.audio('voice_casey', voiceCaseyUrl);
    this.load.audio('voice_kevin', voiceKevinUrl);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1a1a1a');
    this.skipped = false;
    this.menuReady = false;
    this.transitioning = false;
    this.currentString = '';
    this.newGameText = null;
    this.continueText = null;
    this.newGameBlink = null;
    this.continueBlink = null;
    this.eggLedUsed = false;
    this.eggLedActive = false;
    this.eggModelClicks = 0;
    this.eggModelLastClick = 0;
    this.eggModelActive = false;
    this.eggCornerClicks = 0;
    this.eggCatShown = false;

    this.buildBezel();
    this.buildScreen();
    this.buildOverlays();
    this.startCrtPowerOn();

    // Custom cursor (purely visual — no setInteractive on it)
    this.cursorManager = new CursorManager(this);

    // ── SINGLE GLOBAL CLICK HANDLER ──
    // All click logic goes through here: skip, menu, easter eggs, boot confirm
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) return;
      this.handleClick(pointer);
    });
  }

  update(): void {
    if (this.cursorManager) {
      const pointer = this.input.activePointer;
      this.cursorManager.update(pointer);

      // Update cursor state based on hover
      if (this.menuReady && !this.transitioning) {
        if (this.isOverMenu(pointer.x, pointer.y)) {
          this.cursorManager.setState('inventory');
        } else {
          this.cursorManager.setState('default');
        }
      }
    }
  }

  // ═══════════════════════════════════════════
  // SINGLE CLICK HANDLER — all clicks go here
  // ═══════════════════════════════════════════

  private handleClick(pointer: Phaser.Input.Pointer): void {
    const px = pointer.x, py = pointer.y;

    // During transitioning, ignore all clicks
    if (this.transitioning) return;

    // If menu is showing, check menu clicks first
    if (this.menuReady) {
      if (this.newGameText) {
        const b = this.newGameText.getBounds();
        if (px >= b.left - 8 && px <= b.right + 8 && py >= b.top - 4 && py <= b.bottom + 4) {
          if (this.cache.audio.exists('sfx_select')) this.sound.play('sfx_select', { volume: 0.25 });
          this.startBootSequence(false);
          return;
        }
      }
      if (this.continueText) {
        const b = this.continueText.getBounds();
        if (px >= b.left - 8 && px <= b.right + 8 && py >= b.top - 4 && py <= b.bottom + 4) {
          if (this.cache.audio.exists('sfx_select')) this.sound.play('sfx_select', { volume: 0.25 });
          this.startBootSequence(true);
          return;
        }
      }

      // Check easter eggs even while menu is showing
      this.checkEasterEggClick(px, py);
      return;
    }

    // During intro sequence: check easter eggs, then skip
    if (!this.skipped) {
      if (this.checkEasterEggClick(px, py)) return;
      this.skipToMenu();
    }
  }

  private isOverMenu(px: number, py: number): boolean {
    if (this.newGameText) {
      const b = this.newGameText.getBounds();
      if (px >= b.left - 8 && px <= b.right + 8 && py >= b.top - 4 && py <= b.bottom + 4) return true;
    }
    if (this.continueText) {
      const b = this.continueText.getBounds();
      if (px >= b.left - 8 && px <= b.right + 8 && py >= b.top - 4 && py <= b.bottom + 4) return true;
    }
    return false;
  }

  // ═══════════════════════════════════════════
  // BEZEL — flat CRT monitor frame (primitives)
  // ═══════════════════════════════════════════

  private buildBezel(): void {
    this.bezelContainer = this.add.container(0, 0).setDepth(100);
    const W = 640, H = 360;
    const bezelColor = 0xd4c8a0;
    const bezelDark = 0xb0a478;
    const bezelLight = 0xe0d8b8;

    // Top
    this.bezelContainer.add(this.add.rectangle(W / 2, BEZEL / 2, W, BEZEL, bezelColor).setDepth(100));
    // Bottom
    this.bezelContainer.add(this.add.rectangle(W / 2, H - BOTTOM_BEZEL / 2, W, BOTTOM_BEZEL, bezelColor).setDepth(100));
    // Left
    this.bezelContainer.add(this.add.rectangle(BEZEL / 2, H / 2, BEZEL, H, bezelColor).setDepth(100));
    // Right
    this.bezelContainer.add(this.add.rectangle(W - BEZEL / 2, H / 2, BEZEL, H, bezelColor).setDepth(100));

    // Inner bevel
    const innerBorder = this.add.rectangle(
      SCREEN_X + SCREEN_W / 2, SCREEN_Y + SCREEN_H / 2,
      SCREEN_W + 4, SCREEN_H + 4
    ).setDepth(99);
    innerBorder.setStrokeStyle(2, 0x333333);
    innerBorder.setFillStyle(0x000000, 0);
    this.bezelContainer.add(innerBorder);

    // 3D edges
    this.bezelContainer.add(this.add.rectangle(W / 2, 1, W, 2, bezelLight).setDepth(101));
    this.bezelContainer.add(this.add.rectangle(1, H / 2, 2, H, bezelLight).setDepth(101));
    this.bezelContainer.add(this.add.rectangle(W / 2, H - 1, W, 2, bezelDark).setDepth(101));
    this.bezelContainer.add(this.add.rectangle(W - 1, H / 2, 2, H, bezelDark).setDepth(101));

    // Bottom bezel badge
    const badgeCY = H - BOTTOM_BEZEL / 2;
    const badgeBg = this.add.rectangle(W / 2, badgeCY, 180, 16, bezelDark, 0.5).setDepth(102);
    badgeBg.setStrokeStyle(1, 0x999078);
    this.bezelContainer.add(badgeBg);
    this.bezelContainer.add(
      this.add.text(W / 2, badgeCY, 'D.A.S.H. SYSTEMS INC.', {
        fontFamily: FONT, fontSize: '5px', color: '#7a7058',
      }).setOrigin(0.5).setDepth(103)
    );

    // Model number
    this.bezelContainer.add(
      this.add.text(W - BEZEL - 8, badgeCY, 'MODEL 1997', {
        fontFamily: FONT, fontSize: '4px', color: '#9a9078',
      }).setOrigin(1, 0.5).setDepth(103)
    );

    // Power LED
    this.powerLed = this.add.circle(BEZEL + 12, badgeCY, 3, 0x222222).setDepth(103);
    this.bezelContainer.add(this.powerLed);
  }

  // ═══════════════════════════════════════════
  // SCREEN CONTENT
  // ═══════════════════════════════════════════

  private buildScreen(): void {
    this.screenContainer = this.add.container(0, 0).setDepth(10);

    this.screenContainer.add(
      this.add.rectangle(SCREEN_X + SCREEN_W / 2, SCREEN_Y + SCREEN_H / 2, SCREEN_W, SCREEN_H, SCREEN_BG)
    );

    this.glowText = this.add.text(SCREEN_X + TEXT_PAD - 1, SCREEN_Y + TEXT_PAD - 1, '', {
      fontFamily: FONT, fontSize: `${FONT_SIZE}px`, color: GLOW_COLOR,
      wordWrap: { width: SCREEN_W - TEXT_PAD * 2 }, lineSpacing: LINE_H - FONT_SIZE,
    }).setAlpha(GLOW_ALPHA).setDepth(11);
    this.screenContainer.add(this.glowText);

    this.terminalText = this.add.text(SCREEN_X + TEXT_PAD, SCREEN_Y + TEXT_PAD, '', {
      fontFamily: FONT, fontSize: `${FONT_SIZE}px`, color: AMBER,
      wordWrap: { width: SCREEN_W - TEXT_PAD * 2 }, lineSpacing: LINE_H - FONT_SIZE,
    }).setDepth(12);
    this.screenContainer.add(this.terminalText);

    this.cursorBlock = this.add.rectangle(0, 0, CHAR_W - 1, FONT_SIZE + 2, AMBER_HEX)
      .setOrigin(0, 0).setVisible(false).setDepth(13);
    this.screenContainer.add(this.cursorBlock);
  }

  // ═══════════════════════════════════════════
  // CRT OVERLAYS
  // ═══════════════════════════════════════════

  private buildOverlays(): void {
    this.overlayContainer = this.add.container(0, 0).setDepth(50);

    const scanGfx = this.add.graphics();
    scanGfx.fillStyle(0x000000, SCANLINE_ALPHA);
    for (let y = 0; y < 4; y += 2) scanGfx.fillRect(0, y, SCREEN_W, 1);
    scanGfx.generateTexture('scanline_tile', SCREEN_W, 4);
    scanGfx.destroy();

    this.overlayContainer.add(
      this.add.tileSprite(SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H, 'scanline_tile')
        .setOrigin(0, 0).setDepth(51)
    );

    const vigGfx = this.add.graphics().setDepth(52);
    const steps = 12;
    for (let i = steps; i >= 0; i--) {
      const alpha = (1 - i / steps) * 0.2;
      const inset = i * 6;
      vigGfx.fillStyle(0x000000, alpha);
      vigGfx.fillRect(SCREEN_X + inset, SCREEN_Y + inset,
        SCREEN_W - inset * 2, SCREEN_H - inset * 2);
    }
    vigGfx.fillStyle(0x000000, 0);
    vigGfx.fillRect(SCREEN_X + steps * 6, SCREEN_Y + steps * 6,
      SCREEN_W - steps * 12, SCREEN_H - steps * 12);
    this.overlayContainer.add(vigGfx);

    this.screenFlash = this.add.rectangle(
      SCREEN_X + SCREEN_W / 2, SCREEN_Y + SCREEN_H / 2,
      SCREEN_W, SCREEN_H, 0x000000, 0
    ).setDepth(53);
    this.overlayContainer.add(this.screenFlash);
    this.startScreenFlicker();
  }

  private startScreenFlicker(): void {
    const scheduleFlicker = () => {
      this.time.delayedCall(Phaser.Math.Between(5000, 10000), () => {
        if (!this.screenFlash || this.transitioning) return;
        this.screenFlash.setAlpha(0.05);
        this.time.delayedCall(50, () => {
          if (this.screenFlash) this.screenFlash.setAlpha(0);
          scheduleFlicker();
        });
      });
    };
    scheduleFlicker();
  }

  // ═══════════════════════════════════════════
  // CRT POWER ON
  // ═══════════════════════════════════════════

  private startCrtPowerOn(): void {
    const flash = this.add.rectangle(
      SCREEN_X + SCREEN_W / 2, SCREEN_Y + SCREEN_H / 2,
      SCREEN_W, SCREEN_H, 0xffffff, 0
    ).setDepth(55);

    if (this.cache.audio.exists('sfx_crt_on')) this.sound.play('sfx_crt_on', { volume: 0.35 });

    this.time.delayedCall(200, () => {
      if (this.powerLed) this.powerLed.setFillStyle(0x33cc33);
    });

    this.time.delayedCall(400, () => {
      if (this.skipped) { flash.destroy(); return; }
      flash.setAlpha(0.7);
      this.tweens.add({
        targets: flash, alpha: 0, duration: 500, ease: 'Power2',
        onComplete: () => flash.destroy(),
      });
    });

    const warmth = this.add.rectangle(
      SCREEN_X + SCREEN_W / 2, SCREEN_Y + SCREEN_H / 2,
      SCREEN_W, SCREEN_H, AMBER_HEX, 0
    ).setDepth(9);
    this.screenContainer.add(warmth);
    this.time.delayedCall(700, () => {
      if (this.skipped) return;
      this.tweens.add({ targets: warmth, alpha: 0.03, duration: 400 });
    });

    this.time.delayedCall(1200, () => {
      if (this.skipped) return;
      this.showCursor(SCREEN_X + TEXT_PAD, SCREEN_Y + TEXT_PAD);
      this.time.delayedCall(1500, () => {
        if (this.skipped) return;
        this.phaseTypeHeader();
      });
    });
  }

  // ═══════════════════════════════════════════
  // SEQUENCE PHASES
  // ═══════════════════════════════════════════

  private phaseTypeHeader(): void {
    this.typeLines([
      'D.A.S.H. SYSTEMS TERMINAL v3.1',
      '(C) 1997 DEPT. OF ADMINISTRATIVE SERVICES',
      'AUTHORIZED USE ONLY',
      '',
      '> INITIATING MODERNIZATION PROTOCOL...',
      '> SECURE TERMINAL ',
    ], 35, () => {
      if (this.skipped) return;
      this.phaseVersionGlitch();
    });
  }

  private phaseVersionGlitch(): void {
    this.typeText('v0.', 35, () => {
      if (this.skipped) return;
      let typingSound: Phaser.Sound.BaseSound | null = null;
      if (this.cache.audio.exists('sfx_terminal_typing')) {
        typingSound = this.sound.add('sfx_terminal_typing', { volume: 0.2 });
        typingSound.play();
      }
      const zeroes = '000000000000000';
      let i = 0;
      const typeZero = () => {
        if (this.skipped || i >= zeroes.length) {
          if (!this.skipped) {
            typingSound?.stop();
            this.appendChar('1'); this.playBlip(0.15); this.updateCursorPos();
            if (this.cache.audio.exists('voice_casey')) this.sound.play('voice_casey', { volume: 0.25 });
            this.time.delayedCall(800, () => { if (!this.skipped) this.phaseBackspace(); });
          }
          return;
        }
        this.appendChar('0');
        this.playBlip(0.06 + (i / zeroes.length) * 0.1);
        this.updateCursorPos();
        i++;
        this.time.delayedCall(80 - (i / zeroes.length) * 55, typeZero);
      };
      typeZero();
    });
  }

  private phaseBackspace(): void {
    if (this.cache.audio.exists('sfx_backspace_burst')) this.sound.play('sfx_backspace_burst', { volume: 0.3 });
    const target = this.currentString.indexOf('v0.') + 3;
    const deleteCount = this.currentString.length - target - 1;
    let deleted = 0;
    const deleteOne = () => {
      if (this.skipped || deleted >= deleteCount) {
        if (!this.skipped) this.time.delayedCall(500, () => { if (!this.skipped) this.phaseSatisfied(); });
        return;
      }
      const str = this.currentString;
      this.currentString = str.slice(0, str.length - 2) + str.slice(str.length - 1);
      this.terminalText?.setText(this.currentString);
      this.glowText?.setText(this.currentString);
      this.updateCursorPos();
      deleted++;
      this.time.delayedCall(30, deleteOne);
    };
    deleteOne();
  }

  private phaseSatisfied(): void {
    if (this.cache.audio.exists('voice_casey')) {
      const snd = this.sound.add('voice_casey', { volume: 0.2 });
      snd.play();
      this.time.delayedCall(300, () => snd.stop());
    }
    this.time.delayedCall(1000, () => { if (!this.skipped) this.phaseShowTitle(); });
  }

  private phaseShowTitle(): void {
    this.hideCursor();
    const sep = '==========================================';
    this.currentString += '\n\n' + sep;
    this.terminalText?.setText(this.currentString);
    this.glowText?.setText(this.currentString);

    const titleBox = [
      '',
      '  DEPLOY TO PRODUCTION',
      '  A Code for America Adventure',
      '',
      sep,
    ].join('\n');

    this.time.delayedCall(400, () => {
      if (this.skipped) return;
      this.currentString += '\n' + titleBox;
      this.terminalText?.setText(this.currentString);
      this.glowText?.setText(this.currentString);
      this.time.delayedCall(600, () => { if (!this.skipped) this.showMenu(); });
    });
  }

  // ═══════════════════════════════════════════
  // MENU — simple text objects, no setInteractive
  // ═══════════════════════════════════════════

  private showMenu(): void {
    this.menuReady = true;
    const hasSave = GameState.getInstance().hasSave();
    const lines = this.currentString.split('\n');
    const textBottom = SCREEN_Y + TEXT_PAD + lines.length * LINE_H;
    const menuY = Math.min(textBottom + 24, SCREEN_Y + SCREEN_H - 50);

    // NEW GAME text — depth 60, above overlays
    this.newGameText = this.add.text(SCREEN_X + TEXT_PAD, menuY, '> NEW GAME', {
      fontFamily: FONT, fontSize: `${FONT_SIZE}px`, color: AMBER,
    }).setDepth(60);

    this.newGameBlink = this.add.text(
      SCREEN_X + TEXT_PAD + this.newGameText.width + 4, menuY, '_', {
      fontFamily: FONT, fontSize: `${FONT_SIZE}px`, color: AMBER,
    }).setDepth(60).setAlpha(0);

    if (hasSave) {
      this.continueText = this.add.text(SCREEN_X + TEXT_PAD, menuY + LINE_H + 4, '> CONTINUE', {
        fontFamily: FONT, fontSize: `${FONT_SIZE}px`, color: AMBER,
      }).setDepth(60);

      this.continueBlink = this.add.text(
        SCREEN_X + TEXT_PAD + this.continueText.width + 4, menuY + LINE_H + 4, '_', {
        fontFamily: FONT, fontSize: `${FONT_SIZE}px`, color: AMBER,
      }).setDepth(60).setAlpha(0);
    }
  }

  // ═══════════════════════════════════════════
  // BOOT SEQUENCE
  // ═══════════════════════════════════════════

  private startBootSequence(loadSave: boolean): void {
    this.menuReady = false;

    // Remove menu text
    this.newGameText?.destroy(); this.newGameText = null;
    this.newGameBlink?.destroy(); this.newGameBlink = null;
    this.continueText?.destroy(); this.continueText = null;
    this.continueBlink?.destroy(); this.continueBlink = null;

    this.currentString = '';
    this.terminalText?.setText('');
    this.glowText?.setText('');
    this.hideCursor();

    const lineCount = loadSave ? Phaser.Math.Between(3, 4) : Phaser.Math.Between(8, 10);
    const lines = Phaser.Utils.Array.Shuffle([...bootLinesData.lines]).slice(0, lineCount);

    let typingSound: Phaser.Sound.BaseSound | null = null;
    if (this.cache.audio.exists('sfx_terminal_typing')) {
      typingSound = this.sound.add('sfx_terminal_typing', { loop: true, volume: 0.15 });
      typingSound.play();
    }

    let i = 0;
    const showLine = () => {
      if (i >= lines.length) {
        typingSound?.stop();
        const endMsg = loadSave ? bootLinesData.continueEnd : bootLinesData.newGameEnd;
        this.time.delayedCall(300, () => {
          this.currentString += '\n\n' + endMsg;
          this.terminalText?.setText(this.currentString);
          this.glowText?.setText(this.currentString);
          // Wait for any click to power off
          this.input.once('pointerdown', () => this.crtPowerOff(loadSave));
        });
        return;
      }
      this.currentString += (this.currentString ? '\n' : '') + lines[i];
      this.terminalText?.setText(this.currentString);
      this.glowText?.setText(this.currentString);
      this.playBlip(0.06);
      i++;
      this.time.delayedCall(80 + Math.random() * 60, showLine);
    };
    showLine();
  }

  // ═══════════════════════════════════════════
  // CRT POWER OFF
  // ═══════════════════════════════════════════

  private crtPowerOff(loadSave: boolean): void {
    if (this.transitioning) return;
    this.transitioning = true;
    if (this.cache.audio.exists('sfx_crt_off')) this.sound.play('sfx_crt_off', { volume: 0.4 });
    if (this.powerLed) this.powerLed.setFillStyle(0x222222);

    const cx = SCREEN_X + SCREEN_W / 2;
    const cy = SCREEN_Y + SCREEN_H / 2;
    const glow = this.add.rectangle(cx, cy, SCREEN_W, SCREEN_H, 0xffffff, 0.3).setDepth(54);

    this.tweens.add({
      targets: [this.screenContainer, this.overlayContainer, glow],
      scaleY: 0.005, duration: 300, ease: 'Power2',
      onUpdate: () => {
        this.screenContainer.setPosition(0, cy * (1 - this.screenContainer.scaleY));
        this.overlayContainer.setPosition(0, cy * (1 - this.overlayContainer.scaleY));
        glow.setPosition(cx, cy);
      },
      onComplete: () => {
        this.screenContainer.setVisible(false);
        this.overlayContainer.setVisible(false);
        glow.destroy();

        const line = this.add.rectangle(cx, cy, SCREEN_W, 2, 0xffffff, 0.8).setDepth(54);
        this.tweens.add({
          targets: line, width: 3, alpha: 1, duration: 200, ease: 'Power3',
          onComplete: () => {
            this.tweens.add({
              targets: line, alpha: 0, duration: 400, ease: 'Power2',
              onComplete: () => {
                line.destroy();
                this.time.delayedCall(500, () => {
                  this.scene.start('LobbyScene', loadSave ? { loadSave: true } : undefined);
                });
              },
            });
          },
        });
      },
    });
  }

  // ═══════════════════════════════════════════
  // SKIP TO MENU
  // ═══════════════════════════════════════════

  private skipToMenu(): void {
    this.skipped = true;
    this.sound.stopAll();
    this.tweens.killAll();
    this.screenContainer.removeAll(true);

    this.screenContainer.add(
      this.add.rectangle(SCREEN_X + SCREEN_W / 2, SCREEN_Y + SCREEN_H / 2, SCREEN_W, SCREEN_H, SCREEN_BG)
    );
    this.screenContainer.add(
      this.add.rectangle(SCREEN_X + SCREEN_W / 2, SCREEN_Y + SCREEN_H / 2, SCREEN_W, SCREEN_H, AMBER_HEX, 0.03).setDepth(9)
    );

    const sep = '==========================================';
    this.currentString =
      'D.A.S.H. SYSTEMS TERMINAL v3.1\n' +
      '(C) 1997 DEPT. OF ADMINISTRATIVE SERVICES\n' +
      'AUTHORIZED USE ONLY\n\n' +
      '> INITIATING MODERNIZATION PROTOCOL...\n' +
      '> SECURE TERMINAL v0.1\n\n' +
      sep + '\n\n' +
      '  DEPLOY TO PRODUCTION\n' +
      '  A Code for America Adventure\n\n' +
      sep;

    this.glowText = this.add.text(SCREEN_X + TEXT_PAD - 1, SCREEN_Y + TEXT_PAD - 1, this.currentString, {
      fontFamily: FONT, fontSize: `${FONT_SIZE}px`, color: GLOW_COLOR,
      wordWrap: { width: SCREEN_W - TEXT_PAD * 2 }, lineSpacing: LINE_H - FONT_SIZE,
    }).setAlpha(GLOW_ALPHA).setDepth(11);
    this.screenContainer.add(this.glowText);

    this.terminalText = this.add.text(SCREEN_X + TEXT_PAD, SCREEN_Y + TEXT_PAD, this.currentString, {
      fontFamily: FONT, fontSize: `${FONT_SIZE}px`, color: AMBER,
      wordWrap: { width: SCREEN_W - TEXT_PAD * 2 }, lineSpacing: LINE_H - FONT_SIZE,
    }).setDepth(12);
    this.screenContainer.add(this.terminalText);

    this.cursorBlock = this.add.rectangle(0, 0, CHAR_W - 1, FONT_SIZE + 2, AMBER_HEX)
      .setOrigin(0, 0).setVisible(false).setDepth(13);
    this.screenContainer.add(this.cursorBlock);

    if (this.powerLed) this.powerLed.setFillStyle(0x33cc33);

    this.overlayContainer.removeAll(true);
    if (!this.textures.exists('scanline_tile')) {
      const sg = this.add.graphics();
      sg.fillStyle(0x000000, SCANLINE_ALPHA);
      for (let y = 0; y < 4; y += 2) sg.fillRect(0, y, SCREEN_W, 1);
      sg.generateTexture('scanline_tile', SCREEN_W, 4);
      sg.destroy();
    }
    this.overlayContainer.add(
      this.add.tileSprite(SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H, 'scanline_tile')
        .setOrigin(0, 0).setDepth(51)
    );
    this.screenFlash = this.add.rectangle(
      SCREEN_X + SCREEN_W / 2, SCREEN_Y + SCREEN_H / 2,
      SCREEN_W, SCREEN_H, 0x000000, 0
    ).setDepth(53);
    this.overlayContainer.add(this.screenFlash);
    this.startScreenFlicker();

    this.showMenu();
  }

  // ═══════════════════════════════════════════
  // EASTER EGGS — bounds-based, no setInteractive
  // ═══════════════════════════════════════════

  private checkEasterEggClick(px: number, py: number): boolean {
    const W = 640, H = 360;
    const badgeCY = H - BOTTOM_BEZEL / 2;

    // 1. Power LED (bottom-left bezel)
    if (Math.abs(px - (BEZEL + 12)) < 10 && Math.abs(py - badgeCY) < 10) {
      this.triggerEggLed();
      return true;
    }

    // 2. Model number (bottom-right bezel) — needs triple click
    if (px > W - BEZEL - 80 && px < W - BEZEL && Math.abs(py - badgeCY) < 10) {
      this.triggerEggModel();
      return true;
    }

    // 3. Screen top-right corner
    if (px > SCREEN_X + SCREEN_W - 40 && px < SCREEN_X + SCREEN_W
      && py > SCREEN_Y && py < SCREEN_Y + 40) {
      this.triggerEggCorner();
      return true;
    }

    return false;
  }

  private triggerEggLed(): void {
    if (this.eggLedUsed || this.eggLedActive || this.transitioning || this.eggModelActive) return;
    this.eggLedUsed = true;
    this.eggLedActive = true;
    if (this.cache.audio.exists('sfx_crt_static')) this.sound.play('sfx_crt_static', { volume: 0.4 });
    const savedText = this.currentString;
    const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789ABCDEF';
    const scramble = () => {
      let s = '';
      for (let i = 0; i < 120; i++) {
        if (i % 30 === 0 && i > 0) s += '\n';
        s += chars[Math.floor(Math.random() * chars.length)];
      }
      return s;
    };
    this.time.addEvent({ delay: 50, repeat: 9, callback: () => {
      this.terminalText?.setText(scramble());
      this.glowText?.setText(scramble());
    }});
    this.time.delayedCall(500, () => {
      const msg = '\n\n\n  ERROR 47: EMPLOYEE MORALE NOT FOUND\n\n  HAVE YOU TRIED TURNING THE GOVERNMENT\n  OFF AND BACK ON AGAIN?\n';
      this.terminalText?.setText(msg);
      this.glowText?.setText(msg);
      this.time.delayedCall(2000, () => {
        this.currentString = savedText;
        this.terminalText?.setText(savedText);
        this.glowText?.setText(savedText);
        this.eggLedActive = false;
      });
    });
  }

  private triggerEggModel(): void {
    if (this.eggModelActive || this.transitioning || this.eggLedActive) return;
    const now = Date.now();
    if (now - this.eggModelLastClick > 500) this.eggModelClicks = 0;
    this.eggModelLastClick = now;
    this.eggModelClicks++;
    if (this.eggModelClicks < 3) return;
    this.eggModelClicks = 0;
    this.eggModelActive = true;
    const savedText = this.currentString;
    const adventureText =
      '> YOU ARE IN A DIMLY LIT SERVER ROOM.\n' +
      '> THERE IS A BLINKING MAINFRAME TO THE NORTH.\n' +
      '> A FORGOTTEN SANDWICH SITS ON A RACK.\n' +
      '> EXITS: NORTH, SOUTH\n' +
      '> ';
    this.currentString = adventureText;
    this.terminalText?.setText(adventureText);
    this.glowText?.setText(adventureText);
    this.updateCursorPos();
    this.showCursor(this.cursorBlock!.x, this.cursorBlock!.y);
    let typed = '';
    const keyHandler = (event: KeyboardEvent) => {
      if (!this.eggModelActive) return;
      if (event.key === 'Enter') {
        this.input.keyboard?.off('keydown', keyHandler as any);
        this.respondToAdventure(savedText);
        return;
      }
      if (event.key === 'Backspace') {
        if (typed.length > 0) {
          typed = typed.slice(0, -1);
          this.currentString = adventureText + typed;
          this.terminalText?.setText(this.currentString);
          this.glowText?.setText(this.currentString);
          this.updateCursorPos();
        }
        return;
      }
      if (event.key.length === 1) {
        typed += event.key.toUpperCase();
        this.currentString = adventureText + typed;
        this.terminalText?.setText(this.currentString);
        this.glowText?.setText(this.currentString);
        this.playBlip(0.06);
        this.updateCursorPos();
      }
    };
    this.input.keyboard?.on('keydown', keyHandler);
    this.time.delayedCall(2000, () => {
      if (!this.eggModelActive) return;
      this.input.once('pointerdown', () => {
        if (!this.eggModelActive) return;
        this.input.keyboard?.off('keydown', keyHandler as any);
        this.respondToAdventure(savedText);
      });
    });
  }

  private respondToAdventure(savedText: string): void {
    this.hideCursor();
    if (this.cache.audio.exists('voice_kevin')) this.sound.play('voice_kevin', { volume: 0.3 });
    const response = this.currentString + '\n\n  ACCESS DENIED. INSUFFICIENT CLEARANCE.\n  RETURNING TO TERMINAL...\n';
    this.terminalText?.setText(response);
    this.glowText?.setText(response);
    this.time.delayedCall(2500, () => {
      this.currentString = savedText;
      this.terminalText?.setText(savedText);
      this.glowText?.setText(savedText);
      this.eggModelActive = false;
    });
  }

  private triggerEggCorner(): void {
    if (this.eggCatShown || this.transitioning || this.eggLedActive || this.eggModelActive) return;
    this.eggCornerClicks++;
    if (this.eggCornerClicks < 5) return;
    this.eggCatShown = true;

    const catGfx = this.add.graphics();
    catGfx.fillStyle(AMBER_HEX, 1);
    catGfx.fillRect(1, 2, 5, 3);
    catGfx.fillRect(5, 1, 3, 3);
    catGfx.fillRect(5, 0, 1, 1);
    catGfx.fillRect(7, 0, 1, 1);
    catGfx.fillRect(0, 0, 1, 3);
    catGfx.fillRect(2, 5, 1, 1);
    catGfx.fillRect(4, 5, 1, 1);
    catGfx.generateTexture('patches_cat', 9, 7);
    catGfx.destroy();

    const catY = SCREEN_Y + SCREEN_H - 14;
    const cat = this.add.image(SCREEN_X + SCREEN_W + 10, catY, 'patches_cat')
      .setOrigin(0, 1).setDepth(15).setScale(2);
    const label = this.add.text(SCREEN_X + SCREEN_W + 10, catY - 16, 'PATCHES?', {
      fontFamily: FONT, fontSize: '5px', color: AMBER,
    }).setOrigin(0, 1).setDepth(15).setAlpha(0);

    this.tweens.add({
      targets: [cat, label], x: SCREEN_X - 30, duration: 4000, ease: 'Linear',
      onStart: () => {
        this.time.delayedCall(600, () => {
          this.tweens.add({ targets: label, alpha: 1, duration: 300 });
        });
      },
      onComplete: () => { cat.destroy(); label.destroy(); },
    });
  }

  // ═══════════════════════════════════════════
  // TYPING HELPERS
  // ═══════════════════════════════════════════

  private typeLines(lines: string[], speed: number, onDone: () => void): void {
    let lineIdx = 0;
    const nextLine = () => {
      if (this.skipped || lineIdx >= lines.length) { onDone(); return; }
      if (lineIdx > 0) {
        this.currentString += '\n';
        this.terminalText?.setText(this.currentString);
        this.glowText?.setText(this.currentString);
      }
      this.typeText(lines[lineIdx], speed, () => { lineIdx++; nextLine(); });
    };
    nextLine();
  }

  private typeText(text: string, speed: number, onDone: () => void): void {
    let i = 0;
    const typeChar = () => {
      if (this.skipped || i >= text.length) { onDone(); return; }
      this.appendChar(text[i]);
      if (text[i] !== ' ') this.playBlip(0.06);
      this.updateCursorPos();
      i++;
      this.time.delayedCall(speed, typeChar);
    };
    typeChar();
  }

  private appendChar(ch: string): void {
    this.currentString += ch;
    this.terminalText?.setText(this.currentString);
    this.glowText?.setText(this.currentString);
  }

  // ═══════════════════════════════════════════
  // CURSOR
  // ═══════════════════════════════════════════

  private showCursor(x: number, y: number): void {
    if (!this.cursorBlock) return;
    this.cursorBlock.setPosition(x, y).setVisible(true);
    this.cursorTween?.destroy();
    this.cursorTween = this.tweens.add({
      targets: this.cursorBlock,
      alpha: { from: 1, to: 0 }, duration: 530,
      yoyo: true, repeat: -1,
    });
  }

  private hideCursor(): void {
    this.cursorTween?.destroy();
    this.cursorTween = null;
    this.cursorBlock?.setVisible(false);
  }

  private updateCursorPos(): void {
    if (!this.terminalText || !this.cursorBlock) return;
    const lines = this.currentString.split('\n');
    const lastLine = lines[lines.length - 1];
    const x = this.terminalText.x + lastLine.length * CHAR_W;
    const y = this.terminalText.y + (lines.length - 1) * LINE_H;
    this.cursorBlock.setPosition(x, y).setVisible(true);
  }

  // ═══════════════════════════════════════════
  // AUDIO
  // ═══════════════════════════════════════════

  private playBlip(volume: number): void {
    if (this.cache.audio.exists('sfx_text_blip')) {
      this.sound.play('sfx_text_blip', { volume });
    }
  }
}
