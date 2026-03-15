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
import priyaPortraitUrl from '../assets/sprites/portraits/priya_default.png';
import kevinPortraitUrl from '../assets/sprites/portraits/kevin_default.png';
// Bullpen item icons
import iconNoteFadedUrl from '../assets/sprites/items/icon_note_faded.png';
import iconUmbrellaUrl from '../assets/sprites/items/icon_umbrella.png';
import iconNoteCodeUrl from '../assets/sprites/items/icon_note_code.png';
import iconLaptopUrl from '../assets/sprites/items/icon_laptop.png';
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
import bpPriyaUrl from '../assets/sprites/bullpen/priya_at_desk.png';
import bpKevinUrl from '../assets/sprites/bullpen/kevin_seated.png';
import bpWhiteboardUrl from '../assets/sprites/bullpen/whiteboard.png';
import bpNpcTypingUrl from '../assets/sprites/bullpen/bg_npc_typing.png';
import bpNpcPhoneUrl from '../assets/sprites/bullpen/bg_npc_phone.png';
import bpNpcStaringUrl from '../assets/sprites/bullpen/bg_npc_staring.png';

const bullpenHotspots = bullpenHotspotsRaw as unknown as SceneHotspotFile;

// Scene dimensions
const SCENE_W = 960;
const SCENE_H = 360;
const WALK_MIN_X = 10;
const WALK_MAX_X = 950;
const WALK_MIN_Y = 190;  // Same as Lobby
const WALK_MAX_Y = 320;

// No FLOOR_LINE constant — use same Y values as the Lobby directly.
// Wall: y=0..~165. Floor: y=~165..360. Furniture bases: y=168-210. Characters: y=200+.

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
    this.load.image('portrait_priya', priyaPortraitUrl);
    this.load.image('portrait_kevin', kevinPortraitUrl);

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
    this.load.image('icon_note_faded', iconNoteFadedUrl);
    this.load.image('icon_umbrella', iconUmbrellaUrl);
    this.load.image('icon_note_code', iconNoteCodeUrl);
    this.load.image('icon_laptop', iconLaptopUrl);

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
    this.load.image('bp_priya', bpPriyaUrl);
    this.load.image('bp_kevin', bpKevinUrl);
    this.load.image('bp_whiteboard', bpWhiteboardUrl);
    this.load.image('bp_npc_typing', bpNpcTypingUrl);
    this.load.image('bp_npc_phone', bpNpcPhoneUrl);
    this.load.image('bp_npc_staring', bpNpcStaringUrl);
  }

  create(): void {
    this.sound.stopAll();
    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    const state = GameState.getInstance();
    if (state.hasItem('temporary_badge')) state.removeItem('temporary_badge');
    state.setFlag('scene_bullpen_entered', true);
    state.enableAutoSave();

    this.drawBackground();
    this.drawFurniture();
    this.drawNPCs();
    this.drawDetails();
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

  // ── Visual layout ──
  // ════════════════════════════════════════════════════
  // DRAWING — uses IDENTICAL Y values and scales as the Lobby
  // Lobby reference: wall items y=42-122, furniture y=168-210,
  // characters feet y=200, NO setScale anywhere, all native size.
  // ════════════════════════════════════════════════════

  private drawBackground(): void {
    const g = this.add.graphics().setDepth(0);

    // Wall — same color as Lobby lobby_bg wall area
    g.fillStyle(0xe8e0cc);
    g.fillRect(0, 0, SCENE_W, 165);
    // Baseboard
    g.fillStyle(0x8a7e60);
    g.fillRect(0, 163, SCENE_W, 4);

    // Floor — beige linoleum, same as Lobby
    g.fillStyle(0xd4c8a0);
    g.fillRect(0, 167, SCENE_W, SCENE_H - 167);
    g.fillStyle(0xc8bc94, 0.4);
    for (let y = 167; y < SCENE_H; y += 24) {
      for (let x = 0; x < SCENE_W; x += 24) {
        if ((Math.floor(x / 24) + Math.floor(y / 24)) % 2 === 0) g.fillRect(x, y, 24, 24);
      }
    }

    // Fluorescent lights
    g.fillStyle(0xffffff, 0.035);
    for (let x = 60; x < SCENE_W; x += 180) g.fillRect(x, 8, 100, 8);

    // ── WALL ITEMS (same Y range as Lobby: 42-122) ──

    // Banner: y=60 (same as Lobby poster at y=78)
    const bx = 480, by = 60;
    this.add.rectangle(bx, by, 120, 28, 0xffffff).setDepth(1).setStrokeStyle(1, 0xdddddd);
    this.add.text(bx, by - 5, 'D.A.S.H. MODERNIZATION INITIATIVE', {
      fontFamily: 'monospace', fontSize: '3px', color: '#666666',
    }).setOrigin(0.5).setDepth(2);
    this.add.text(bx, by + 5, 'DAY 1 OF 90', {
      fontFamily: 'monospace', fontSize: '7px', color: '#cc3333', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);
    const tape = this.add.graphics().setDepth(2);
    tape.fillStyle(0xeeddaa, 0.6);
    tape.fillRect(bx - 60, by - 14, 10, 4);
    tape.fillRect(bx + 50, by - 14, 10, 4);

    // Dashboard TV: y=80 (same height as Lobby poster/bulletin)
    this.add.image(720, 80, 'bp_dashboard_tv').setOrigin(0.5, 0.5).setDepth(1);

    // Supply closet door: base at y=167 (floor line), extends up into wall
    this.add.image(660, 167, 'bp_supply_closet').setOrigin(0.5, 1).setDepth(3);

    // B2 exit door
    g.fillStyle(0x3a3a3a); g.fillRect(925, 70, 35, 97);
    g.fillStyle(0x4a4a4a); g.fillRect(927, 72, 31, 93);
    g.fillStyle(0x888888); g.fillRect(952, 115, 3, 6);
    this.add.text(942, 80, 'B2 LEVEL', { fontFamily: 'monospace', fontSize: '4px', color: '#aaaaaa' }).setOrigin(0.5).setDepth(2);
  }

  private drawFurniture(): void {
    // ALL furniture uses SAME Y values as Lobby (168-210), NO setScale

    // Coat rack: base at y=168 (same as Lobby ficus)
    this.add.image(50, 168, 'bp_coat_rack').setOrigin(0.5, 1).setDepth(20);

    // Casey's desk: center y=210 (same as Lobby security desk)
    this.add.image(140, 210, 'bp_casey_desk').setOrigin(0.5, 0.5).setDepth(30);

    // Cubicles: drawn with graphics, desk surfaces at y~195 (waist height)
    const cubX = [250, 330, 410, 490];
    const cubOccupied = [true, true, true, false];
    for (let i = 0; i < 4; i++) {
      const cx = cubX[i];
      // Back wall at y=170 (just below wall/floor line)
      this.add.rectangle(cx, 170, 56, 4, 0x9a9a9a).setDepth(15);
      // Side walls
      this.add.rectangle(cx - 27, 185, 4, 34, 0x9a9a9a).setDepth(15);
      this.add.rectangle(cx + 27, 185, 4, 34, 0x9a9a9a).setDepth(15);
      // Desk at y=195 (same as chairs in Lobby at y=180)
      this.add.rectangle(cx, 195, 48, 12, 0x8a7e60).setDepth(28);
      // Monitor on desk
      this.add.rectangle(cx, 186, 12, 8, 0x222222).setDepth(29);

      if (!cubOccupied[i]) {
        const dg = this.add.graphics().setDepth(29);
        dg.fillStyle(0xeeeedd); dg.fillRect(cx - 12, 187, 9, 6);
        dg.fillStyle(0xddddcc); dg.fillRect(cx + 5, 188, 7, 5);
        dg.fillStyle(0x887744); dg.fillRect(cx + 16, 182, 5, 7);
        dg.fillStyle(0x665533); dg.fillRect(cx + 15, 188, 7, 4);
        this.add.text(cx, 198, 'RESERVED', {
          fontFamily: 'monospace', fontSize: '3px', color: '#cc4444',
        }).setOrigin(0.5).setDepth(30);
      }
    }

    // Printer: center y=210 (same as desk/turnstile)
    this.add.image(570, 210, 'bp_dead_printer').setOrigin(0.5, 0.5).setDepth(30);

    // Break area counter: center y=195 (waist height, same as cubicle desks)
    this.add.rectangle(760, 195, 100, 16, 0x8a7e60).setDepth(28);
    this.add.rectangle(760, 201, 100, 4, 0x7a6e50).setDepth(29);
    // Coffee maker on counter (native size, no scale)
    this.add.image(730, 190, 'bp_coffee_maker').setOrigin(0.5, 1).setDepth(30);
    // Microwave
    this.add.image(765, 190, 'bp_microwave').setOrigin(0.5, 1).setDepth(30);
    // Mini fridge: base at y=210 (floor-standing)
    this.add.image(810, 210, 'bp_mini_fridge').setOrigin(0.5, 1).setDepth(30);
    // Dirty mugs
    const mugG = this.add.graphics().setDepth(31);
    mugG.fillStyle(0xddddcc); mugG.fillRect(783, 183, 4, 6);
    mugG.fillRect(789, 184, 3, 5);
    mugG.fillStyle(0xbbaa99); mugG.fillRect(794, 183, 4, 6);

    // Priya's desk: center y=200 (like Gladys behind security desk at y=200)
    this.add.rectangle(880, 200, 80, 16, 0x8a7e60).setDepth(28);
    this.add.rectangle(880, 206, 80, 4, 0x7a6e50).setDepth(29);
    this.add.rectangle(868, 188, 12, 10, 0x222222).setDepth(30);
    this.add.rectangle(884, 188, 12, 10, 0x222222).setDepth(30);
    const nc = [0xf0e868, 0x88ccff, 0xff88aa, 0x88ff88, 0xffaa44, 0xcc88ff];
    for (let i = 0; i < 6; i++) {
      this.add.rectangle(900 + (i % 3) * 5, 186 + Math.floor(i / 3) * 5, 4, 4, nc[i]).setDepth(30);
    }
    // Thriving plant
    const pl = this.add.graphics().setDepth(31);
    pl.fillStyle(0x44aa44); pl.fillCircle(918, 182, 6);
    pl.fillStyle(0x55cc55); pl.fillCircle(916, 178, 4);
    pl.fillStyle(0x664422); pl.fillRect(916, 187, 5, 6);

    // Whiteboard: base at y=182 (taller than Casey, on floor behind desk)
    this.add.image(935, 182, 'bp_whiteboard').setOrigin(0.5, 1).setDepth(10);
  }

  private drawNPCs(): void {
    // Characters at y=200, origin(0.5,1) — SAME as Lobby's Gladys at (325,200)
    // NO setScale — sprites are 48x48 or 64x64, same as Lobby characters

    // Cubicle #1: typing woman — depth 20 (behind desk at depth 28)
    this.add.image(250, 200, 'bp_npc_typing').setOrigin(0.5, 1).setDepth(20);
    // Cubicle #2: KEVIN
    this.add.image(330, 200, 'bp_kevin').setOrigin(0.5, 1).setDepth(20);
    // Cubicle #3: man on phone
    this.add.image(410, 200, 'bp_npc_phone').setOrigin(0.5, 1).setDepth(20);
    // Cubicle #4: VACANT

    // Priya at desk — depth 20 (behind desk at depth 28, like Gladys behind security desk)
    this.add.image(878, 200, 'bp_priya').setOrigin(0.5, 1).setDepth(20);

    this.bgNpcGraphics = [];
  }

  // ── Environmental Storytelling Details ──

  private drawDetails(): void {
    const d = this.add.graphics().setDepth(32);

    // ════ CUBICLE 1 (x=250): neat, holding it together ════
    // "BREATHE" sticky note on monitor
    d.fillStyle(0xf0e868); d.fillRect(256, 183, 8, 5);
    this.add.text(260, 185, 'BREATHE', { fontFamily: 'monospace', fontSize: '2px', color: '#666600' }).setOrigin(0.5).setDepth(33);
    // Desk cactus (tiny, thriving — the one survivor)
    d.fillStyle(0x338833); d.fillRect(240, 189, 3, 5);
    d.fillStyle(0x44aa44); d.fillRect(239, 187, 2, 3);
    d.fillStyle(0x44aa44); d.fillRect(243, 188, 2, 3);
    d.fillStyle(0x664422); d.fillRect(239, 193, 5, 2);
    // Family photo frame
    d.fillStyle(0x554433); d.fillRect(260, 189, 6, 5);
    d.fillStyle(0xaabbcc); d.fillRect(261, 190, 4, 3);

    // ════ CUBICLE 2 (x=330): KEVIN — nothing personal ════
    // "NO" post-it on cubicle back wall
    d.fillStyle(0xf0e868); d.fillRect(340, 168, 7, 5);
    this.add.text(343, 170, 'NO', { fontFamily: 'monospace', fontSize: '2px', color: '#cc0000', fontStyle: 'bold' }).setOrigin(0.5).setDepth(33);
    // 3 identical browser tabs on monitor (tiny lines)
    d.fillStyle(0x4488cc); d.fillRect(326, 184, 3, 1);
    d.fillStyle(0x4488cc); d.fillRect(330, 184, 3, 1);
    d.fillStyle(0x4488cc); d.fillRect(334, 184, 3, 1);
    // Unwashed coffee mug (the only personal item)
    d.fillStyle(0xccbbaa); d.fillRect(342, 191, 4, 4);
    d.fillStyle(0x998877); d.fillRect(342, 191, 4, 1);

    // ════ CUBICLE 3 (x=410): sticky note explosion ════
    // Sticky notes EVERYWHERE — on monitor, walls, desk
    const stickyColors = [0xf0e868, 0xff88aa, 0x88ccff, 0x88ff88, 0xffaa44];
    for (let s = 0; s < 12; s++) {
      const sx = 398 + Math.floor(Math.random() * 24);
      const sy = 168 + Math.floor(Math.random() * 24);
      d.fillStyle(stickyColors[s % stickyColors.length]);
      d.fillRect(sx, sy, 4, 3);
    }
    // Stress ball (squeezed into weird shape)
    d.fillStyle(0xff6633); d.fillCircle(422, 192, 2);
    d.fillStyle(0xff7744); d.fillRect(421, 191, 4, 2);
    // Desk calendar showing wrong month
    d.fillStyle(0xffffff); d.fillRect(398, 190, 6, 5);
    d.fillStyle(0xcc3333); d.fillRect(398, 190, 6, 1);

    // ════ CUBICLE 4 (x=490): empty — RESERVED, already has dead plant ════
    // "I SURVIVED THE 2019 MIGRATION" mug (left behind)
    d.fillStyle(0xeeeeee); d.fillRect(482, 191, 5, 5);
    d.fillStyle(0xdddddd); d.fillRect(482, 191, 5, 1);
    d.fillStyle(0xeeeeee); d.fillRect(487, 193, 2, 2); // handle
    // Dust on keyboard (lighter pixels on desk)
    d.fillStyle(0xc0b890, 0.3); d.fillRect(492, 192, 12, 3);

    // ════ CASEY'S DESK (x=140) — the saddest desk ════
    // Lonely ethernet cable dangling off back (not connected)
    d.fillStyle(0x336699); d.fillRect(160, 208, 2, 12);
    d.fillStyle(0x336699); d.fillRect(159, 218, 4, 2);

    // ════ BREAK AREA SIGNS ════
    // Coffee maker sign (tiny)
    this.add.text(730, 178, 'IF EMPTY\nMAKE MORE\n-DAVE', {
      fontFamily: 'monospace', fontSize: '2px', color: '#884422',
    }).setOrigin(0.5).setDepth(33);
    // Microwave sign
    this.add.text(765, 178, 'CLEAN YOUR\nOWN DISHES', {
      fontFamily: 'monospace', fontSize: '2px', color: '#cc0000',
    }).setOrigin(0.5).setDepth(33);
    // Mini fridge labels
    d.fillStyle(0xffffff); d.fillRect(805, 195, 10, 3);
    d.fillStyle(0xffffff); d.fillRect(805, 200, 10, 3);
    this.add.text(810, 196, "DAVE'S", { fontFamily: 'monospace', fontSize: '1px', color: '#333333' }).setOrigin(0.5).setDepth(33);
    this.add.text(810, 201, 'BIOHAZARD', { fontFamily: 'monospace', fontSize: '1px', color: '#cc0000' }).setOrigin(0.5).setDepth(33);
    // More dirty mugs near counter
    d.fillStyle(0xddccbb); d.fillRect(798, 184, 3, 5);
    d.fillStyle(0xccbbaa); d.fillRect(802, 185, 3, 4);
    // Sad brown banana
    d.fillStyle(0x887744); d.fillRect(774, 184, 5, 2);
    d.fillStyle(0x776633); d.fillRect(775, 183, 3, 1);

    // ════ PRIYA'S DESK — organized chaos ════
    // "I BELIEVE IN UX" sticker on monitor bezel
    d.fillStyle(0x4488cc); d.fillRect(866, 196, 8, 2);
    // Book as monitor stand
    d.fillStyle(0x884422); d.fillRect(862, 196, 14, 3);
    // Color-coded sticky clusters (yellow=todo, pink=urgent, blue=ideas, green=done)
    // Already placed in drawFurniture, but add the "WHY???" on whiteboard
    this.add.text(938, 170, 'WHY???', {
      fontFamily: 'monospace', fontSize: '2px', color: '#cc0000',
    }).setOrigin(0.5).setDepth(12);
    // Red circle around a section on whiteboard
    const whiteG = this.add.graphics().setDepth(12);
    whiteG.lineStyle(1, 0xcc0000, 0.7);
    whiteG.strokeCircle(935, 168, 6);

    // ════ WALL DECOR ════
    // Employee of the Month frame (empty — "YOUR NAME HERE")
    d.fillStyle(0x554433); d.fillRect(340, 80, 18, 14);
    d.fillStyle(0xddddcc); d.fillRect(342, 82, 14, 10);
    this.add.text(349, 84, 'EMPLOYEE\nOF THE\nMONTH', {
      fontFamily: 'monospace', fontSize: '1.5px', color: '#888866',
    }).setOrigin(0.5).setDepth(2);
    this.add.text(349, 90, 'YOUR NAME\nHERE', {
      fontFamily: 'monospace', fontSize: '1px', color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(2);

    // Fire safety map (outdated)
    d.fillStyle(0xffffff); d.fillRect(580, 90, 12, 9);
    d.fillStyle(0xcc3333); d.fillRect(580, 90, 12, 2);
    this.add.text(586, 96, 'EXIT', { fontFamily: 'monospace', fontSize: '1.5px', color: '#cc3333' }).setOrigin(0.5).setDepth(2);

    // Ergonomics poster (taped at wrong height — ironic)
    d.fillStyle(0xffffff); d.fillRect(700, 120, 10, 14);
    d.fillStyle(0x4488cc); d.fillRect(700, 120, 10, 3);
    // Tape at angles
    d.fillStyle(0xeeddaa, 0.6); d.fillRect(699, 118, 5, 2);
    d.fillStyle(0xeeddaa, 0.6); d.fillRect(708, 133, 4, 2);

    // ════ FLOOR DETAILS ════
    // Scuff marks on linoleum
    d.fillStyle(0xb0a484, 0.3); d.fillRect(300, 240, 8, 2);
    d.fillStyle(0xb0a484, 0.2); d.fillRect(600, 260, 6, 1);
    d.fillStyle(0xb0a484, 0.25); d.fillRect(450, 280, 10, 2);

    // Mismatched floor tile near printer
    d.fillStyle(0xd8cc9e, 0.4); d.fillRect(552, 216, 24, 24);

    // Paper airplane on floor near cubicles
    d.fillStyle(0xeeeeee); d.fillRect(380, 250, 6, 2);
    d.fillStyle(0xdddddd); d.fillRect(381, 249, 4, 1);
    d.fillStyle(0xdddddd); d.fillRect(381, 252, 4, 1);

    // Cables along baseboard
    d.fillStyle(0x333333, 0.4);
    d.fillRect(200, 165, 80, 1);
    d.fillRect(500, 165, 60, 1);
    d.fillRect(830, 165, 50, 1);
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

    // One NPC shouts — floating text above cubicle area
    const shoutX = 330;
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
    // Same approach as Lobby — obstacles at the furniture footprints
    this.navGrid.addObstacle(108, 190, 64, 30);    // Casey's desk
    this.navGrid.addObstacle(223, 168, 300, 36);    // Cubicle row
    this.navGrid.addObstacle(545, 190, 50, 30);     // Printer
    this.navGrid.addObstacle(710, 190, 100, 16);    // Break counter
    this.navGrid.addObstacle(800, 190, 20, 24);     // Mini fridge
    this.navGrid.addObstacle(840, 190, 80, 24);     // Priya's desk
    this.navGrid.addObstacle(915, 168, 40, 36);     // Whiteboard area
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
    const typingNpc = this.add.sprite(250, 190, 'bp_typing_0').setOrigin(0.5, 0.5).setDepth(19);
    this.time.delayedCall(rOff(), () => typingNpc.play('bp_npc_typing'));

    // NPC at x=370: on phone
    if (this.anims.exists('bp_npc_phone')) this.anims.remove('bp_npc_phone');
    this.anims.create({
      key: 'bp_npc_phone',
      frames: [{ key: 'bp_phone_0' }, { key: 'bp_phone_1' }, { key: 'bp_phone_0' }],
      frameRate: 3, repeat: -1,
    });
    const phoneNpc = this.add.sprite(410, 190, 'bp_phone_0').setOrigin(0.5, 0.5).setDepth(19);
    this.time.delayedCall(rOff() + 1000, () => phoneNpc.play('bp_npc_phone'));

    // 2. Coffee maker brew light blink
    if (this.anims.exists('bp_brew_blink')) this.anims.remove('bp_brew_blink');
    this.anims.create({
      key: 'bp_brew_blink',
      frames: [{ key: 'bp_brew_on' }, { key: 'bp_brew_off' }],
      frameRate: 1, repeat: -1,
    });
    const brewLight = this.add.sprite(730, 175, 'bp_brew_on').setOrigin(0.5, 0.5).setDepth(31);
    brewLight.play('bp_brew_blink');

    // 3. Dashboard TV screen flicker
    const tvFlicker = this.add.rectangle(720, 80, 55, 40, 0xffffff, 0).setDepth(4);
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
    const priyaIdle = this.add.sprite(878, 188, 'bp_priya_write_0').setOrigin(0.5, 0.5).setDepth(19);
    this.time.delayedCall(rOff() + 2000, () => priyaIdle.play('bp_priya_idle'));

    // 6. Kevin idle: minimal typing
    if (this.anims.exists('bp_kevin_idle')) this.anims.remove('bp_kevin_idle');
    this.anims.create({
      key: 'bp_kevin_idle',
      frames: [{ key: 'bp_kevin_0' }, { key: 'bp_kevin_1' }],
      frameRate: 2, repeat: -1,
    });
    const kevinIdle = this.add.sprite(330, 190, 'bp_kevin_0').setOrigin(0.5, 0.5).setDepth(19);
    this.time.delayedCall(rOff() + 1500, () => kevinIdle.play('bp_kevin_idle'));

    // 7. Printer paper jam LED blink (if not fixed)
    const printerLed = this.add.circle(578, 188, 2, 0xff4444).setDepth(31);
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
