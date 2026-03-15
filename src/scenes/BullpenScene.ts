import Phaser from 'phaser';
import { Player, CHAR_FRAMES } from '../engine/Player';
import { HotspotManager, SceneHotspotFile } from '../engine/HotspotManager';
import { DialogueManager, DialogueTree } from '../engine/DialogueManager';
import { InventoryUI } from '../engine/InventoryUI';
import { GameState } from '../engine/GameState';
import { CursorManager, CursorState } from '../engine/CursorManager';
import { NavGrid } from '../engine/NavGrid';
import { DebugMenu } from '../engine/DebugMenu';

// Data
import bullpenHotspotsRaw from '../data/hotspots/bullpen.json';
import priyaData from '../data/dialogues/priya.json';
import kevinData from '../data/dialogues/kevin.json';

// Shared assets
import caseyUrl from '../assets/sprites/characters/casey_sheet.png';
import caseyPortraitUrl from '../assets/sprites/portraits/casey_default.png';
import sfxTextBlipUrl from '../assets/audio/sfx/sfx_text_blip.mp3';
import sfxSelectUrl from '../assets/audio/sfx/sfx_select.mp3';
import sfxUiClickUrl from '../assets/audio/sfx/sfx_ui_click.mp3';
import voiceCaseyUrl from '../assets/audio/sfx/voices/voice_casey.mp3';
import voiceKevinUrl from '../assets/audio/sfx/voices/voice_kevin.mp3';
import voicePriyaUrl from '../assets/audio/sfx/voices/voice_priya.mp3';
import footstepCaseyUrl from '../assets/audio/sfx/footsteps/footstep_casey.mp3';
import iconFlyerUrl from '../assets/sprites/items/icon_lost_cat_flyer.png';
import iconCupEmptyUrl from '../assets/sprites/items/icon_paper_cup.png';
import iconCupWaterUrl from '../assets/sprites/items/icon_cup_of_water.png';
import iconBadgeUrl from '../assets/sprites/items/icon_temporary_badge.png';
import bullpenMusicUrl from '../assets/audio/music/bullpen_theme.mp3';
import bullpenChillUrl from '../assets/audio/music/bullpen_chill.mp3';
import puzzleThinkingUrl from '../assets/audio/music/puzzle_thinking.mp3';
import endChapterMusicUrl from '../assets/audio/music/end_chapter.mp3';
import sfxPrinterBurstUrl from '../assets/audio/sfx/sfx_printer_burst.mp3';
import sfxKeypadPressUrl from '../assets/audio/sfx/sfx_keypad_press.mp3';
import sfxClosetOpenUrl from '../assets/audio/sfx/sfx_closet_open.mp3';
import sfxLaptopOpenUrl from '../assets/audio/sfx/sfx_laptop_open.mp3';

// Bullpen sprites
import bpDeadPrinterUrl from '../assets/sprites/bullpen/dead_printer.png';
import bpCoffeeMakerUrl from '../assets/sprites/bullpen/coffee_maker.png';
import bpCoatRackUrl from '../assets/sprites/bullpen/coat_rack.png';
import bpSupplyClosetUrl from '../assets/sprites/bullpen/supply_closet.png';
import bpDashboardTvUrl from '../assets/sprites/bullpen/dashboard_tv.png';
import bpMicrowaveUrl from '../assets/sprites/bullpen/microwave.png';
import bpMiniFridgeUrl from '../assets/sprites/bullpen/mini_fridge.png';
import bpCaseyDeskUrl from '../assets/sprites/bullpen/casey_desk.png';
import bpDay90BannerUrl from '../assets/sprites/bullpen/day90_banner.png';
import bpWarRoomUrl from '../assets/sprites/bullpen/war_room.png';

const bullpenHotspots = bullpenHotspotsRaw as unknown as SceneHotspotFile;

// Scene dimensions
const SCENE_W = 960;
const SCENE_H = 360;
const WALK_MIN_X = 10;
const WALK_MAX_X = 950;
const WALK_MIN_Y = 200;
const WALK_MAX_Y = 320;

export class BullpenScene extends Phaser.Scene {
  private player!: Player;
  private hotspotManager!: HotspotManager;
  private dialogueManager!: DialogueManager;
  private inventoryUI!: InventoryUI;
  private cursorManager: CursorManager | null = null;
  private hotspotHovered = false;
  private navGrid!: NavGrid;

  // NPC dialogue
  private priyaConversations: DialogueTree[] = [];
  private kevinConversations: DialogueTree[] = [];

  // Background NPC graphics (for printer reaction)
  private bgNpcGraphics: Phaser.GameObjects.Graphics[] = [];
  private cutsceneActive = false;
  private debugMenu: DebugMenu | null = null;
  private currentMusic: Phaser.Sound.BaseSound | null = null;
  private currentMusicKey = '';

  // Hints
  private hintTimer = 0;
  private lastFlagCount = 0;
  private hintsShown: Set<string> = new Set();

  constructor() { super({ key: 'BullpenScene' }); }

  preload(): void {
    const ssConfig = { frameWidth: 64, frameHeight: 64 };
    this.load.spritesheet('char_casey', caseyUrl, ssConfig);
    this.load.image('portrait_casey', caseyPortraitUrl);

    this.load.audio('sfx_text_blip', sfxTextBlipUrl);
    this.load.audio('sfx_select', sfxSelectUrl);
    this.load.audio('sfx_ui_click', sfxUiClickUrl);
    this.load.audio('voice_casey', voiceCaseyUrl);
    this.load.audio('voice_kevin', voiceKevinUrl);
    this.load.audio('voice_priya', voicePriyaUrl);
    this.load.audio('footstep_casey', footstepCaseyUrl);
    this.load.audio('bullpen_music', bullpenMusicUrl);
    this.load.audio('bullpen_chill', bullpenChillUrl);
    this.load.audio('puzzle_thinking', puzzleThinkingUrl);
    this.load.audio('end_chapter_music', endChapterMusicUrl);
    this.load.audio('sfx_printer_burst', sfxPrinterBurstUrl);
    this.load.audio('sfx_keypad_press', sfxKeypadPressUrl);
    this.load.audio('sfx_closet_open', sfxClosetOpenUrl);
    this.load.audio('sfx_laptop_open', sfxLaptopOpenUrl);

    this.load.image('icon_flyer', iconFlyerUrl);
    this.load.image('icon_cup_empty', iconCupEmptyUrl);
    this.load.image('icon_cup_water', iconCupWaterUrl);
    this.load.image('icon_badge', iconBadgeUrl);

    // Bullpen object sprites
    this.load.image('bp_dead_printer', bpDeadPrinterUrl);
    this.load.image('bp_coffee_maker', bpCoffeeMakerUrl);
    this.load.image('bp_coat_rack', bpCoatRackUrl);
    this.load.image('bp_supply_closet', bpSupplyClosetUrl);
    this.load.image('bp_dashboard_tv', bpDashboardTvUrl);
    this.load.image('bp_microwave', bpMicrowaveUrl);
    this.load.image('bp_mini_fridge', bpMiniFridgeUrl);
    this.load.image('bp_casey_desk', bpCaseyDeskUrl);
    this.load.image('bp_day90_banner', bpDay90BannerUrl);
    this.load.image('bp_war_room', bpWarRoomUrl);
  }

  create(): void {
    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    const state = GameState.getInstance();
    if (state.hasItem('temporary_badge')) state.removeItem('temporary_badge');
    state.setFlag('scene_bullpen_entered', true);
    state.enableAutoSave();

    this.drawBackground();
    this.drawFurniture();
    this.drawNPCs();
    this.setupNavGrid();
    this.setupAmbientLife();

    // Player
    const spawn = (bullpenHotspotsRaw as any).playerSpawn ?? { x: 60, y: 200 };
    this.player = new Player(this, spawn.x, spawn.y, 'char_casey');

    // Scrolling camera
    const camSettings = (bullpenHotspotsRaw as any).cameraSettings;
    this.cameras.main.setBounds(
      camSettings.bounds.x, camSettings.bounds.y,
      camSettings.bounds.width, camSettings.bounds.height
    );
    const playerContainer = (this.player as any).container as Phaser.GameObjects.Container;
    this.cameras.main.startFollow(playerContainer, false, camSettings.lerpX, 1);
    this.cameras.main.setDeadzone(camSettings.deadZone.width, SCENE_H);

    // Hotspots from JSON
    this.hotspotManager = new HotspotManager(this);
    this.hotspotManager.loadFromSceneFile(bullpenHotspots);

    // Dialogue
    this.dialogueManager = new DialogueManager(this);
    this.dialogueManager.loadNPCFile(priyaData);
    this.dialogueManager.loadNPCFile(kevinData);
    this.priyaConversations = Object.values(priyaData).filter(
      (v: any) => v && v.id && v.startNode
    ) as unknown as DialogueTree[];
    this.kevinConversations = Object.values(kevinData).filter(
      (v: any) => v && v.id && v.startNode
    ) as unknown as DialogueTree[];

    // Inventory
    this.inventoryUI = new InventoryUI(this);
    this.inventoryUI.refresh();

    // Custom cursor
    this.cursorManager = new CursorManager(this);
    this.debugMenu = new DebugMenu(this);

    const verbToCursor: Record<string, CursorState> = {
      talkto: 'talk', look: 'look', use: 'use', pickup: 'pickup',
    };
    this.hotspotManager.onCursorChange = (verb) => {
      if (verb) { this.hotspotHovered = true; this.cursorManager?.setState(verbToCursor[verb] ?? 'default'); }
      else { this.hotspotHovered = false; }
    };

    // Wire walk-to with pathfinding
    this.hotspotManager.onWalkTo = (x, y, cb) => {
      const clamped = this.clampToWalkArea(x, y);
      const pos = this.player.getPosition();
      const path = this.navGrid.findPath(pos.x, pos.y, clamped.x, clamped.y);
      this.player.walkPath(path, cb);
    };
    this.hotspotManager.getSelectedItem = () => this.inventoryUI.getSelectedItem();

    // Interaction handler
    this.hotspotManager.onInteraction = (hotspotId, _verb, response) => {
      const st = GameState.getInstance();
      st.setFlag(`examined_${hotspotId}`, true);
      this.inventoryUI.clearSelection();

      // NPC talk-to — use dialogue trees with flag-based selection
      if ((hotspotId === 'priya_npc' || hotspotId === 'npc_priya') && _verb === 'talkto') {
        this.startPriyaConversation();
        return;
      }
      if ((hotspotId === 'kevin' || hotspotId === 'npc_kevin') && _verb === 'talkto') {
        this.startKevinConversation();
        return;
      }

      // Play interaction-specific SFX
      if (hotspotId === 'supply_closet' && _verb === 'use' && response.itemGiven === 'laptop') {
        // Keypad press then closet open
        if (this.cache.audio.exists('sfx_keypad_press')) {
          this.sound.play('sfx_keypad_press', { volume: 0.3 });
          this.time.delayedCall(400, () => {
            if (this.cache.audio.exists('sfx_closet_open')) {
              this.sound.play('sfx_closet_open', { volume: 0.35 });
            }
          });
        }
      }
      if (hotspotId === 'casey_desk' && response.itemRemoved === 'laptop') {
        if (this.cache.audio.exists('sfx_laptop_open')) {
          this.sound.play('sfx_laptop_open', { volume: 0.3 });
        }
      }

      // Check for cutscene trigger
      if ((response as any).triggerCutscene === 'bullpen_end') {
        if (response.text) {
          this.showMonologue(response.text, response.speaker, response.portrait);
        }
        // Start cutscene after dialogue dismisses
        this.dialogueManager.onDialogueEnd = (treeId) => {
          this.inventoryUI.refresh();
          if (treeId?.startsWith('_mono_')) {
            this.startEndCutscene();
          }
        };
        this.inventoryUI.refresh();
        return;
      }

      // Regular hotspot response
      if (response.text) {
        this.showMonologue(response.text, response.speaker, response.portrait);
      }

      this.inventoryUI.refresh();
      this.resetHintTimer();
    };

    // Custom events from hotspot interactions
    this.hotspotManager.onTriggerEvent = (eventName) => {
      if (eventName === 'bullpen_printer_reaction') {
        this.printerReaction();
      }
    };

    this.dialogueManager.onDialogueEnd = () => {
      this.inventoryUI.refresh();
      this.resetHintTimer();
      this.checkMusicState();
    };

    this.dialogueManager.onItemGiven = () => {
      this.inventoryUI.refresh();
    };

    this.inventoryUI.onExamineItem = (text) => {
      this.showMonologue(text);
    };

    // Click to walk (with camera scroll offset)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) return;
      if (this.dialogueManager.isActive) return;
      if (this.cutsceneActive) return;

      const cam = this.cameras.main;
      if (pointer.y > cam.height - 38) return;

      const hitObjects = this.input.hitTestPointer(pointer);
      const hitHotspot = hitObjects.some((obj) => obj.getData('hotspotId') !== undefined);
      if (hitHotspot) return;

      const worldX = pointer.x + cam.scrollX;
      const worldY = pointer.y + cam.scrollY;
      const clamped = this.clampToWalkArea(worldX, worldY);
      const pos = this.player.getPosition();
      const path = this.navGrid.findPath(pos.x, pos.y, clamped.x, clamped.y);
      this.player.walkPath(path);
    });

    // Pause
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.dialogueManager.isActive) return;
      this.scene.pause();
      this.scene.launch('PauseMenuScene', { parentScene: 'BullpenScene' });
    });

    // Debug
    this.input.keyboard?.on('keydown-D', () => {
      this.hotspotManager.toggleDebug();
      if ((this as any)._navDebug) {
        (this as any)._navDebug.destroy(); (this as any)._navDebug = null;
      } else {
        const g = this.add.graphics().setDepth(5000);
        this.navGrid.drawDebug(g);
        (this as any)._navDebug = g;
      }
    });

    // Music — start with theme, crossfade based on game state
    this.startMusic('bullpen_music', 0.3);

    // Entrance wipe
    const wipe = this.add.rectangle(0, 0, 640, 360, 0x000000)
      .setOrigin(0, 0).setDepth(2000).setScrollFactor(0);
    this.tweens.add({
      targets: wipe, x: 640, duration: 600, ease: 'Power2', delay: 200,
      onComplete: () => wipe.destroy(),
    });

    // Hint timer
    this.lastFlagCount = Object.keys(state.flags).length;
  }

  update(time: number, delta: number): void {
    this.player.update(time, delta);

    // Custom cursor
    if (this.cursorManager) {
      const pointer = this.input.activePointer;
      if (!this.hotspotHovered) {
        if (this.dialogueManager.isActive) this.cursorManager.setState('default');
        else if (pointer.y > this.cameras.main.height - 38) this.cursorManager.setState('inventory');
        else if (pointer.y >= WALK_MIN_Y - 30) this.cursorManager.setState('walk');
        else this.cursorManager.setState('default');
      }
      this.cursorManager.update(pointer);
    }

    // Hints
    const currentFlagCount = Object.keys(GameState.getInstance().flags).length;
    if (currentFlagCount !== this.lastFlagCount) this.resetHintTimer();
    this.hintTimer += delta;
    if (this.hintTimer > 60000) { this.tryShowHint(); this.hintTimer = 0; }

    this.debugMenu?.update();
  }

  // ── NPC Conversation Selection ──

  private startPriyaConversation(): void {
    if (this.dialogueManager.isActive) return;
    const tree = this.dialogueManager.selectConversation(this.priyaConversations);
    if (tree) this.dialogueManager.startDialogue(tree.id);
    else this.showMonologue("Priya is deep in thought. Maybe later.");
  }

  private startKevinConversation(): void {
    if (this.dialogueManager.isActive) return;
    const tree = this.dialogueManager.selectConversation(this.kevinConversations);
    if (tree) this.dialogueManager.startDialogue(tree.id);
    else this.showMonologue("Kevin seems to have achieved a state of perfect office zen. He cannot be disturbed. I almost admire it.");
  }

  // ── Helpers ──

  private clampToWalkArea(x: number, y: number): { x: number; y: number } {
    return {
      x: Phaser.Math.Clamp(x, WALK_MIN_X, WALK_MAX_X),
      y: Phaser.Math.Clamp(y, WALK_MIN_Y, WALK_MAX_Y),
    };
  }

  private showMonologue(text: string, speaker?: string, portrait?: string): void {
    if (this.dialogueManager.isActive) return;
    const treeId = `_mono_${Date.now()}`;
    this.dialogueManager.loadTree({
      id: treeId, startNode: 'line',
      nodes: {
        line: {
          id: 'line', speaker: speaker ?? 'casey', portrait: portrait ?? null,
          text, animation: null, flagsSet: {}, relationshipChanges: {},
          options: [], autoAdvance: null,
        },
      },
    });
    this.dialogueManager.startDialogue(treeId);
  }

  // ── Hints ──

  private resetHintTimer(): void {
    this.hintTimer = 0;
    this.lastFlagCount = Object.keys(GameState.getInstance().flags).length;
  }

  private getHintState(): string {
    const st = GameState.getInstance();
    if (st.hasFlag('has_laptop')) return 'LAPTOP_GET';
    if (st.hasFlag('has_supply_code')) return 'CODE_GET';
    if (st.hasFlag('priya_test_active') && st.hasItem('cup_of_water')) return 'PROVE_PRINTER';
    if (st.hasFlag('priya_test_active')) return 'PROVE_WHITEBOARD';
    if (st.hasFlag('met_priya')) return 'MEET_PRIYA';
    if (st.hasFlag('needs_computer')) return 'NO_COMPUTER';
    return 'ENTER';
  }

  private tryShowHint(): void {
    if (this.dialogueManager.isActive) return;
    const hintState = this.getHintState();
    if (this.hintsShown.has(hintState)) return;
    const hintText = this.hotspotManager.hintMessages[hintState];
    if (!hintText) return;
    this.hintsShown.add(hintState);

    const pos = this.player.getPosition();
    const cam = this.cameras.main;
    const bubble = this.add.text(pos.x, pos.y - 60, hintText, {
      fontFamily: 'monospace', fontSize: '8px', color: '#cccccc',
      fontStyle: 'italic', backgroundColor: '#1a1a2ecc',
      padding: { x: 6, y: 4 }, wordWrap: { width: 200 },
    }).setOrigin(0.5, 1).setDepth(950);
    this.tweens.add({
      targets: bubble, alpha: { from: 1, to: 0 },
      delay: 4000, duration: 1000,
      onComplete: () => bubble.destroy(),
    });
  }

  // ── Drawing ──

  private drawBackground(): void {
    const g = this.add.graphics().setDepth(0);

    // Floor
    g.fillStyle(0xd4c8a0);
    g.fillRect(0, 0, SCENE_W, SCENE_H);
    g.fillStyle(0xc8bc94);
    for (let y = WALK_MIN_Y; y < SCENE_H; y += 32) {
      for (let x = 0; x < SCENE_W; x += 32) {
        if ((x / 32 + y / 32) % 2 === 0) g.fillRect(x, y, 32, 32);
      }
    }

    // Walls
    g.fillStyle(0xe8e0cc);
    g.fillRect(0, 0, SCENE_W, 140);
    g.fillStyle(0x8a7e60);
    g.fillRect(0, 138, SCENE_W, 4);

    // Fluorescent lights
    g.fillStyle(0xffffff, 0.04);
    for (let x = 80; x < SCENE_W; x += 200) g.fillRect(x, 10, 120, 8);

    // DAY 1 OF 90 banner — PixelLab sprite
    this.add.image(500, 60, 'bp_day90_banner').setOrigin(0.5, 0.5).setDepth(1).setScale(0.8);

    // Dashboard TV — PixelLab sprite
    this.add.image(700, 70, 'bp_dashboard_tv').setOrigin(0.5, 0.5).setDepth(1);

    // Hallway exit (far right)
    g.fillStyle(0x333333);
    g.fillRect(920, 142, 40, 80);
    this.add.text(940, 170, 'B2 LEVEL', { fontFamily: 'monospace', fontSize: '4px', color: '#888888' }).setOrigin(0.5).setDepth(2);
  }

  private drawFurniture(): void {
    // Coat rack (far left) — PixelLab sprite
    this.add.image(30, 170, 'bp_coat_rack').setOrigin(0.5, 1).setDepth(10);

    // Casey's desk — PixelLab sprite
    this.add.image(145, 220, 'bp_casey_desk').setOrigin(0.5, 1).setDepth(20);

    // Cubicle cluster (left-center) — graphics, keep as-is for the grid structure
    for (let i = 0; i < 3; i++) {
      const cx = 250 + i * 60;
      this.add.rectangle(cx, 175, 50, 4, 0x999999).setDepth(15);
      this.add.rectangle(cx - 24, 190, 4, 30, 0x999999).setDepth(15);
      this.add.rectangle(cx + 24, 190, 4, 30, 0x999999).setDepth(15);
      this.add.rectangle(cx, 198, 44, 20, 0x8a7e60).setDepth(16);
    }

    // Dead printer — PixelLab sprite
    this.add.image(260, 260, 'bp_dead_printer').setOrigin(0.5, 1).setDepth(20);

    // Break area counter (keep as graphics — long counter surface)
    this.add.rectangle(450, 195, 100, 30, 0x8a7e60).setDepth(18);
    this.add.rectangle(450, 208, 100, 6, 0x7a6e50).setDepth(19);

    // Coffee maker — PixelLab sprite (on counter)
    this.add.image(420, 192, 'bp_coffee_maker').setOrigin(0.5, 1).setDepth(22);

    // Microwave — PixelLab sprite (on counter)
    this.add.image(450, 192, 'bp_microwave').setOrigin(0.5, 1).setDepth(22);

    // Mini fridge — PixelLab sprite (beside counter)
    this.add.image(490, 210, 'bp_mini_fridge').setOrigin(0.5, 1).setDepth(22);

    // Supply closet — PixelLab sprite (on wall)
    this.add.image(300, 158, 'bp_supply_closet').setOrigin(0.5, 1).setDepth(5);

    // Priya's desk — keep as graphics (detailed with sticky notes, monitors, whiteboard)
    this.add.rectangle(650, 200, 70, 40, 0x8a7e60).setDepth(20);
    this.add.rectangle(650, 218, 70, 6, 0x7a6e50).setDepth(21);
    this.add.rectangle(640, 190, 12, 10, 0x222222).setDepth(22);
    this.add.rectangle(655, 190, 12, 10, 0x222222).setDepth(22);
    for (let i = 0; i < 5; i++) {
      const colors = [0xf0e868, 0x88ccff, 0xff88aa, 0x88ff88, 0xffaa44];
      this.add.rectangle(668 + (i % 3) * 6, 190 + Math.floor(i / 3) * 6, 5, 5, colors[i]).setDepth(22);
    }
    // Whiteboard on wheels (near Priya's desk)
    this.add.rectangle(690, 170, 40, 50, 0xffffff).setDepth(10).setStrokeStyle(1, 0xcccccc);

    // War Room — PixelLab sprite
    this.add.image(790, 190, 'bp_war_room').setOrigin(0.5, 1).setDepth(5);
  }

  private drawNPCs(): void {
    // Priya (placeholder)
    const pg = this.add.graphics().setDepth(200);
    pg.fillStyle(0xcc6699); pg.fillRect(645, 165, 12, 30);
    pg.fillStyle(0xddaa77); pg.fillCircle(651, 160, 7);
    pg.fillStyle(0xff6633); pg.fillRect(645, 170, 12, 4);

    // Kevin (placeholder with headphones)
    const kg = this.add.graphics().setDepth(200);
    kg.fillStyle(0x666688); kg.fillRect(245, 172, 12, 26);
    kg.fillStyle(0xccbb99); kg.fillCircle(251, 167, 7);
    kg.fillStyle(0x333333); kg.fillRect(244, 162, 2, 8);
    kg.fillRect(256, 162, 2, 8); kg.fillRect(244, 160, 14, 2);

    // Background NPCs (store refs for printer reaction)
    this.bgNpcGraphics = [];
    for (const npc of [
      { x: 310, y: 172, c: 0x558855 },
      { x: 370, y: 172, c: 0x885555 },
    ]) {
      const bg = this.add.graphics().setDepth(190);
      bg.fillStyle(npc.c); bg.fillRect(npc.x - 5, npc.y, 10, 24);
      bg.fillStyle(0xccbb99); bg.fillCircle(npc.x, npc.y - 5, 6);
      this.bgNpcGraphics.push(bg);
    }
  }

  // ── End of Chapter Cutscene ──

  private startEndCutscene(): void {
    this.cutsceneActive = true;
    this.input.enabled = false;

    // Crossfade to end chapter music
    if (this.currentMusic) {
      this.tweens.add({
        targets: this.currentMusic, volume: 0, duration: 1500,
        onComplete: () => { this.currentMusic?.stop(); this.currentMusic?.destroy(); this.currentMusic = null; },
      });
    }
    if (this.cache.audio.exists('end_chapter_music')) {
      const endMusic = this.sound.add('end_chapter_music', { volume: 0, loop: false });
      endMusic.play();
      this.tweens.add({ targets: endMusic, volume: 0.5, duration: 1500 });
    }

    const deskX = 145;
    const deskY = 210;

    // Step 1-2: Casey walks to desk
    const pos = this.player.getPosition();
    const path = this.navGrid.findPath(pos.x, pos.y, deskX - 20, deskY);
    this.player.walkPath(path, () => {
      // Step 3: Place laptop on desk (add laptop visual)
      const laptopSprite = this.add.rectangle(145, 195, 16, 10, 0x333333).setDepth(23);
      this.add.rectangle(145, 194, 14, 8, 0x4488cc).setDepth(24); // screen glow

      // Step 4: Desk lamp flickers on
      this.time.delayedCall(500, () => {
        const lampGlow = this.add.circle(160, 185, 12, 0xffee88, 0.3).setDepth(21);
        this.tweens.add({
          targets: lampGlow, alpha: { from: 0, to: 0.3 },
          duration: 200, yoyo: true, repeat: 2,
          onComplete: () => lampGlow.setAlpha(0.25),
        });
      });

      // Step 5: Casey sits and types (face south idle)
      this.time.delayedCall(1200, () => {
        (this.player as any).sprite.setFrame(CHAR_FRAMES.IDLE_S);

        // Step 6: Pause
        this.time.delayedCall(2000, () => {
          // Step 7-8: Priya walks over
          this.walkPriyaToCasey(() => {
            // Step 9: Priya arrives, brief pause
            this.time.delayedCall(500, () => {
              // Step 10-11: Auto-advancing dialogue
              this.playCutsceneDialogue();
            });
          });
        });
      });
    });
  }

  private walkPriyaToCasey(onDone: () => void): void {
    // Create a simple moving Priya graphic
    const priyaWalk = this.add.graphics().setDepth(490);
    priyaWalk.fillStyle(0xcc6699);
    priyaWalk.fillRect(-6, -15, 12, 30);
    priyaWalk.fillStyle(0xddaa77);
    priyaWalk.fillCircle(0, -20, 7);
    priyaWalk.fillStyle(0xff6633);
    priyaWalk.fillRect(-6, -10, 12, 4);

    const startX = 650, startY = 210;
    const targetX = 175, targetY = 210;
    priyaWalk.setPosition(startX, startY);

    // Footstep sounds during walk
    const stepTimer = this.time.addEvent({
      delay: 250, loop: true,
      callback: () => {
        if (this.cache.audio.exists('footstep_casey')) {
          this.sound.play('footstep_casey', {
            volume: 0.12,
            rate: 1.05 + Math.random() * 0.1, // slightly higher pitch
          });
        }
      },
    });

    this.tweens.add({
      targets: priyaWalk,
      x: targetX, y: targetY,
      duration: 3000,
      ease: 'Sine.inOut',
      onComplete: () => {
        stepTimer.destroy();
        onDone();
      },
    });
  }

  private playCutsceneDialogue(): void {
    const lines = [
      { speaker: 'priya', text: 'First commit?', portrait: null, delay: 3000 },
      { speaker: 'casey', text: 'Just setting up the dev environment. But yeah... first commit incoming.', portrait: null, delay: 4000 },
      { speaker: 'priya', text: 'Welcome to D.A.S.H., Casey. For real this time.', portrait: null, delay: 3500 },
    ];

    let lineIdx = 0;
    const cam = this.cameras.main;
    const boxY = cam.height - 80 - 8;

    const showLine = () => {
      if (lineIdx >= lines.length) {
        // All lines done — start the ending sequence
        this.time.delayedCall(500, () => this.endingSequence());
        return;
      }

      const line = lines[lineIdx];

      // Create minimal dialogue box (scrollFactor 0 so it stays on screen)
      const box = this.add.rectangle(320, boxY + 40, 624, 80, 0x0a0a1a, 0.92)
        .setDepth(900).setScrollFactor(0).setStrokeStyle(1, 0x444466);

      const speakerColors: Record<string, string> = { priya: '#ff9966', casey: '#88ccff' };
      const speakerNames: Record<string, string> = { priya: 'Priya', casey: 'Casey' };

      const nameText = this.add.text(24, boxY + 8, speakerNames[line.speaker] ?? line.speaker, {
        fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold',
        color: speakerColors[line.speaker] ?? '#ffffff',
      }).setDepth(901).setScrollFactor(0);

      const bodyText = this.add.text(24, boxY + 24, line.text, {
        fontFamily: 'monospace', fontSize: '10px', color: '#cccccc',
        wordWrap: { width: 590 }, lineSpacing: 3,
      }).setDepth(901).setScrollFactor(0);

      // Play babble
      const voiceKey = line.speaker === 'priya' ? 'voice_priya' : 'voice_casey';
      let babble: Phaser.Sound.BaseSound | null = null;
      if (this.cache.audio.exists(voiceKey)) {
        babble = this.sound.add(voiceKey, { loop: true, volume: 0.25 });
        babble.play();
      }

      // Auto-advance after delay
      this.time.delayedCall(line.delay, () => {
        babble?.stop();
        babble?.destroy();
        box.destroy();
        nameText.destroy();
        bodyText.destroy();
        lineIdx++;
        showLine();
      });
    };

    showLine();
  }

  private endingSequence(): void {
    const cam = this.cameras.main;

    // Step 12: Camera slowly zooms out
    cam.zoomTo(0.85, 3000);

    // Step 13: DAY 1 OF 90 banner visible in zoomed view

    // Step 14: Fade to black after zoom
    this.time.delayedCall(3500, () => {
      cam.fadeOut(2000, 0, 0, 0);

      cam.once('camerafadeoutcomplete', () => {
        // Step 15: "End of Chapter 1"
        const endText = this.add.text(320, 180, 'End of Chapter 1: Onboarding', {
          fontFamily: 'monospace', fontSize: '16px', color: '#e0e0e0', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(2000).setScrollFactor(0).setAlpha(0);

        this.tweens.add({
          targets: endText, alpha: 1, duration: 800,
          onComplete: () => {
            // Step 16-17: Hold, then swap text
            this.time.delayedCall(3000, () => {
              endText.setText('Chapter 2: Discovery — Coming Soon');
              endText.setFontSize('12px');
              endText.setColor('#ccaaff');

              // Step 18: Hold
              this.time.delayedCall(3000, () => {
                // Step 19: Save and return to title
                GameState.getInstance().setFlag('chapter_1_complete', true);
                GameState.getInstance().save();

                this.tweens.add({
                  targets: endText, alpha: 0, duration: 1000,
                  onComplete: () => {
                    this.scene.start('TitleScene');
                  },
                });
              });
            });
          },
        });
      });
    });
  }

  // ── Printer Reaction Event ──

  private printerReaction(): void {
    // Play printer burst SFX
    if (this.cache.audio.exists('sfx_printer_burst')) {
      this.sound.play('sfx_printer_burst', { volume: 0.4 });
    }

    // All background NPCs briefly look toward printer (x=260)
    // Simulate head turn by shifting graphics briefly
    for (const npcG of this.bgNpcGraphics) {
      this.tweens.add({
        targets: npcG, x: -3, duration: 200, yoyo: true, hold: 1300,
        ease: 'Sine.inOut',
      });
    }

    // One NPC shouts — floating text
    const shoutX = 310;
    const shoutY = 155;
    const shout = this.add.text(shoutX, shoutY, '"Hey, new person\nfixed the printer!"', {
      fontFamily: 'monospace', fontSize: '7px', color: '#ffffff',
      backgroundColor: '#334433cc', padding: { x: 4, y: 3 },
      fontStyle: 'italic',
    }).setOrigin(0.5, 1).setDepth(950).setAlpha(0);

    this.tweens.add({
      targets: shout, alpha: 1, y: shoutY - 5, duration: 400,
      onComplete: () => {
        this.time.delayedCall(3000, () => {
          this.tweens.add({
            targets: shout, alpha: 0, duration: 500,
            onComplete: () => shout.destroy(),
          });
        });
      },
    });
  }

  // ── Music Management ──

  private startMusic(key: string, volume: number): void {
    if (!this.cache.audio.exists(key)) return;
    this.currentMusic = this.sound.add(key, { loop: true, volume });
    this.currentMusic.play();
    this.currentMusicKey = key;
  }

  private crossfadeMusic(newKey: string, volume: number, duration = 1500): void {
    if (this.currentMusicKey === newKey) return;
    if (!this.cache.audio.exists(newKey)) return;

    const oldMusic = this.currentMusic;
    const newMusic = this.sound.add(newKey, { loop: true, volume: 0 });
    newMusic.play();
    this.currentMusic = newMusic;
    this.currentMusicKey = newKey;

    // Fade old out
    if (oldMusic) {
      this.tweens.add({
        targets: oldMusic, volume: 0, duration,
        onComplete: () => { oldMusic.stop(); oldMusic.destroy(); },
      });
    }
    // Fade new in
    this.tweens.add({ targets: newMusic, volume, duration });
  }

  private checkMusicState(): void {
    if (this.cutsceneActive) return;
    const st = GameState.getInstance();

    if (st.hasFlag('priya_test_active') && this.currentMusicKey !== 'puzzle_thinking') {
      this.crossfadeMusic('puzzle_thinking', 0.25);
    } else if (st.hasFlag('met_priya') && !st.hasFlag('priya_test_active') && this.currentMusicKey !== 'bullpen_chill') {
      this.crossfadeMusic('bullpen_chill', 0.3);
    }
  }

  private setupNavGrid(): void {
    this.navGrid = new NavGrid(WALK_MIN_X, WALK_MIN_Y, WALK_MAX_X, WALK_MAX_Y);
    this.navGrid.addObstacle(115, 200, 60, 24);     // Casey's desk
    this.navGrid.addObstacle(226, 175, 180, 35);     // Cubicle cluster
    this.navGrid.addObstacle(240, 235, 40, 30);      // Dead printer
    this.navGrid.addObstacle(400, 195, 100, 20);     // Break counter
    this.navGrid.addObstacle(615, 200, 70, 24);      // Priya's desk
    this.navGrid.addObstacle(670, 145, 40, 50);      // Whiteboard
    this.navGrid.addObstacle(740, 120, 100, 100);    // War Room
    this.navGrid.addObstacle(920, 142, 40, 80);      // Hallway exit
  }

  // ── Ambient Life ──

  private setupAmbientLife(): void {
    const rOff = () => Math.random() * 3000;

    this.generateAmbientTextures();

    // 1. Background NPC idle animations
    // NPC at x=310: typing
    if (this.anims.exists('bp_npc_typing')) this.anims.remove('bp_npc_typing');
    this.anims.create({
      key: 'bp_npc_typing',
      frames: [{ key: 'bp_typing_0' }, { key: 'bp_typing_1' }, { key: 'bp_typing_2' }, { key: 'bp_typing_1' }],
      frameRate: 4, repeat: -1,
    });
    const typingNpc = this.add.sprite(310, 185, 'bp_typing_0').setOrigin(0.5, 0.5).setDepth(191);
    this.time.delayedCall(rOff(), () => typingNpc.play('bp_npc_typing'));

    // NPC at x=370: on phone
    if (this.anims.exists('bp_npc_phone')) this.anims.remove('bp_npc_phone');
    this.anims.create({
      key: 'bp_npc_phone',
      frames: [{ key: 'bp_phone_0' }, { key: 'bp_phone_1' }, { key: 'bp_phone_0' }],
      frameRate: 3, repeat: -1,
    });
    const phoneNpc = this.add.sprite(370, 185, 'bp_phone_0').setOrigin(0.5, 0.5).setDepth(191);
    this.time.delayedCall(rOff() + 1000, () => phoneNpc.play('bp_npc_phone'));

    // 2. Coffee maker brew light blink
    if (this.anims.exists('bp_brew_blink')) this.anims.remove('bp_brew_blink');
    this.anims.create({
      key: 'bp_brew_blink',
      frames: [{ key: 'bp_brew_on' }, { key: 'bp_brew_off' }],
      frameRate: 1, repeat: -1,
    });
    const brewLight = this.add.sprite(420, 183, 'bp_brew_on').setOrigin(0.5, 0.5).setDepth(24);
    brewLight.play('bp_brew_blink');

    // 3. Dashboard TV screen flicker
    const tvFlicker = this.add.rectangle(700, 70, 76, 46, 0xffffff, 0).setDepth(4);
    const scheduleTvFlicker = () => {
      const delay = Phaser.Math.Between(20000, 30000);
      this.time.delayedCall(delay, () => {
        if (this.cutsceneActive) return;
        // Quick brightness flash
        tvFlicker.setAlpha(0.08);
        this.time.delayedCall(60, () => {
          tvFlicker.setAlpha(0);
          this.time.delayedCall(100, () => {
            tvFlicker.setAlpha(0.05);
            this.time.delayedCall(40, () => {
              tvFlicker.setAlpha(0);
              scheduleTvFlicker();
            });
          });
        });
      });
    };
    this.time.delayedCall(rOff() + 5000, scheduleTvFlicker);

    // 4. Fluorescent light flicker (same as Lobby)
    const lightPatch = this.add.rectangle(480, 12, 120, 8, 0xffffff, 0).setDepth(1);
    const scheduleLightFlicker = () => {
      const delay = Phaser.Math.Between(8000, 20000);
      this.time.delayedCall(delay, () => {
        if (this.cutsceneActive) return;
        lightPatch.setAlpha(0.06);
        this.time.delayedCall(30, () => {
          lightPatch.setAlpha(0);
          this.time.delayedCall(50, () => {
            lightPatch.setAlpha(0.03);
            this.time.delayedCall(30, () => {
              lightPatch.setAlpha(0);
              scheduleLightFlicker();
            });
          });
        });
      });
    };
    this.time.delayedCall(rOff(), scheduleLightFlicker);

    // 5. Priya idle at desk: writing cycle
    if (this.anims.exists('bp_priya_idle')) this.anims.remove('bp_priya_idle');
    this.anims.create({
      key: 'bp_priya_idle',
      frames: [
        { key: 'bp_priya_write_0' }, { key: 'bp_priya_write_1' },
        { key: 'bp_priya_write_0' }, { key: 'bp_priya_write_1' },
        { key: 'bp_priya_write_0' }, { key: 'bp_priya_glance' },
      ],
      frameRate: 2, repeat: -1,
    });
    const priyaIdle = this.add.sprite(648, 178, 'bp_priya_write_0').setOrigin(0.5, 0.5).setDepth(201);
    this.time.delayedCall(rOff() + 2000, () => priyaIdle.play('bp_priya_idle'));

    // 6. Kevin idle: minimal typing
    if (this.anims.exists('bp_kevin_idle')) this.anims.remove('bp_kevin_idle');
    this.anims.create({
      key: 'bp_kevin_idle',
      frames: [{ key: 'bp_kevin_0' }, { key: 'bp_kevin_1' }],
      frameRate: 2, repeat: -1,
    });
    const kevinIdle = this.add.sprite(248, 185, 'bp_kevin_0').setOrigin(0.5, 0.5).setDepth(201);
    this.time.delayedCall(rOff() + 1500, () => kevinIdle.play('bp_kevin_idle'));

    // 7. Printer paper jam LED blink (if not fixed)
    const printerLed = this.add.circle(275, 240, 2, 0xff4444).setDepth(22);
    const scheduleJamBlink = () => {
      this.time.delayedCall(800, () => {
        if (GameState.getInstance().hasFlag('printer_fixed')) {
          printerLed.setFillStyle(0x44ff44); // green after fixed
          return;
        }
        printerLed.setAlpha(printerLed.alpha > 0.5 ? 0.2 : 1);
        scheduleJamBlink();
      });
    };
    scheduleJamBlink();
  }

  private generateAmbientTextures(): void {
    // NPC typing frames (tiny silhouette with arm movement)
    for (let f = 0; f < 3; f++) {
      const g = this.add.graphics();
      const skin = 0xccbb99;
      const shirt = 0x558855;
      // Body
      g.fillStyle(shirt); g.fillRect(2, 6, 10, 14);
      // Head
      g.fillStyle(skin); g.fillCircle(7, 4, 4);
      // Arms typing - slight movement per frame
      g.fillStyle(skin);
      g.fillRect(1 + f, 14, 3, 2);
      g.fillRect(10 - f, 14, 3, 2);
      g.generateTexture(`bp_typing_${f}`, 14, 22);
      g.destroy();
    }

    // NPC phone frames
    for (let f = 0; f < 2; f++) {
      const g = this.add.graphics();
      g.fillStyle(0x885555); g.fillRect(2, 6, 10, 14);
      g.fillStyle(0xccbb99); g.fillCircle(7, 4, 4);
      // Hand holding phone to ear
      g.fillStyle(0xccbb99); g.fillRect(11, 2 + f, 3, 4);
      g.fillStyle(0x333333); g.fillRect(12, 1 + f, 2, 5); // phone
      g.generateTexture(`bp_phone_${f}`, 16, 22);
      g.destroy();
    }

    // Brew light frames
    for (const [suffix, color, alpha] of [['on', 0xff8800, 1], ['off', 0xff8800, 0.15]] as const) {
      const g = this.add.graphics();
      g.fillStyle(color as number, alpha as number);
      g.fillCircle(3, 3, 3);
      g.generateTexture(`bp_brew_${suffix}`, 7, 7);
      g.destroy();
    }

    // Priya idle frames (writing + glance)
    for (let f = 0; f < 3; f++) {
      const g = this.add.graphics();
      const skin = 0xddaa77;
      const blazer = 0x4466aa;
      const scarf = 0xff6633;
      g.fillStyle(blazer); g.fillRect(2, 8, 12, 16);
      g.fillStyle(scarf); g.fillRect(2, 10, 12, 3);
      g.fillStyle(skin); g.fillCircle(8, 5, 5);
      // Hair
      g.fillStyle(0x222222); g.fillRect(4, 0, 8, 4);
      // Pen behind ear
      g.fillStyle(0x333333); g.fillRect(13, 3, 1, 5);
      if (f < 2) {
        // Writing: arm moves
        g.fillStyle(skin); g.fillRect(1 + f, 18, 3, 2);
        g.fillRect(12 - f, 18, 3, 2);
      } else {
        // Glancing at whiteboard: head turned slightly
        g.fillStyle(skin); g.fillRect(12, 4, 3, 3);
        g.fillStyle(skin); g.fillRect(3, 18, 3, 2);
        g.fillRect(10, 18, 3, 2);
      }
      const key = f < 2 ? `bp_priya_write_${f}` : 'bp_priya_glance';
      g.generateTexture(key, 16, 26);
      g.destroy();
    }

    // Kevin idle frames (minimal)
    for (let f = 0; f < 2; f++) {
      const g = this.add.graphics();
      g.fillStyle(0x666688); g.fillRect(2, 8, 10, 14);
      g.fillStyle(0xccbb99); g.fillCircle(7, 5, 5);
      // Headphones
      g.fillStyle(0x333333);
      g.fillRect(1, 3, 2, 6); g.fillRect(11, 3, 2, 6); g.fillRect(1, 2, 12, 2);
      // Arms - barely move
      g.fillStyle(0xccbb99);
      g.fillRect(1, 16 + f, 3, 2);
      g.fillRect(10, 16 + (1 - f), 3, 2);
      g.generateTexture(`bp_kevin_${f}`, 14, 22);
      g.destroy();
    }
  }
}
