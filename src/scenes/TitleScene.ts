import Phaser from 'phaser';
import { GameState } from '../engine/GameState';
import { CursorManager } from '../engine/CursorManager';
import { DebugMenu } from '../engine/DebugMenu';
import { isTouchDevice } from '../engine/TouchDetector';
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
import filesystemData from '../data/terminal_filesystem.json';

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

// Terminal dimensions
const TERM_COLS = Math.floor((SCREEN_W - TEXT_PAD * 2) / CHAR_W); // ~69
const TERM_ROWS = Math.floor((SCREEN_H - TEXT_PAD * 2) / LINE_H); // ~16

// Filesystem types
interface FSNode {
  type: 'dir' | 'file' | 'executable';
  children?: Record<string, FSNode>;
  content?: string[];
  hidden?: boolean;
  saveOnly?: boolean;
  runResponse?: string[];
  triggerAction?: string;
}

export class TitleScene extends Phaser.Scene {
  private skipped = false;
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
  private debugMenu: DebugMenu | null = null;
  private powerLed: Phaser.GameObjects.Arc | null = null;
  private screenFlash: Phaser.GameObjects.Rectangle | null = null;

  // Terminal state
  private terminalMode = false;
  private inputBuffer = '';
  private commandHistory: string[] = [];
  private historyIndex = -1;
  private outputLines: string[] = [];
  private filesystem!: Record<string, FSNode>;
  private currentPath: string[] = ['home', 'cpark']; // start at ~
  private keyboardHandler: ((event: KeyboardEvent) => void) | null = null;

  // Easter egg state
  private eggLedUsed = false;
  private eggLedActive = false;
  private eggModelClicks = 0;
  private eggModelLastClick = 0;
  private eggModelActive = false;
  private eggCornerClicks = 0;
  private eggCatShown = false;
  private mobileCommandPalette: Phaser.GameObjects.Container | null = null;

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
    this.sound.stopAll();
    this.cameras.main.setBackgroundColor('#1a1a1a');
    this.skipped = false;
    this.transitioning = false;
    this.currentString = '';
    this.terminalMode = false;
    this.inputBuffer = '';
    this.commandHistory = [];
    this.historyIndex = -1;
    this.outputLines = [];
    this.currentPath = ['home', 'cpark'];
    this.filesystem = filesystemData.filesystem as unknown as Record<string, FSNode>;
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
    this.debugMenu = new DebugMenu(this);

    // ── SINGLE GLOBAL CLICK HANDLER ──
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) return;
      this.handleClick(pointer);
    });
  }

  update(): void {
    if (this.cursorManager) {
      const pointer = this.input.activePointer;
      this.cursorManager.update(pointer);
      this.debugMenu?.update();
      // No special cursor states in terminal mode
      if (!this.terminalMode) {
        this.cursorManager.setState('default');
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

    // If terminal is showing, only check easter eggs
    if (this.terminalMode) {
      this.checkEasterEggClick(px, py);
      return;
    }

    // During intro sequence: check easter eggs, then skip
    if (!this.skipped) {
      if (this.checkEasterEggClick(px, py)) return;
      this.skipToTerminal();
    }
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
      const alpha = (1 - i / steps) * 0.08;
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
      '  A Civic Tech Adventure',
      '',
      sep,
    ].join('\n');

    this.time.delayedCall(400, () => {
      if (this.skipped) return;
      this.currentString += '\n' + titleBox;
      this.terminalText?.setText(this.currentString);
      this.glowText?.setText(this.currentString);
      this.time.delayedCall(600, () => { if (!this.skipped) this.showTerminal(); });
    });
  }

  // ═══════════════════════════════════════════
  // TERMINAL — interactive shell (replaces menu)
  // ═══════════════════════════════════════════

  private showTerminal(): void {
    this.terminalMode = true;
    this.hideCursor();

    // Clear screen and show condensed header + MOTD + prompt
    this.outputLines = [];
    const hasSave = GameState.getInstance().hasSave();

    // Condensed header
    this.appendOutput(['D.A.S.H. SYSTEMS v3.1 — AUTHORIZED USE ONLY', '']);

    // MOTD
    const motdLines = hasSave
      ? filesystemData.motdWithSave as string[]
      : filesystemData.motd as string[];
    this.appendOutput(motdLines);
    this.appendOutput(['']);

    this.inputBuffer = '';
    this.historyIndex = -1;

    this.redrawScreen();
    this.installKeyboardHandler();

    if (isTouchDevice()) {
      this.createMobileCommandPalette();
    }
  }

  private createMobileCommandPalette(): void {
    this.destroyMobileCommandPalette();

    const commands = [
      { label: 'ls', cmd: 'ls' },
      { label: 'cat motd', cmd: 'cat motd' },
      { label: 'resume', cmd: 'resume' },
      { label: 'help', cmd: 'help' },
      { label: 'clear', cmd: 'clear' },
      { label: 'Skip >', cmd: null }, // ESC equivalent
    ];

    const y = BOTTOM_BEZEL > 0 ? 360 - BOTTOM_BEZEL / 2 - 2 : 348;
    const totalW = 584;
    const btnW = Math.floor(totalW / commands.length) - 4;
    const startX = BEZEL + 2;

    this.mobileCommandPalette = this.add.container(0, 0).setDepth(100).setScrollFactor(0);

    commands.forEach((item, i) => {
      const x = startX + i * (btnW + 4) + btnW / 2;

      const bg = this.add.rectangle(x, y, btnW, 16, 0x1a1a2e, 0.85);
      bg.setStrokeStyle(1, 0x444466);
      bg.setInteractive();
      this.mobileCommandPalette!.add(bg);

      const label = this.add.text(x, y, item.label, {
        fontFamily: 'monospace', fontSize: '7px', color: '#FFD000', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.mobileCommandPalette!.add(label);

      bg.on('pointerdown', () => {
        if (!this.terminalMode || this.transitioning) return;

        if (item.cmd === null) {
          // Skip — same as ESC
          if (this.cache.audio.exists('sfx_select')) this.sound.play('sfx_select', { volume: 0.25 });
          this.terminalMode = false;
          this.removeKeyboardHandler();
          this.startBootSequence(false);
          return;
        }

        // Simulate typing the command and pressing Enter
        this.inputBuffer = item.cmd;
        this.redrawScreen();
        // Small delay to show the typed command, then execute
        this.time.delayedCall(100, () => {
          if (!this.terminalMode) return;
          this.commandHistory.unshift(item.cmd!);
          if (this.commandHistory.length > 50) this.commandHistory.pop();
          this.historyIndex = -1;
          this.appendOutput([this.getPromptString() + this.inputBuffer]);
          const input = this.inputBuffer;
          this.inputBuffer = '';
          if (this.cache.audio.exists('sfx_select')) this.sound.play('sfx_select', { volume: 0.15 });
          this.executeCommand(input);
        });
      });
    });
  }

  private destroyMobileCommandPalette(): void {
    if (this.mobileCommandPalette) {
      this.mobileCommandPalette.destroy();
      this.mobileCommandPalette = null;
    }
  }

  private skipToTerminal(): void {
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

    this.showTerminal();
  }

  // ═══════════════════════════════════════════
  // KEYBOARD HANDLER — terminal input
  // ═══════════════════════════════════════════

  private installKeyboardHandler(): void {
    this.removeKeyboardHandler();

    this.keyboardHandler = (event: KeyboardEvent) => {
      if (!this.terminalMode || this.transitioning || this.eggLedActive || this.eggModelActive) return;

      event.preventDefault();

      if (event.key === 'Escape') {
        // ESC skips straight to game
        if (this.cache.audio.exists('sfx_select')) this.sound.play('sfx_select', { volume: 0.25 });
        this.terminalMode = false;
        this.removeKeyboardHandler();
        this.startBootSequence(false);
        return;
      }

      if (event.key === 'Enter') {
        const cmd = this.inputBuffer.trim();
        if (cmd.length > 0) {
          this.commandHistory.unshift(cmd);
          if (this.commandHistory.length > 50) this.commandHistory.pop();
        }
        this.historyIndex = -1;
        // Show the command as submitted
        this.appendOutput([this.getPromptString() + this.inputBuffer]);
        const input = this.inputBuffer;
        this.inputBuffer = '';
        if (this.cache.audio.exists('sfx_select')) this.sound.play('sfx_select', { volume: 0.15 });
        this.executeCommand(input);
        return;
      }

      if (event.key === 'Backspace') {
        if (this.inputBuffer.length > 0) {
          this.inputBuffer = this.inputBuffer.slice(0, -1);
          this.redrawScreen();
        }
        return;
      }

      if (event.key === 'ArrowUp') {
        if (this.commandHistory.length > 0) {
          this.historyIndex = Math.min(this.historyIndex + 1, this.commandHistory.length - 1);
          this.inputBuffer = this.commandHistory[this.historyIndex];
          this.redrawScreen();
        }
        return;
      }

      if (event.key === 'ArrowDown') {
        if (this.historyIndex > 0) {
          this.historyIndex--;
          this.inputBuffer = this.commandHistory[this.historyIndex];
        } else {
          this.historyIndex = -1;
          this.inputBuffer = '';
        }
        this.redrawScreen();
        return;
      }

      if (event.key === 'Tab') {
        this.handleTabComplete();
        return;
      }

      // Printable characters
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        this.inputBuffer += event.key;
        this.playBlip(0.06);
        this.redrawScreen();
      }
    };

    window.addEventListener('keydown', this.keyboardHandler);
  }

  private removeKeyboardHandler(): void {
    if (this.keyboardHandler) {
      window.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
    this.destroyMobileCommandPalette();
  }

  // ═══════════════════════════════════════════
  // COMMAND EXECUTION
  // ═══════════════════════════════════════════

  private executeCommand(input: string): void {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      this.redrawScreen();
      return;
    }

    // Check for ./ execution
    if (trimmed.startsWith('./')) {
      this.handleRun(trimmed.slice(2));
      return;
    }

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'ls': this.handleLs(args); break;
      case 'cd': this.handleCd(args); break;
      case 'cat': this.handleCat(args); break;
      case 'pwd': this.appendOutput(['/' + this.currentPath.join('/')]); break;
      case 'help': this.handleHelp(); break;
      case 'clear': this.handleClear(); break;
      case 'resume': this.handleResume(); break;
      case 'whoami':
      case 'date':
      case 'sudo':
      case 'rm':
      case 'vim':
      case 'vi':
      case 'nano':
      case 'exit':
      case 'logout':
      case 'ping':
      case 'man':
      case 'ssh':
      case 'iddqd':
      case 'idkfa':
      case 'grep':
      case 'find':
      case 'echo':
      case 'mkdir':
      case 'touch':
      case 'chmod':
      case 'wget':
      case 'curl':
        this.handleSpecial(cmd, args, trimmed);
        break;
      default:
        this.handleUnknown(cmd);
        break;
    }

    this.redrawScreen();
  }

  // ═══════════════════════════════════════════
  // COMMAND HANDLERS
  // ═══════════════════════════════════════════

  private handleLs(args: string[]): void {
    const showHidden = args.some(a => a.includes('a'));
    const node = this.getNodeAtPath(this.currentPath);
    if (!node || node.type !== 'dir' || !node.children) {
      this.appendOutput(['ls: cannot access: Not a directory']);
      return;
    }

    const hasSave = GameState.getInstance().hasSave();
    const entries: string[] = [];
    for (const [name, child] of Object.entries(node.children)) {
      if (child.saveOnly && !hasSave) continue;
      if (child.hidden && !showHidden) continue;
      if (child.type === 'dir') {
        entries.push(name + '/');
      } else if (child.type === 'executable') {
        entries.push(name + '*');
      } else {
        entries.push(name);
      }
    }

    if (entries.length === 0) {
      this.appendOutput(['(empty directory)']);
      return;
    }

    // Multi-column output
    const maxLen = Math.max(...entries.map(e => e.length));
    const colWidth = maxLen + 2;
    const cols = Math.max(1, Math.floor(TERM_COLS / colWidth));
    const lines: string[] = [];
    for (let i = 0; i < entries.length; i += cols) {
      const row = entries.slice(i, i + cols);
      lines.push(row.map(e => e.padEnd(colWidth)).join('').trimEnd());
    }
    this.appendOutput(lines);
  }

  private handleCd(args: string[]): void {
    if (args.length === 0 || args[0] === '~') {
      this.currentPath = ['home', 'cpark'];
      return;
    }

    const target = args[0];
    const newPath = this.resolvePathSegments(target);

    if (!newPath) {
      this.appendOutput([`cd: ${target}: No such directory`]);
      return;
    }

    const node = this.getNodeAtPath(newPath);
    if (!node || node.type !== 'dir') {
      this.appendOutput([`cd: ${target}: Not a directory`]);
      return;
    }

    this.currentPath = newPath;
  }

  private handleCat(args: string[]): void {
    if (args.length === 0) {
      this.appendOutput(['cat: missing file operand']);
      return;
    }

    const filename = args[0];
    const resolved = this.resolvePathSegments(filename);
    if (!resolved) {
      this.appendOutput([`cat: ${filename}: No such file`]);
      return;
    }

    const node = this.getNodeAtPath(resolved);
    if (!node) {
      this.appendOutput([`cat: ${filename}: No such file`]);
      return;
    }
    if (node.type === 'dir') {
      this.appendOutput([`cat: ${filename}: Is a directory`]);
      return;
    }

    const hasSave = GameState.getInstance().hasSave();
    if (node.saveOnly && !hasSave) {
      this.appendOutput([`cat: ${filename}: No such file`]);
      return;
    }

    if (node.content) {
      this.appendOutput(node.content);
    } else {
      this.appendOutput(['(empty file)']);
    }
  }

  private handleRun(filename: string): void {
    if (!filename) {
      this.appendOutput(['bash: ./: Is a directory']);
      return;
    }

    const resolved = this.resolvePathSegments(filename);
    if (!resolved) {
      this.appendOutput([`bash: ./${filename}: No such file`]);
      return;
    }

    const node = this.getNodeAtPath(resolved);
    if (!node) {
      this.appendOutput([`bash: ./${filename}: No such file`]);
      return;
    }

    if (node.type !== 'executable') {
      this.appendOutput([`bash: ./${filename}: Permission denied`]);
      return;
    }

    // Show run response
    if (node.runResponse) {
      this.appendOutput(node.runResponse);
    }

    // Handle trigger actions
    if (node.triggerAction === 'start_game') {
      this.redrawScreen();
      this.terminalMode = false;
      this.removeKeyboardHandler();
      // Small delay to show the output, then boot
      this.time.delayedCall(800, () => {
        this.startBootSequence(false);
      });
      return;
    }

    if (node.triggerAction === 'denied_sfx') {
      if (this.cache.audio.exists('sfx_crt_static')) {
        this.sound.play('sfx_crt_static', { volume: 0.5 });
      }
    }
  }

  private handleHelp(): void {
    this.appendOutput(filesystemData.helpText as string[]);
  }

  private handleClear(): void {
    this.outputLines = [];
  }

  private handleResume(): void {
    const hasSave = GameState.getInstance().hasSave();
    if (!hasSave) {
      this.appendOutput(['No saved session found.']);
      return;
    }
    if (this.cache.audio.exists('sfx_select')) this.sound.play('sfx_select', { volume: 0.25 });
    this.appendOutput(['Restoring session...']);
    this.redrawScreen();
    this.terminalMode = false;
    this.removeKeyboardHandler();
    this.time.delayedCall(500, () => {
      this.startBootSequence(true);
    });
  }

  private handleSpecial(cmd: string, args: string[], fullInput: string): void {
    switch (cmd) {
      case 'whoami':
        this.appendOutput(['cpark']);
        break;
      case 'date':
        this.appendOutput(['Mon Mar 15 08:47:23 EST 1997',
          'NOTE: Daylight savings disputed by HR.']);
        break;
      case 'sudo':
        if (fullInput.toLowerCase() === 'sudo make me a sandwich') {
          this.appendOutput(['Okay.']);
        } else {
          this.appendOutput(['Nice try. Clearance level: INTERN.']);
        }
        break;
      case 'rm':
        this.appendOutput(['Deleting government property is a',
          'federal offense. Incident logged.']);
        if (this.cache.audio.exists('sfx_crt_static')) {
          this.sound.play('sfx_crt_static', { volume: 0.15 });
        }
        break;
      case 'vim':
      case 'vi':
        this.appendOutput(['Not installed. This machine has ed.',
          'Nobody knows how to use ed.']);
        break;
      case 'nano':
        this.appendOutput(['nano: command not found.',
          'Try ed. Just kidding. Don\'t.']);
        break;
      case 'exit':
      case 'logout':
        this.appendOutput(['You can\'t exit. It\'s your first day.',
          'Badge has been electronically locked.']);
        break;
      case 'ping':
        this.appendOutput(['NETWORK UNREACHABLE.',
          'Router behind firewall behind firewall.',
          'Submit Form 14-B for network access.']);
        break;
      case 'man':
        this.appendOutput(['Documentation budget was cut in 1994.',
          'Ask Kevin. He remembers everything.']);
        break;
      case 'ssh':
        this.appendOutput(['Connection refused.',
          'Submit Form 22-C to request remote access.',
          'Current wait time: 6-8 fiscal quarters.']);
        break;
      case 'iddqd':
      case 'idkfa':
        this.appendOutput(['Cheat codes disabled on government',
          'terminals per Executive Order 1337.']);
        break;
      case 'grep':
        this.appendOutput(['grep: permission denied.',
          'Searching is a security risk.']);
        break;
      case 'find':
        this.appendOutput(['find: permission denied.',
          'If you lost it, fill out Form 8-L.']);
        break;
      case 'echo':
        if (args.length > 0) {
          this.appendOutput([args.join(' ')]);
        } else {
          this.appendOutput(['']);
        }
        break;
      case 'mkdir':
        this.appendOutput(['mkdir: cannot create directory:',
          'Disk quota exceeded. See IT.']);
        break;
      case 'touch':
        this.appendOutput(['touch: cannot create file:',
          'Read-only filesystem. (Always has been.)']);
        break;
      case 'chmod':
        this.appendOutput(['chmod: changing permissions of',
          'government files is above your paygrade.']);
        break;
      case 'wget':
      case 'curl':
        this.appendOutput(['Network access restricted.',
          'Approved sites: weather.gov, that\'s it.']);
        break;
    }
  }

  private handleUnknown(_cmd: string): void {
    const pool = filesystemData.unknownCommands as string[];
    const msg = pool[Math.floor(Math.random() * pool.length)];
    this.appendOutput([msg]);
    if (this.cache.audio.exists('sfx_crt_static')) {
      this.sound.play('sfx_crt_static', { volume: 0.08 });
    }
  }

  // ═══════════════════════════════════════════
  // TAB COMPLETION
  // ═══════════════════════════════════════════

  private handleTabComplete(): void {
    const input = this.inputBuffer;
    const parts = input.split(/\s+/);

    // If we're completing a command (first word)
    if (parts.length <= 1) {
      const prefix = parts[0]?.toLowerCase() || '';
      const commands = ['ls', 'cd', 'cat', 'pwd', 'help', 'clear', 'resume', 'whoami', 'date'];
      const matches = commands.filter(c => c.startsWith(prefix));
      if (matches.length === 1) {
        this.inputBuffer = matches[0] + ' ';
        this.redrawScreen();
      }
      return;
    }

    // Completing a path argument
    const pathPart = parts[parts.length - 1];
    const lastSlash = pathPart.lastIndexOf('/');
    let dirPart: string;
    let namePrefix: string;

    if (lastSlash >= 0) {
      dirPart = pathPart.slice(0, lastSlash) || '/';
      namePrefix = pathPart.slice(lastSlash + 1);
    } else {
      dirPart = '.';
      namePrefix = pathPart;
    }

    // Resolve the directory
    const dirPath = dirPart === '.'
      ? [...this.currentPath]
      : this.resolvePathSegments(dirPart);

    if (!dirPath) return;
    const dirNode = this.getNodeAtPath(dirPath);
    if (!dirNode || dirNode.type !== 'dir' || !dirNode.children) return;

    const hasSave = GameState.getInstance().hasSave();
    const matches = Object.entries(dirNode.children)
      .filter(([name, child]) => {
        if (child.saveOnly && !hasSave) return false;
        return name.toLowerCase().startsWith(namePrefix.toLowerCase());
      })
      .map(([name, child]) => child.type === 'dir' ? name + '/' : name);

    if (matches.length === 1) {
      const completed = matches[0];
      if (lastSlash >= 0) {
        parts[parts.length - 1] = pathPart.slice(0, lastSlash + 1) + completed;
      } else {
        parts[parts.length - 1] = completed;
      }
      this.inputBuffer = parts.join(' ');
      // Don't add trailing space if it's a directory (ends with /)
      if (!this.inputBuffer.endsWith('/')) {
        this.inputBuffer += ' ';
      }
      this.redrawScreen();
    } else if (matches.length > 1) {
      // Show all matches
      this.appendOutput([this.getPromptString() + this.inputBuffer]);
      this.appendOutput(matches);
      this.redrawScreen();
    }
  }

  // ═══════════════════════════════════════════
  // FILESYSTEM NAVIGATION
  // ═══════════════════════════════════════════

  private resolvePathSegments(pathStr: string): string[] | null {
    let segments: string[];

    if (pathStr === '/') {
      return [];
    }

    if (pathStr.startsWith('~/')) {
      segments = ['home', 'cpark', ...pathStr.slice(2).split('/').filter(Boolean)];
    } else if (pathStr === '~') {
      return ['home', 'cpark'];
    } else if (pathStr.startsWith('/')) {
      segments = pathStr.slice(1).split('/').filter(Boolean);
    } else {
      segments = [...this.currentPath, ...pathStr.split('/').filter(Boolean)];
    }

    // Resolve .. and .
    const resolved: string[] = [];
    for (const seg of segments) {
      if (seg === '..') {
        if (resolved.length > 0) resolved.pop();
      } else if (seg !== '.') {
        resolved.push(seg);
      }
    }

    // Verify path exists
    const node = this.getNodeAtPath(resolved);
    if (!node) return null;

    return resolved;
  }

  private getNodeAtPath(pathSegments: string[]): FSNode | null {
    let current: FSNode = { type: 'dir', children: this.filesystem };

    for (const seg of pathSegments) {
      if (!current.children || !current.children[seg]) return null;
      current = current.children[seg];
    }

    return current;
  }

  // ═══════════════════════════════════════════
  // TERMINAL OUTPUT
  // ═══════════════════════════════════════════

  private getPromptString(): string {
    // Show ~ for home directory
    const homePath = ['home', 'cpark'];
    const pathStr = this.currentPath.join('/');
    const homeStr = homePath.join('/');

    let displayPath: string;
    if (pathStr === homeStr) {
      displayPath = '~';
    } else if (pathStr.startsWith(homeStr + '/')) {
      displayPath = '~/' + pathStr.slice(homeStr.length + 1);
    } else if (this.currentPath.length === 0) {
      displayPath = '/';
    } else {
      displayPath = '/' + pathStr;
    }

    return `cpark@dash:${displayPath}$ `;
  }

  private appendOutput(lines: string[]): void {
    for (const line of lines) {
      this.outputLines.push(line);
    }
  }

  private redrawScreen(): void {
    const prompt = this.getPromptString();
    const promptLine = prompt + this.inputBuffer;

    // Calculate how many output lines we can show
    // Reserve 1 line for prompt
    const maxOutputLines = TERM_ROWS - 1;

    // Get visible output lines (scroll from bottom)
    const visibleOutput = this.outputLines.length > maxOutputLines
      ? this.outputLines.slice(this.outputLines.length - maxOutputLines)
      : this.outputLines;

    const allLines = [...visibleOutput, promptLine];
    this.currentString = allLines.join('\n');
    this.terminalText?.setText(this.currentString);
    this.glowText?.setText(this.currentString);

    // Position cursor at end of prompt line
    const cursorX = SCREEN_X + TEXT_PAD + (prompt.length + this.inputBuffer.length) * CHAR_W;
    const cursorY = SCREEN_Y + TEXT_PAD + (allLines.length - 1) * LINE_H;
    this.showCursor(cursorX, cursorY);
  }

  // ═══════════════════════════════════════════
  // BOOT SEQUENCE
  // ═══════════════════════════════════════════

  private startBootSequence(loadSave: boolean): void {
    this.terminalMode = false;
    this.removeKeyboardHandler();

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
          // Clear boot lines and show end message centered with logo
          this.currentString = '';
          this.terminalText?.setText('');
          this.glowText?.setText('');

          // End message centered on screen
          const cx = SCREEN_X + SCREEN_W / 2;
          const msgY = SCREEN_Y + 80;
          const endText = this.add.text(cx, msgY, endMsg, {
            fontFamily: FONT, fontSize: '10px', color: AMBER,
            align: 'center', lineSpacing: 10,
          }).setOrigin(0.5, 0).setDepth(14);
          this.screenContainer.add(endText);

          // Glow duplicate for end text
          const endGlow = this.add.text(cx - 1, msgY - 1, endMsg, {
            fontFamily: FONT, fontSize: '10px', color: GLOW_COLOR,
            align: 'center', lineSpacing: 10,
          }).setOrigin(0.5, 0).setDepth(13).setAlpha(GLOW_ALPHA);
          this.screenContainer.add(endGlow);

          // Wait for Enter or click to power off
          const proceed = () => {
            this.input.off('pointerdown', clickHandler);
            window.removeEventListener('keydown', bootKeyHandler);
            this.crtPowerOff(loadSave);
          };
          const clickHandler = () => proceed();
          this.input.once('pointerdown', clickHandler);
          const bootKeyHandler = (event: KeyboardEvent) => {
            if (event.key === 'Enter') proceed();
          };
          window.addEventListener('keydown', bootKeyHandler);
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
    this.removeKeyboardHandler();
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
                  if (loadSave) {
                    // Route to correct scene based on saved flags
                    const st = GameState.getInstance();
                    st.load();
                    if (st.hasFlag('scene_bullpen_entered')) {
                      this.scene.start('BullpenScene');
                    } else if (st.hasFlag('mailcart_complete')) {
                      this.scene.start('BullpenScene');
                    } else {
                      this.scene.start('LobbyScene', { loadSave: true });
                    }
                  } else {
                    this.scene.start('LobbyScene');
                  }
                });
              },
            });
          },
        });
      },
    });
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
