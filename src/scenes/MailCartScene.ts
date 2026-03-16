import Phaser from 'phaser';
import { MailCartHUD } from '../engine/MailCartHUD';
import { GameState } from '../engine/GameState';
import waveData from '../data/mailcart_waves.json';

// Vite URL imports for audio assets
import sfxTriumphUrl from '../assets/audio/sfx/sfx_triumph.mp3';
import sfxRubberShootUrl from '../assets/audio/sfx/sfx_rubber_shoot.mp3';
import sfxTapeBreakUrl from '../assets/audio/sfx/sfx_tape_break.mp3';
import sfxCartHitUrl from '../assets/audio/sfx/sfx_cart_hit.mp3';
import sfxBossHitUrl from '../assets/audio/sfx/sfx_boss_hit.mp3';
import bgmMailcartUrl from '../assets/audio/music/spreadsheet_sprint.mp3';

// Vite URL imports for sprite assets
import caseySpriteUrl from '../assets/sprites/mailcart/casey_cart.png';
import caseyIdleSheetUrl from '../assets/sprites/mailcart/casey_idle_sheet.png';
import caseyShootSheetUrl from '../assets/sprites/mailcart/casey_shoot_sheet.png';
import caseyHitSheetUrl from '../assets/sprites/mailcart/casey_hit_sheet.png';
import mailCartUrl from '../assets/sprites/mailcart/mail_cart.png';
import redTapeUrl from '../assets/sprites/mailcart/red_tape.png';
import cableUrl from '../assets/sprites/mailcart/cable.png';
import punchCardUrl from '../assets/sprites/mailcart/punch_card.png';
import tpsReportUrl from '../assets/sprites/mailcart/tps_report.png';
import rollingChairUrl from '../assets/sprites/mailcart/rolling_chair.png';
import paperStackUrl from '../assets/sprites/mailcart/paper_stack.png';
import megaPrinterUrl from '../assets/sprites/mailcart/mega_printer.png';
import coffeeCupUrl from '../assets/sprites/mailcart/coffee_cup.png';
import crosshairUrl from '../assets/sprites/mailcart/crosshair.png';

// Lane Y positions
const LANES = [140, 210, 280];
const GAME_W = 640;
const GAME_H = 360;

// Obstacle type info from JSON
interface ObstacleTypeDef {
  shootable: boolean;
  width: number;
  height: number;
  color: string;
}

interface WaveSpawn {
  time: number;
  obstacles: { type: string; lane: number }[];
}

interface PhaseData {
  id: string;
  name: string;
  duration: number;
  scrollSpeed: number;
  hints: string[];
  waves: WaveSpawn[];
}

const OBSTACLE_TYPES = waveData.obstacleTypes as Record<string, ObstacleTypeDef>;

export class MailCartScene extends Phaser.Scene {
  // Core gameplay
  private scrollSpeed = 80;
  private casey!: Phaser.GameObjects.Sprite;
  private caseyCart!: Phaser.GameObjects.Image;
  private caseyLane = 1;
  private crosshair!: Phaser.GameObjects.Image;
  private projectiles!: Phaser.GameObjects.Group;
  private obstacles!: Phaser.GameObjects.Group;

  // State
  private health = 3;
  private maxHealth = 3;
  private currentPhase = -1;
  private phaseTimer = 0;
  private phaseElapsed = 0;
  private invulnerable = false;
  private gameActive = false;
  private changingLane = false;

  // Boss
  private bossHealth = 6;
  private bossMaxHealth = 6;
  private bossSprite: Phaser.GameObjects.Image | null = null;
  private bossActive = false;

  // Spawn queue
  private spawnQueue: { time: number; type: string; lane: number }[] = [];

  // HUD
  private hud!: MailCartHUD;

  // Parallax layers
  private bgWall!: Phaser.GameObjects.TileSprite;
  private bgMid!: Phaser.GameObjects.TileSprite;
  private bgFloor!: Phaser.GameObjects.TileSprite;

  // Input
  private keyUp!: Phaser.Input.Keyboard.Key;
  private keyDown!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'MailCartScene' });
  }

  preload(): void {
    // Audio
    if (!this.cache.audio.exists('sfx_triumph')) this.load.audio('sfx_triumph', sfxTriumphUrl);
    if (!this.cache.audio.exists('sfx_rubber_shoot')) this.load.audio('sfx_rubber_shoot', sfxRubberShootUrl);
    if (!this.cache.audio.exists('sfx_tape_break')) this.load.audio('sfx_tape_break', sfxTapeBreakUrl);
    if (!this.cache.audio.exists('sfx_cart_hit')) this.load.audio('sfx_cart_hit', sfxCartHitUrl);
    if (!this.cache.audio.exists('sfx_boss_hit')) this.load.audio('sfx_boss_hit', sfxBossHitUrl);
    if (!this.cache.audio.exists('bgm_mailcart')) this.load.audio('bgm_mailcart', bgmMailcartUrl);

    // Sprites
    this.load.image('mc_casey', caseySpriteUrl);
    this.load.spritesheet('mc_casey_idle', caseyIdleSheetUrl, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('mc_casey_shoot', caseyShootSheetUrl, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('mc_casey_hit', caseyHitSheetUrl, { frameWidth: 64, frameHeight: 64 });
    this.load.image('mc_mail_cart', mailCartUrl);
    this.load.image('mc_red_tape', redTapeUrl);
    this.load.image('mc_cable', cableUrl);
    this.load.image('mc_punch_card', punchCardUrl);
    this.load.image('mc_tps_report', tpsReportUrl);
    this.load.image('mc_rolling_chair', rollingChairUrl);
    this.load.image('mc_paper_stack', paperStackUrl);
    this.load.image('mc_mega_printer', megaPrinterUrl);
    this.load.image('mc_coffee_cup', coffeeCupUrl);
    this.load.image('mc_crosshair', crosshairUrl);
  }

  create(): void {
    this.sound.stopAll();

    // Reset state
    this.health = 3;
    this.currentPhase = -1;
    this.phaseElapsed = 0;
    this.invulnerable = false;
    this.gameActive = false;
    this.changingLane = false;
    this.caseyLane = 1;
    this.bossHealth = 3;
    this.bossActive = false;
    this.bossSprite = null;
    this.spawnQueue = [];

    // Bonus health from lobby coffee cup
    const state = GameState.getInstance();
    if (state.hasItem('lobby_coffee')) {
      this.health = 4;
      this.maxHealth = 4;
      state.removeItem('lobby_coffee');
    } else {
      this.maxHealth = 3;
    }

    // Start music
    if (this.cache.audio.exists('bgm_mailcart')) {
      this.sound.play('bgm_mailcart', { loop: true, volume: 0.4 });
    }

    // Generate placeholder textures
    this.generatePlaceholderTextures();

    // Parallax background layers
    this.bgWall = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'mc_bg_wall')
      .setOrigin(0, 0).setDepth(0);
    this.bgMid = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'mc_bg_mid')
      .setOrigin(0, 0).setDepth(1);
    this.bgFloor = this.add.tileSprite(0, GAME_H - 120, GAME_W, 120, 'mc_bg_floor')
      .setOrigin(0, 0).setDepth(2);

    // Physics groups
    this.projectiles = this.add.group();
    this.obstacles = this.add.group();

    // Mail cart (beneath Casey)
    this.caseyCart = this.add.image(80, LANES[1] + 16, 'mc_mail_cart')
      .setDepth(9);

    // Casey sprite (animated)
    this.casey = this.add.sprite(80, LANES[1], 'mc_casey_idle')
      .setDepth(10);

    // Register animations
    if (!this.anims.exists('casey_idle')) {
      this.anims.create({
        key: 'casey_idle',
        frames: this.anims.generateFrameNumbers('mc_casey_idle', { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1,
      });
    }
    if (!this.anims.exists('casey_shoot')) {
      this.anims.create({
        key: 'casey_shoot',
        frames: this.anims.generateFrameNumbers('mc_casey_shoot', { start: 0, end: 5 }),
        frameRate: 16,
        repeat: 0,
      });
    }
    if (!this.anims.exists('casey_hit')) {
      this.anims.create({
        key: 'casey_hit',
        frames: this.anims.generateFrameNumbers('mc_casey_hit', { start: 0, end: 5 }),
        frameRate: 12,
        repeat: 0,
      });
    }

    this.casey.play('casey_idle');

    // Crosshair
    this.crosshair = this.add.image(0, 0, 'mc_crosshair')
      .setDepth(9999).setScrollFactor(0);

    // HUD
    this.hud = new MailCartHUD(this);
    this.hud.setHealth(this.health, this.maxHealth);

    // Input — arrow keys + WASD
    this.keyUp = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.keyDown = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.keyW = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyS = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    // Prevent browser from scrolling on arrow keys
    this.input.keyboard!.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
    ]);

    this.input.on('pointerdown', () => {
      if (this.gameActive) this.shoot();
    });

    this.keyUp.on('down', () => { if (this.gameActive) this.changeLane(-1); });
    this.keyDown.on('down', () => { if (this.gameActive) this.changeLane(1); });
    this.keyW.on('down', () => { if (this.gameActive) this.changeLane(-1); });
    this.keyS.on('down', () => { if (this.gameActive) this.changeLane(1); });

    // Intro sequence
    this.showIntro();
  }

  update(_time: number, delta: number): void {
    if (!this.gameActive) return;

    // Scroll parallax
    this.bgWall.tilePositionX += this.scrollSpeed * 0.3 * (delta / 1000);
    this.bgMid.tilePositionX += this.scrollSpeed * 0.6 * (delta / 1000);
    this.bgFloor.tilePositionX += this.scrollSpeed * 1.0 * (delta / 1000);

    // Update crosshair position
    const pointer = this.input.activePointer;
    this.crosshair.setPosition(pointer.x, pointer.y);

    // Phase timer
    this.phaseElapsed += delta;
    const phases = waveData.phases as PhaseData[];
    if (this.currentPhase >= 0 && this.currentPhase < phases.length) {
      const phase = phases[this.currentPhase];
      if (this.phaseElapsed >= phase.duration) {
        this.advancePhase();
      }
    }

    // Process spawn queue
    this.processSpawnQueue();

    // Move projectiles along their velocity vectors
    const projChildren = this.projectiles.getChildren() as Phaser.GameObjects.GameObject[];
    for (let i = projChildren.length - 1; i >= 0; i--) {
      const p = projChildren[i] as Phaser.GameObjects.Rectangle;
      const vx = (p.getData('vx') as number) ?? 400;
      const vy = (p.getData('vy') as number) ?? 0;
      p.x += vx * (delta / 1000);
      p.y += vy * (delta / 1000);
      if (p.x > GAME_W + 20 || p.x < -20 || p.y < -20 || p.y > GAME_H + 20) {
        p.destroy();
      }
    }

    // Move obstacles & check collisions
    const obsChildren = this.obstacles.getChildren() as Phaser.GameObjects.Image[];
    for (let i = obsChildren.length - 1; i >= 0; i--) {
      const obs = obsChildren[i];
      const obsData = obs.getData('config') as { type: string; speed: number; wobble?: number; startY?: number };

      obs.x -= (obsData.speed || this.scrollSpeed) * (delta / 1000);

      // Sine wave wobble for punch cards / tps reports
      if (obsData.wobble && obsData.startY !== undefined) {
        obs.y = obsData.startY + Math.sin(obs.x * 0.02) * obsData.wobble;
      }

      // Off-screen cleanup
      if (obs.x < -60) {
        obs.destroy();
        continue;
      }

      // Projectile-obstacle collision
      for (let j = projChildren.length - 1; j >= 0; j--) {
        const p = projChildren[j] as Phaser.GameObjects.Rectangle;
        if (!p.active) continue;
        if (this.spritesOverlap(p, obs)) {
          const typeDef = OBSTACLE_TYPES[obsData.type];
          if (typeDef && typeDef.shootable) {
            this.onObstacleDestroyed(obs);
            p.destroy();
            break;
          }
        }
      }

      // Casey-obstacle collision
      if (!this.invulnerable && obs.active && this.spritesOverlap(this.casey, obs)) {
        this.onHit();
        obs.destroy();
      }
    }

    // Boss collision with projectiles
    if (this.bossActive && this.bossSprite) {
      for (let j = projChildren.length - 1; j >= 0; j--) {
        const p = projChildren[j] as Phaser.GameObjects.Rectangle;
        if (!p.active) continue;
        if (this.spritesOverlap(p, this.bossSprite)) {
          p.destroy();
          this.onBossHit();
          break;
        }
      }
    }
  }

  // --- Placeholder texture generation ---

  private generatePlaceholderTextures(): void {
    // Background wall (beige)
    if (!this.textures.exists('mc_bg_wall')) {
      const c = this.textures.createCanvas('mc_bg_wall', GAME_W, GAME_H);
      const ctx = c!.getContext();
      ctx.fillStyle = '#c4b08a';
      ctx.fillRect(0, 0, GAME_W, GAME_H);
      // Fluorescent light panels
      ctx.fillStyle = '#e8e0c0';
      for (let x = 60; x < GAME_W; x += 160) {
        ctx.fillRect(x, 20, 80, 12);
      }
      // Motivational poster placeholders
      ctx.fillStyle = '#8b7355';
      for (let x = 120; x < GAME_W; x += 200) {
        ctx.fillRect(x, 50, 40, 30);
      }
      c!.refresh();
    }

    // Mid details (transparent with doorframes)
    if (!this.textures.exists('mc_bg_mid')) {
      const c = this.textures.createCanvas('mc_bg_mid', GAME_W, GAME_H);
      const ctx = c!.getContext();
      ctx.clearRect(0, 0, GAME_W, GAME_H);
      // Doorframes
      ctx.fillStyle = '#8b6c42';
      for (let x = 80; x < GAME_W; x += 240) {
        ctx.fillRect(x, 60, 50, 80);
        ctx.clearRect(x + 4, 64, 42, 72);
        ctx.fillStyle = '#6b5030';
        ctx.fillRect(x + 4, 64, 42, 72);
        ctx.fillStyle = '#8b6c42';
      }
      // Water cooler
      ctx.fillStyle = '#aaccdd';
      ctx.fillRect(300, 100, 16, 30);
      c!.refresh();
    }

    // Floor (gray linoleum)
    if (!this.textures.exists('mc_bg_floor')) {
      const c = this.textures.createCanvas('mc_bg_floor', GAME_W, 120);
      const ctx = c!.getContext();
      ctx.fillStyle = '#888880';
      ctx.fillRect(0, 0, GAME_W, 120);
      // Tile grid
      ctx.strokeStyle = '#777770';
      ctx.lineWidth = 1;
      for (let x = 0; x < GAME_W; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 120); ctx.stroke();
      }
      for (let y = 0; y < 120; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GAME_W, y); ctx.stroke();
      }
      c!.refresh();
    }
  }

  // --- Core gameplay methods ---

  private shoot(): void {
    const pointer = this.input.activePointer;
    const startX = this.casey.x + 25;
    const startY = this.casey.y;

    // Calculate direction toward crosshair
    const dx = pointer.x - startX;
    const dy = pointer.y - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 450;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;

    // Rotate band to face the direction of travel
    const angle = Math.atan2(dy, dx);

    const band = this.add.rectangle(startX, startY, 12, 4, 0xcc8833)
      .setDepth(9)
      .setRotation(angle);
    band.setData('vx', vx);
    band.setData('vy', vy);
    this.projectiles.add(band);

    // Casey shoot animation — play then return to idle
    this.casey.play('casey_shoot');
    this.casey.once('animationcomplete', () => {
      this.casey.play('casey_idle');
    });

    // Small recoil kick
    this.tweens.add({
      targets: this.casey,
      x: this.casey.x - 4,
      duration: 50,
      yoyo: true,
      ease: 'Power2',
    });

    if (this.cache.audio.exists('sfx_rubber_shoot')) {
      this.sound.play('sfx_rubber_shoot', { volume: 0.3 });
    }
  }

  private changeLane(dir: number): void {
    if (this.changingLane) return;
    const newLane = Phaser.Math.Clamp(this.caseyLane + dir, 0, 2);
    if (newLane === this.caseyLane) return;

    this.changingLane = true;
    this.caseyLane = newLane;

    this.tweens.add({
      targets: this.casey,
      y: LANES[this.caseyLane],
      duration: 100,
      ease: 'Power2',
      onComplete: () => { this.changingLane = false; },
    });

    // Move cart with casey
    this.tweens.add({
      targets: this.caseyCart,
      y: LANES[this.caseyLane] + 16,
      duration: 100,
      ease: 'Power2',
    });
  }

  private static readonly TEXTURE_MAP: Record<string, string> = {
    red_tape: 'mc_red_tape',
    cables: 'mc_cable',
    punch_cards: 'mc_punch_card',
    tps_reports: 'mc_tps_report',
    rolling_chair: 'mc_rolling_chair',
    paper_stack: 'mc_paper_stack',
    door_npc: 'mc_paper_stack', // reuse paper stack for door_npc
  };

  private spawnObstacle(type: string, lane: number): void {
    const typeDef = OBSTACLE_TYPES[type];
    if (!typeDef) return;

    const textureKey = MailCartScene.TEXTURE_MAP[type] || 'mc_red_tape';
    const obs = this.add.image(GAME_W + 40, LANES[lane], textureKey)
      .setDepth(8);

    // Store config on the game object
    const speed = this.scrollSpeed * 1.2;
    const wobble = (type === 'punch_cards' || type === 'tps_reports') ? 15 : 0;
    obs.setData('config', { type, speed, wobble, startY: LANES[lane] });

    // Mark shootable via data
    obs.setData('shootable', typeDef.shootable);

    this.obstacles.add(obs);
  }

  private onHit(): void {
    if (this.invulnerable) return;

    this.health--;
    this.hud.setHealth(this.health, this.maxHealth);
    this.invulnerable = true;

    if (this.cache.audio.exists('sfx_cart_hit')) {
      this.sound.play('sfx_cart_hit', { volume: 0.4 });
    }

    // Play hit animation then return to idle
    this.casey.play('casey_hit');
    this.casey.once('animationcomplete', () => {
      this.casey.play('casey_idle');
    });

    // Flash casey during invulnerability
    this.tweens.add({
      targets: this.casey,
      alpha: { from: 0.3, to: 1 },
      duration: 150,
      repeat: 5,
      onComplete: () => {
        this.casey.setAlpha(1);
      },
    });

    this.time.delayedCall(1500, () => {
      this.invulnerable = false;
    });

    if (this.health <= 0) {
      this.gameOver();
    }
  }

  private onObstacleDestroyed(obs: Phaser.GameObjects.Image): void {
    this.hud.addScore(100);

    if (this.cache.audio.exists('sfx_tape_break')) {
      this.sound.play('sfx_tape_break', { volume: 0.3 });
    }

    // Simple particle effect: small squares bursting out
    const x = obs.x;
    const y = obs.y;
    for (let i = 0; i < 4; i++) {
      const particle = this.add.rectangle(
        x, y, 4, 4, 0xffaa44
      ).setDepth(12);
      this.tweens.add({
        targets: particle,
        x: x + Phaser.Math.Between(-30, 30),
        y: y + Phaser.Math.Between(-30, 30),
        alpha: 0,
        duration: 300,
        onComplete: () => particle.destroy(),
      });
    }

    obs.destroy();
  }

  // --- Phase management ---

  private advancePhase(): void {
    this.currentPhase++;
    const phases = waveData.phases as PhaseData[];
    if (this.currentPhase >= phases.length) {
      this.victory();
      return;
    }
    this.startPhase(this.currentPhase);
  }

  private startPhase(index: number): void {
    const phases = waveData.phases as PhaseData[];
    const phase = phases[index];
    this.phaseElapsed = 0;
    this.scrollSpeed = phase.scrollSpeed;
    this.spawnQueue = [];

    this.hud.showPhase(phase.name);

    // Show hints
    if (phase.hints.length > 0) {
      phase.hints.forEach((hint, i) => {
        this.time.delayedCall(i * 3500, () => {
          this.hud.showHint(hint);
        });
      });
    }

    // Load spawn queue
    for (const wave of phase.waves) {
      for (const obs of wave.obstacles) {
        this.spawnQueue.push({
          time: wave.time,
          type: obs.type,
          lane: obs.lane,
        });
      }
    }

    // Boss phase setup
    if (phase.id === 'boss') {
      this.startBoss();
    } else {
      if (this.bossActive) {
        this.bossSprite?.destroy();
        this.bossSprite = null;
        this.bossActive = false;
        this.hud.hideBossBar();
      }
    }
  }

  private processSpawnQueue(): void {
    const toSpawn: number[] = [];
    for (let i = 0; i < this.spawnQueue.length; i++) {
      if (this.phaseElapsed >= this.spawnQueue[i].time) {
        this.spawnObstacle(this.spawnQueue[i].type, this.spawnQueue[i].lane);
        toSpawn.push(i);
      }
    }
    // Remove spawned (reverse order to preserve indices)
    for (let i = toSpawn.length - 1; i >= 0; i--) {
      this.spawnQueue.splice(toSpawn[i], 1);
    }
  }

  // --- Boss ---

  private bossLane = 1;
  private bossLaneTween: Phaser.Tweens.Tween | null = null;

  private startBoss(): void {
    this.bossHealth = this.bossMaxHealth;
    this.bossActive = true;
    this.bossLane = 1;

    this.bossSprite = this.add.image(GAME_W - 100, LANES[1], 'mc_mega_printer')
      .setDepth(10);

    // Paper tray weak point indicator — smaller, harder to hit
    const tray = this.add.rectangle(GAME_W - 100, LANES[1] + 30, 30, 8, 0xff4444, 0.6)
      .setDepth(11);
    this.bossSprite.setData('tray', tray);
    this.bossSprite.on('destroy', () => {
      if (tray.active) tray.destroy();
    });
    // Pulse the weak point
    this.tweens.add({
      targets: tray,
      alpha: { from: 0.3, to: 0.8 },
      duration: 400,
      yoyo: true,
      repeat: -1,
    });

    this.hud.showBossBar(this.bossMaxHealth);
    this.hud.updateBossBar(this.bossHealth, this.bossMaxHealth);

    // Boss lane-switching — moves between lanes every 3-5 seconds
    this.startBossLaneSwitching();
  }

  private startBossLaneSwitching(): void {
    const switchLane = () => {
      if (!this.bossActive || !this.bossSprite) return;

      // Pick a different lane
      let newLane = this.bossLane;
      while (newLane === this.bossLane) {
        newLane = Phaser.Math.Between(0, 2);
      }
      this.bossLane = newLane;

      const tray = this.bossSprite.getData('tray') as Phaser.GameObjects.Rectangle;

      // Move boss to new lane
      this.bossLaneTween = this.tweens.add({
        targets: this.bossSprite,
        y: LANES[this.bossLane],
        duration: 600,
        ease: 'Power2',
      });
      // Move tray with it
      if (tray?.active) {
        this.tweens.add({
          targets: tray,
          y: LANES[this.bossLane] + 30,
          duration: 600,
          ease: 'Power2',
        });
      }

      // Schedule next switch — gets faster as health drops
      const delay = this.bossHealth > 3 ? Phaser.Math.Between(3000, 4500) : Phaser.Math.Between(1800, 3000);
      this.time.delayedCall(delay, switchLane);
    };

    // First switch after 2.5s
    this.time.delayedCall(2500, switchLane);
  }

  private onBossHit(): void {
    this.bossHealth--;
    this.hud.updateBossBar(this.bossHealth, this.bossMaxHealth);

    if (this.cache.audio.exists('sfx_boss_hit')) {
      this.sound.play('sfx_boss_hit', { volume: 0.4 });
    }

    // Flash boss
    if (this.bossSprite) {
      this.tweens.add({
        targets: this.bossSprite,
        alpha: { from: 0.3, to: 1 },
        duration: 100,
        repeat: 3,
      });
    }

    if (this.bossHealth <= 0) {
      this.bossDefeated();
    }
  }

  private bossDefeated(): void {
    this.bossActive = false;
    this.hud.hideBossBar();
    this.hud.addScore(500);

    if (this.bossSprite) {
      // Explosion effect
      for (let i = 0; i < 8; i++) {
        const particle = this.add.rectangle(
          this.bossSprite.x + Phaser.Math.Between(-40, 40),
          this.bossSprite.y + Phaser.Math.Between(-40, 40),
          8, 8, 0xff8800
        ).setDepth(15);
        this.tweens.add({
          targets: particle,
          x: particle.x + Phaser.Math.Between(-60, 60),
          y: particle.y + Phaser.Math.Between(-60, 60),
          alpha: 0,
          scaleX: 3,
          scaleY: 3,
          duration: 600,
          onComplete: () => particle.destroy(),
        });
      }

      this.bossSprite.destroy();
      this.bossSprite = null;
    }

    if (this.cache.audio.exists('sfx_triumph')) {
      this.sound.play('sfx_triumph', { volume: 0.5 });
    }

    // Short delay then victory
    this.time.delayedCall(1500, () => {
      this.victory();
    });
  }

  // --- Game flow ---

  private showIntro(): void {
    const introText = this.add.text(320, 150, "That's a long hallway...\nGood thing someone left this mail cart.", {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#FFD000',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5).setDepth(50).setAlpha(0);

    const controlsText = this.add.text(320, 210, 'W/S or \u2191/\u2193  Dodge\nClick        Shoot', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#aaaaaa',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'left',
    }).setOrigin(0.5, 0).setDepth(50).setAlpha(0);

    this.tweens.add({
      targets: [introText, controlsText],
      alpha: 1,
      duration: 500,
      onComplete: () => {
        this.time.delayedCall(3000, () => {
          this.tweens.add({
            targets: [introText, controlsText],
            alpha: 0,
            duration: 500,
            onComplete: () => {
              introText.destroy();
              controlsText.destroy();
              this.gameActive = true;
              this.advancePhase();
            },
          });
        });
      },
    });
  }

  private gameOver(): void {
    this.gameActive = false;

    // Clear all obstacles and projectiles
    this.obstacles.clear(true, true);
    this.projectiles.clear(true, true);
    if (this.bossSprite) {
      this.bossSprite.destroy();
      this.bossSprite = null;
    }
    this.bossActive = false;
    this.hud.hideBossBar();

    const overlay = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.7)
      .setOrigin(0, 0).setDepth(200).setScrollFactor(0);

    this.add.text(320, 120, 'WIPEOUT!', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ff4444',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(201).setScrollFactor(0);

    const retryBtn = this.add.text(320, 200, '[ Retry ]', {
      fontFamily: 'monospace', fontSize: '14px', color: '#FFD000',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(201).setScrollFactor(0).setInteractive();

    retryBtn.on('pointerdown', () => {
      this.scene.restart();
    });

    retryBtn.on('pointerover', () => retryBtn.setColor('#ffffff'));
    retryBtn.on('pointerout', () => retryBtn.setColor('#FFD000'));
  }

  private victory(): void {
    this.gameActive = false;

    // Clear remaining obstacles
    this.obstacles.clear(true, true);
    this.projectiles.clear(true, true);

    const outroText = this.add.text(320, 160, 'Made it through!', {
      fontFamily: 'monospace', fontSize: '16px', color: '#FFD000',
      stroke: '#000000', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5).setDepth(50).setAlpha(0);

    const scoreText = this.add.text(320, 200, `Score: ${this.hud.getScore()}`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50).setAlpha(0);

    this.tweens.add({
      targets: [outroText, scoreText],
      alpha: 1,
      duration: 500,
      onComplete: () => {
        this.time.delayedCall(2500, () => {
          this.transitionToBullpen();
        });
      },
    });
  }

  private transitionToBullpen(): void {
    const state = GameState.getInstance();
    state.setFlag('mailcart_complete', true);
    state.save();

    // Wipe transition
    const wipe = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000)
      .setOrigin(0, 0).setDepth(2000).setScrollFactor(0);
    wipe.x = -GAME_W;

    this.tweens.add({
      targets: wipe,
      x: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
        this.scene.start('BullpenScene');
      },
    });
  }

  // --- Utility ---

  private getAABB(obj: Phaser.GameObjects.GameObject): { x: number; y: number; w: number; h: number } {
    if (obj instanceof Phaser.GameObjects.Image) {
      return {
        x: obj.x - obj.displayWidth * obj.originX,
        y: obj.y - obj.displayHeight * obj.originY,
        w: obj.displayWidth,
        h: obj.displayHeight,
      };
    } else if (obj instanceof Phaser.GameObjects.Rectangle) {
      return {
        x: obj.x - obj.width * obj.originX,
        y: obj.y - obj.height * obj.originY,
        w: obj.width,
        h: obj.height,
      };
    }
    // Fallback for other types
    const go = obj as unknown as { x: number; y: number };
    return { x: go.x - 6, y: go.y - 6, w: 12, h: 12 };
  }

  private spritesOverlap(
    a: Phaser.GameObjects.GameObject,
    b: Phaser.GameObjects.GameObject,
  ): boolean {
    const ab = this.getAABB(a);
    const bb = this.getAABB(b);
    return ab.x < bb.x + bb.w && ab.x + ab.w > bb.x && ab.y < bb.y + bb.h && ab.y + ab.h > bb.y;
  }
}
