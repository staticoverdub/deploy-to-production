import Phaser from 'phaser';
import { Player, CHAR_FRAMES } from '../engine/Player';
import { HotspotManager, SceneHotspotFile } from '../engine/HotspotManager';
import { DialogueManager, DialogueTree } from '../engine/DialogueManager';
import { InventoryUI } from '../engine/InventoryUI';
import { GameState } from '../engine/GameState';
import { CursorManager, CursorState } from '../engine/CursorManager';
import { NavGrid } from '../engine/NavGrid';
import { DebugMenu } from '../engine/DebugMenu';
import { createPauseButton } from '../engine/PauseButton';

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
import iconLobbyCoffeeUrl from '../assets/sprites/items/icon_lobby_coffee.png';
import iconNtGuideUrl from '../assets/sprites/items/icon_nt_admin_guide.png';
import bullpenMusicUrl from '../assets/audio/music/bullpen_theme.mp3';
import bullpenChillUrl from '../assets/audio/music/bullpen_chill.mp3';
import puzzleThinkingUrl from '../assets/audio/music/puzzle_thinking.mp3';
import endChapterMusicUrl from '../assets/audio/music/end_chapter.mp3';
import softSavePointUrl from '../assets/audio/music/Soft Save Point Swing.mp3';
import sfxTriumphUrl from '../assets/audio/sfx/sfx_triumph.mp3';
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
// PixelLab character spritesheets (64x64 frames)
import bpTypingSheetUrl from '../assets/sprites/bullpen/typing_woman_sheet.png';
import bpKevinSheetUrl from '../assets/sprites/bullpen/kevin_sheet.png';
import bpPhoneGuySheetUrl from '../assets/sprites/bullpen/phone_guy_sheet.png';
import bpPriyaSheetUrl from '../assets/sprites/bullpen/priya_sheet.png';
import bpPriyaWalkSheetUrl from '../assets/sprites/bullpen/priya_walk_sheet.png';
import bpCoffeeTableUrl from '../assets/sprites/bullpen/coffee_table.png';
import bpVisitorChairsUrl from '../assets/sprites/bullpen/visitor_chairs.png';
import bpWaterCoolerUrl from '../assets/sprites/bullpen/water_cooler.png';
import bpTrashCanUrl from '../assets/sprites/bullpen/trash_can.png';
import bpFloorPlantUrl from '../assets/sprites/bullpen/floor_plant.png';
import bpWallClockUrl from '../assets/sprites/bullpen/wall_clock.png';
import bpPosterSynergyUrl from '../assets/sprites/bullpen/poster_synergy.png';
import bpPosterExcellenceUrl from '../assets/sprites/bullpen/poster_excellence.png';
import bpEmployeeOfMonthUrl from '../assets/sprites/bullpen/employee_of_month.png';
import bpFireExtinguisherUrl from '../assets/sprites/bullpen/fire_extinguisher.png';
import bpLockersUrl from '../assets/sprites/bullpen/lockers.png';
import bpWetFloorSignUrl from '../assets/sprites/bullpen/wet_floor_sign.png';
// Lore object sprites
import bpFilingCabinetUrl from '../assets/sprites/bullpen/filing_cabinet.png';
import bpFaxMachineUrl from '../assets/sprites/bullpen/fax_machine.png';
import bpAncientDesktopUrl from '../assets/sprites/bullpen/ancient_desktop.png';
import bpBreakroomWhiteboardUrl from '../assets/sprites/bullpen/breakroom_whiteboard.png';
import bpBreakroomTableUrl from '../assets/sprites/bullpen/breakroom_table.png';
import bpOfficeCalendarUrl from '../assets/sprites/bullpen/office_calendar.png';

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
  private introActive = false;
  private introBubble: Phaser.GameObjects.Text | null = null;
  private debugMenu: DebugMenu | null = null;
  private printerSprite: Phaser.GameObjects.Image | null = null;
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
    this.load.audio('soft_save_point', softSavePointUrl);
    this.load.audio('sfx_triumph', sfxTriumphUrl);
    this.load.audio('sfx_printer_burst', sfxPrinterBurstUrl);
    this.load.audio('sfx_keypad_press', sfxKeypadPressUrl);
    this.load.audio('sfx_closet_open', sfxClosetOpenUrl);
    this.load.audio('sfx_laptop_open', sfxLaptopOpenUrl);

    this.load.image('icon_flyer', iconFlyerUrl);
    this.load.image('icon_cup_empty', iconCupEmptyUrl);
    this.load.image('icon_cup_water', iconCupWaterUrl);
    this.load.image('icon_badge', iconBadgeUrl);
    this.load.image('icon_lobby_coffee', iconLobbyCoffeeUrl);
    this.load.image('icon_nt_guide', iconNtGuideUrl);
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
    this.load.image('bp_coffee_table', bpCoffeeTableUrl);
    this.load.image('bp_visitor_chairs', bpVisitorChairsUrl);
    this.load.image('bp_water_cooler', bpWaterCoolerUrl);
    this.load.image('bp_trash_can', bpTrashCanUrl);
    this.load.image('bp_floor_plant', bpFloorPlantUrl);
    this.load.image('bp_wall_clock', bpWallClockUrl);
    this.load.image('bp_poster_synergy', bpPosterSynergyUrl);
    this.load.image('bp_poster_excellence', bpPosterExcellenceUrl);
    this.load.image('bp_employee_of_month', bpEmployeeOfMonthUrl);
    this.load.image('bp_fire_extinguisher', bpFireExtinguisherUrl);
    this.load.image('bp_lockers', bpLockersUrl);
    this.load.image('bp_wet_floor_sign', bpWetFloorSignUrl);
    // Lore objects
    this.load.image('bp_filing_cabinet', bpFilingCabinetUrl);
    this.load.image('bp_fax_machine', bpFaxMachineUrl);
    this.load.image('bp_ancient_desktop', bpAncientDesktopUrl);
    this.load.image('bp_breakroom_whiteboard', bpBreakroomWhiteboardUrl);
    this.load.image('bp_breakroom_table', bpBreakroomTableUrl);
    this.load.image('bp_office_calendar', bpOfficeCalendarUrl);

    // PixelLab character spritesheets: frame 0 = idle south, frames 1-4 = breathing-idle
    const ssConfig64 = { frameWidth: 64, frameHeight: 64 };
    this.load.spritesheet('char_typing_woman', bpTypingSheetUrl, ssConfig64);
    this.load.spritesheet('char_kevin', bpKevinSheetUrl, ssConfig64);
    this.load.spritesheet('char_phone_guy', bpPhoneGuySheetUrl, ssConfig64);
    this.load.spritesheet('char_priya', bpPriyaSheetUrl, ssConfig64);
    this.load.spritesheet('char_priya_walk', bpPriyaWalkSheetUrl, ssConfig64);
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
      if (this.introActive) return;

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
    createPauseButton(this, 'BullpenScene');

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
      onComplete: () => {
        wipe.destroy();
        // Start intro cutscene on first visit
        if (!state.hasFlag('bullpen_intro_complete')) {
          this.startBullpenIntro();
        }
      },
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

    // Supply closet door: base at y=168 (floor line), extends up into wall
    this.add.image(660, 168, 'bp_supply_closet').setOrigin(0.5, 1).setDepth(3);

    // B2 exit door
    g.fillStyle(0x3a3a3a); g.fillRect(925, 70, 35, 97);
    g.fillStyle(0x4a4a4a); g.fillRect(927, 72, 31, 93);
    g.fillStyle(0x888888); g.fillRect(952, 115, 3, 6);
    this.add.text(942, 80, 'B2 LEVEL', { fontFamily: 'monospace', fontSize: '4px', color: '#aaaaaa' }).setOrigin(0.5).setDepth(2);
  }

  private drawFurniture(): void {
    // ALL furniture uses SAME Y values as Lobby (168-210), NO setScale

    // Coat rack: base at y=175
    this.add.image(50, 175, 'bp_coat_rack').setOrigin(0.5, 1).setDepth(20);

    // Employee lockers (against wall, right of coat rack)
    this.add.image(95, 175, 'bp_lockers').setOrigin(0.5, 1).setDepth(12);

    // War Room door (against wall, under Day 1 of 90 banner)
    this.add.image(480, 171, 'bp_war_room').setOrigin(0.5, 1).setDepth(12);

    // Casey's desk: center y=210 (same as Lobby security desk), 30% bigger
    this.add.image(140, 210, 'bp_casey_desk').setOrigin(0.5, 0.5).setDepth(30).setScale(1.3);

    // Cubicles: drawn with graphics, desk surfaces at y~195 (waist height)
    const cubX = [250, 330, 410, 490];
    const cubOccupied = [true, true, true, false];
    for (let i = 0; i < 4; i++) {
      const cx = cubX[i];
      // Back wall at y=170 — 30% wider
      this.add.rectangle(cx, 170, 73, 4, 0x9a9a9a).setDepth(15);
      // Side walls — spaced wider to match
      this.add.rectangle(cx - 35, 185, 4, 34, 0x9a9a9a).setDepth(15);
      this.add.rectangle(cx + 35, 185, 4, 34, 0x9a9a9a).setDepth(15);
      // Desk at y=195 — 30% bigger
      this.add.rectangle(cx, 195, 62, 16, 0x8a7e60).setDepth(28);
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

    // Printer: center y=210, 30% bigger — store ref for animation
    this.printerSprite = this.add.image(570, 210, 'bp_dead_printer').setOrigin(0.5, 0.5).setDepth(30).setScale(1.3);

    // Break area counter — surface at y=160, bottom at baseboard y=175
    this.add.rectangle(760, 167, 130, 16, 0x8a7e60).setDepth(28);
    this.add.rectangle(760, 174, 130, 3, 0x7a6e50).setDepth(29);
    // Counter legs
    const legG = this.add.graphics().setDepth(27);
    legG.fillStyle(0x6a5e40);
    legG.fillRect(698, 175, 3, 22); legG.fillRect(820, 175, 3, 22);
    // Coffee maker on counter surface
    this.add.image(730, 170, 'bp_coffee_maker').setOrigin(0.5, 1).setDepth(30);
    // Microwave
    this.add.image(765, 170, 'bp_microwave').setOrigin(0.5, 1).setDepth(30);
    // Mini fridge: floor-standing beside counter
    this.add.image(810, 194, 'bp_mini_fridge').setOrigin(0.5, 1).setDepth(30);
    // Dirty mugs on counter surface
    const mugG = this.add.graphics().setDepth(31);
    mugG.fillStyle(0xddddcc); mugG.fillRect(783, 153, 4, 6);
    mugG.fillRect(789, 154, 3, 5);
    mugG.fillStyle(0xbbaa99); mugG.fillRect(794, 153, 4, 6);

    // ── FOREGROUND FLOOR FURNITURE (PixelLab sprites) ──

    // Coffee table with magazines (between break area and cubicles)
    this.add.image(650, 260, 'bp_coffee_table').setOrigin(0.5, 1).setDepth(25);

    // Visitor chairs flanking the table
    this.add.image(620, 258, 'bp_visitor_chairs').setOrigin(0.5, 1).setDepth(24);

    // Water cooler (floor-standing, against wall near break area)
    this.add.image(840, 197, 'bp_water_cooler').setOrigin(0.5, 1).setDepth(20);

    // Trash can near cubicles
    this.add.image(520, 240, 'bp_trash_can').setOrigin(0.5, 1).setDepth(24);

    // Wet floor sign — permanent fixture since the 90s
    this.add.image(380, 290, 'bp_wet_floor_sign').setOrigin(0.5, 1).setDepth(24);

    // Potted floor plant near entrance
    this.add.image(85, 230, 'bp_floor_plant').setOrigin(0.5, 1).setDepth(24);

    // Priya's desk — 30% bigger
    this.add.rectangle(880, 197, 104, 21, 0x8a7e60).setDepth(28);
    this.add.rectangle(880, 205, 104, 5, 0x7a6e50).setDepth(29);
    this.add.rectangle(868, 185, 12, 10, 0x222222).setDepth(30);
    this.add.rectangle(884, 185, 12, 10, 0x222222).setDepth(30);
    const nc = [0xf0e868, 0x88ccff, 0xff88aa, 0x88ff88, 0xffaa44, 0xcc88ff];
    for (let i = 0; i < 6; i++) {
      this.add.rectangle(900 + (i % 3) * 5, 183 + Math.floor(i / 3) * 5, 4, 4, nc[i]).setDepth(30);
    }
    // Thriving plant
    const pl = this.add.graphics().setDepth(31);
    pl.fillStyle(0x44aa44); pl.fillCircle(918, 179, 6);
    pl.fillStyle(0x55cc55); pl.fillCircle(916, 175, 4);
    pl.fillStyle(0x664422); pl.fillRect(916, 184, 5, 6);

    // Whiteboard: base at y=182 (taller than Casey, on floor behind desk)
    this.add.image(935, 182, 'bp_whiteboard').setOrigin(0.5, 1).setDepth(10);

    // ── Lore objects (PixelLab sprites) ──
    this.add.image(190, 165, 'bp_filing_cabinet').setOrigin(0.5, 1).setDepth(12);
    this.add.image(580, 170, 'bp_fax_machine').setOrigin(0.5, 1).setDepth(30);
    this.add.image(460, 220, 'bp_ancient_desktop').setOrigin(0.5, 0.5).setDepth(29);
    this.add.image(770, 70, 'bp_breakroom_whiteboard').setOrigin(0.5, 0.5).setDepth(10);
    this.add.image(770, 236, 'bp_breakroom_table').setOrigin(0.5, 1).setDepth(25);
    this.add.image(600, 60, 'bp_office_calendar').setOrigin(0.5, 0.5).setDepth(10);
  }

  private drawNPCs(): void {
    // Characters at y=200, origin(0.5,1) — SAME as Lobby's Gladys at (325,200)
    // Using PixelLab character spritesheets with breathing-idle animations

    // Cubicle #1: typing woman — depth 20 (behind desk at depth 28)
    const typingWoman = this.add.sprite(250, 200, 'char_typing_woman', 0).setOrigin(0.5, 1).setDepth(20);
    if (!this.anims.exists('typing_woman_idle')) {
      this.anims.create({
        key: 'typing_woman_idle',
        frames: this.anims.generateFrameNumbers('char_typing_woman', { start: 1, end: 4 }),
        frameRate: 3, repeat: -1, yoyo: true,
      });
    }
    typingWoman.play('typing_woman_idle');

    // Kevin's desk — proper desk sprite in his cubicle
    this.add.image(330, 210, 'bp_casey_desk').setOrigin(0.5, 0.5).setDepth(28);
    // Cubicle #2: KEVIN — slightly smaller, barely moves
    const kevin = this.add.sprite(330, 200, 'char_kevin', 0).setOrigin(0.5, 1).setDepth(20).setScale(0.85);
    if (!this.anims.exists('kevin_idle')) {
      this.anims.create({
        key: 'kevin_idle',
        frames: this.anims.generateFrameNumbers('char_kevin', { start: 1, end: 4 }),
        frameRate: 2, repeat: -1, yoyo: true,
      });
    }
    kevin.play('kevin_idle');

    // Cubicle #3: man on phone
    const phoneGuy = this.add.sprite(410, 200, 'char_phone_guy', 0).setOrigin(0.5, 1).setDepth(20);
    if (!this.anims.exists('phone_guy_idle')) {
      this.anims.create({
        key: 'phone_guy_idle',
        frames: this.anims.generateFrameNumbers('char_phone_guy', { start: 1, end: 4 }),
        frameRate: 3, repeat: -1, yoyo: true,
      });
    }
    phoneGuy.play('phone_guy_idle');

    // Cubicle #4: VACANT

    // Priya at desk — custom 16-frame desk-research animation
    const priya = this.add.sprite(878, 200, 'char_priya', 0).setOrigin(0.5, 1).setDepth(20);
    if (!this.anims.exists('priya_research')) {
      this.anims.create({
        key: 'priya_research',
        frames: this.anims.generateFrameNumbers('char_priya', { start: 1, end: 16 }),
        frameRate: 4, repeat: -1,
      });
    }
    priya.play('priya_research');

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

    // ════ BREAK AREA SIGNS (counter surface at ~y=160) ════
    // Coffee maker sign on wall above
    this.add.text(730, 142, 'IF EMPTY\nMAKE MORE\n-DAVE', {
      fontFamily: 'monospace', fontSize: '2px', color: '#884422',
    }).setOrigin(0.5).setDepth(33);
    // Microwave sign on wall above
    this.add.text(765, 142, 'CLEAN YOUR\nOWN DISHES', {
      fontFamily: 'monospace', fontSize: '2px', color: '#cc0000',
    }).setOrigin(0.5).setDepth(33);
    // Mini fridge labels
    d.fillStyle(0xffffff); d.fillRect(805, 178, 10, 3);
    d.fillStyle(0xffffff); d.fillRect(805, 183, 10, 3);
    this.add.text(810, 179, "DAVE'S", { fontFamily: 'monospace', fontSize: '1px', color: '#333333' }).setOrigin(0.5).setDepth(33);
    this.add.text(810, 184, 'BIOHAZARD', { fontFamily: 'monospace', fontSize: '1px', color: '#cc0000' }).setOrigin(0.5).setDepth(33);
    // More dirty mugs on counter
    d.fillStyle(0xddccbb); d.fillRect(798, 154, 3, 5);
    d.fillStyle(0xccbbaa); d.fillRect(802, 155, 3, 4);
    // Sad brown banana on counter
    d.fillStyle(0x887744); d.fillRect(774, 154, 5, 2);
    d.fillStyle(0x776633); d.fillRect(775, 153, 3, 1);

    // ════ PRIYA'S DESK — organized chaos ════
    // "I BELIEVE IN UX" sticker on monitor bezel
    d.fillStyle(0x4488cc); d.fillRect(866, 193, 8, 2);
    // Book as monitor stand
    d.fillStyle(0x884422); d.fillRect(862, 193, 14, 3);
    // Color-coded sticky clusters (yellow=todo, pink=urgent, blue=ideas, green=done)
    // Already placed in drawFurniture, but add the "WHY???" on whiteboard
    this.add.text(938, 170, 'WHY???', {
      fontFamily: 'monospace', fontSize: '2px', color: '#cc0000',
    }).setOrigin(0.5).setDepth(12);
    // Red circle around a section on whiteboard
    const whiteG = this.add.graphics().setDepth(12);
    whiteG.lineStyle(1, 0xcc0000, 0.7);
    whiteG.strokeCircle(935, 168, 6);

    // ════ WALL DECOR (PixelLab sprites) ════
    // Employee of the Month frame (empty)
    this.add.image(340, 90, 'bp_employee_of_month').setOrigin(0.5, 0.5).setDepth(2);

    // SYNERGY motivational poster (absurdly awful)
    this.add.image(200, 90, 'bp_poster_synergy').setOrigin(0.5, 0.5).setDepth(2);

    // EXCELLENCE motivational poster (equally awful)
    this.add.image(580, 90, 'bp_poster_excellence').setOrigin(0.5, 0.5).setDepth(2);

    // Wall clock (government-issue) — above break area
    this.add.image(760, 40, 'bp_wall_clock').setOrigin(0.5, 0.5).setDepth(2);

    // Fire extinguisher (near supply closet)
    this.add.image(620, 120, 'bp_fire_extinguisher').setOrigin(0.5, 0.5).setDepth(2);

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

    // Step 1: Casey walks to desk
    const pos = this.player.getPosition();
    const path = this.navGrid.findPath(pos.x, pos.y, deskX - 20, deskY);
    this.player.walkPath(path, () => {
      // Step 2: Casey looks at the empty desk (brief pause of anticipation)
      (this.player as any).sprite.setFrame(CHAR_FRAMES.IDLE_E);
      this.time.delayedCall(800, () => {

        // Step 3: Place laptop on desk
        const laptopSprite = this.add.rectangle(145, 195, 16, 10, 0x333333).setDepth(23);
        const laptopScreen = this.add.rectangle(145, 194, 14, 8, 0x112233).setDepth(24);
        if (this.cache.audio.exists('sfx_laptop_open')) {
          this.sound.play('sfx_laptop_open', { volume: 0.3 });
        }

        // Step 4: Laptop screen boots up — glow from dark to bright + triumph fanfare
        this.time.delayedCall(600, () => {
          if (this.cache.audio.exists('sfx_triumph')) {
            this.sound.play('sfx_triumph', { volume: 0.4 });
          }
          this.tweens.add({
            targets: laptopScreen,
            fillColor: { from: 0x112233, to: 0x4488cc },
            duration: 800, ease: 'Power2',
            onUpdate: (tween) => {
              const v = tween.getValue() ?? 0;
              const r = Math.floor(0x11 + (0x44 - 0x11) * (v as number));
              const g = Math.floor(0x22 + (0x88 - 0x22) * (v as number));
              const b = Math.floor(0x33 + (0xcc - 0x33) * (v as number));
              laptopScreen.setFillStyle((r << 16) | (g << 8) | b);
            },
          });

          // Warm glow spills onto desk
          const screenGlow = this.add.circle(145, 198, 20, 0x4488cc, 0).setDepth(22);
          this.tweens.add({
            targets: screenGlow, alpha: 0.12, duration: 800, ease: 'Power2',
          });
        });

        // Step 5: Desk lamp flickers on
        this.time.delayedCall(1400, () => {
          const lampGlow = this.add.circle(160, 185, 12, 0xffee88, 0.3).setDepth(21);
          this.tweens.add({
            targets: lampGlow, alpha: { from: 0, to: 0.3 },
            duration: 200, yoyo: true, repeat: 2,
            onComplete: () => lampGlow.setAlpha(0.25),
          });

          // Step 6: Casey sits — faces south, takes a breath
          this.time.delayedCall(600, () => {
            (this.player as any).sprite.setFrame(CHAR_FRAMES.IDLE_S);

            // Step 7: Typing begins — Casey's idle-shift animation (hands moving)
            this.time.delayedCall(1000, () => {
              const sprite = (this.player as any).sprite as Phaser.GameObjects.Sprite;
              if (this.anims.exists('casey_idle_shift')) {
                sprite.play('casey_idle_shift');
              }

              // Step 8: Brief typing pause — the first keystrokes
              this.time.delayedCall(2500, () => {
                sprite.stop();
                sprite.setFrame(CHAR_FRAMES.IDLE_S);

                // Step 9: Kevin glances over (subtle environmental reaction)
                this.time.delayedCall(500, () => {

                  // Step 10: The printer, now fixed, whirs — prints something
                  if (this.printerSprite) {
                    this.tweens.add({
                      targets: this.printerSprite,
                      x: this.printerSprite.x - 1,
                      duration: 100, yoyo: true, repeat: 3,
                    });
                  }

                  // Step 11: Priya walks over
                  this.time.delayedCall(1500, () => {
                    this.walkPriyaToCasey(() => {
                      // Step 12: Priya arrives, brief pause
                      this.time.delayedCall(800, () => {
                        // Step 13: Extended dialogue
                        this.playCutsceneDialogue();
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  }

  private walkPriyaToCasey(onDone: () => void): void {
    // Create Priya walk sprite using PixelLab walk spritesheet
    if (!this.anims.exists('priya_walk_west')) {
      this.anims.create({
        key: 'priya_walk_west',
        frames: this.anims.generateFrameNumbers('char_priya_walk', { start: 0, end: 5 }),
        frameRate: 8, repeat: -1,
      });
    }

    const startX = 650, startY = 210;
    const targetX = 175, targetY = 210;

    const priyaSprite = this.add.sprite(startX, startY, 'char_priya_walk', 0)
      .setOrigin(0.5, 1).setDepth(490);
    priyaSprite.play('priya_walk_west');

    // Footstep sounds during walk
    const stepTimer = this.time.addEvent({
      delay: 250, loop: true,
      callback: () => {
        if (this.cache.audio.exists('footstep_casey')) {
          this.sound.play('footstep_casey', {
            volume: 0.12,
            rate: 1.05 + Math.random() * 0.1,
          });
        }
      },
    });

    this.tweens.add({
      targets: priyaSprite,
      x: targetX, y: targetY,
      duration: 3000,
      ease: 'Sine.inOut',
      onComplete: () => {
        stepTimer.destroy();
        // Switch to idle pose facing south
        priyaSprite.stop();
        priyaSprite.setTexture('char_priya', 0);
        if (this.anims.exists('priya_research')) {
          priyaSprite.play('priya_research');
        }
        onDone();
      },
    });
  }

  private playCutsceneDialogue(): void {
    const lines = [
      { speaker: 'priya', text: 'You actually got it running.', portrait: null, delay: 3000 },
      { speaker: 'casey', text: 'Was there any doubt?', portrait: null, delay: 2500 },
      { speaker: 'priya', text: '...Yes. Considerable doubt.', portrait: null, delay: 3000 },
      { speaker: 'casey', text: 'Fair.', portrait: null, delay: 2000 },
      { speaker: 'priya', text: 'The last engineer couldn\'t get past the wifi password. The one before that spent two weeks looking for the bathroom key.', portrait: null, delay: 5000 },
      { speaker: 'casey', text: 'I fixed a printer, picked a lock, and earned a laptop through sheer bureaucratic persistence. All before lunch.', portrait: null, delay: 5000 },
      { speaker: 'priya', text: 'You know what? That might be the most productive first day anyone has had at D.A.S.H. in twenty years.', portrait: null, delay: 5000 },
      { speaker: 'casey', text: 'The bar is underground. I just had to show up with a shovel.', portrait: null, delay: 4000 },
      { speaker: 'priya', text: 'Twelve thousand people are waiting, Casey. Forty-seven days average processing time. Real people with real problems.', portrait: null, delay: 5500 },
      { speaker: 'casey', text: 'Then let\'s fix it. Eighty-nine days left. What\'s first?', portrait: null, delay: 4000 },
      { speaker: 'priya', text: 'First? First you deploy to production.', portrait: null, delay: 4000 },
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
    const W = 640, H = 360;
    const FONT = '"Press Start 2P", monospace';
    const sep = '════════════════════════════════════';

    // Save completion
    const st = GameState.getInstance();
    st.setFlag('chapter_1_complete', true);
    st.save();

    // Stop any playing music, pick a random track for the ending screen
    this.sound.stopAll();
    const endTracks = ['bullpen_chill', 'soft_save_point', 'end_chapter_music'];
    const pick = endTracks[Math.floor(Math.random() * endTracks.length)];

    // Step 12: Camera slowly zooms out
    cam.zoomTo(0.85, 3000);

    // Step 14: Fade to black after zoom
    this.time.delayedCall(3500, () => {
      cam.fadeOut(2000, 0, 0, 0);

      cam.once('camerafadeoutcomplete', () => {
        // Start ending music
        if (this.cache.audio.exists(pick)) {
          const music = this.sound.add(pick, { loop: true, volume: 0 });
          music.play();
          this.tweens.add({ targets: music, volume: 0.35, duration: 2000 });
        }

        // ── Purple ending screen (matching title screen CRT aesthetic) ──
        const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a1a)
          .setDepth(2000).setScrollFactor(0);

        // Subtle purple gradient vignette
        const vigGfx = this.add.graphics().setDepth(2001).setScrollFactor(0);
        for (let i = 12; i >= 0; i--) {
          const alpha = (1 - i / 12) * 0.15;
          const inset = i * 8;
          vigGfx.fillStyle(0x220033, alpha);
          vigGfx.fillRect(inset, inset, W - inset * 2, H - inset * 2);
        }

        // Scanlines
        const scanGfx = this.add.graphics().setDepth(2002).setScrollFactor(0);
        scanGfx.fillStyle(0x000000, 0.08);
        for (let y = 0; y < H; y += 3) {
          scanGfx.fillRect(0, y, W, 1);
        }

        // ── Compute stats ──
        const flags = st.flags;
        const statsChecks = [
          { key: 'talked_to_mrs_g', label: 'Met Mrs. Gutierrez' },
          { key: 'examined_water_cooler', label: 'Examined Water Cooler' },
          { key: 'seen_cat_flyer', label: 'Found Lost Cat Flyer' },
          { key: 'flag_straightened', label: 'Straightened the Flag' },
          { key: 'examined_bulletin_board', label: 'Read Bulletin Board' },
          { key: 'printer_fixed', label: 'Fixed the Printer' },
          { key: 'whiteboard_insight', label: 'Decoded Priya\'s Whiteboard' },
          { key: 'examined_coat_rack', label: 'Examined Coat Rack' },
          { key: 'priya_ally', label: 'Earned Priya\'s Trust' },
          { key: 'has_laptop', label: 'Acquired a Laptop' },
        ];
        const achieved = statsChecks.filter(s => flags[s.key] === true);
        const priyaRel = st.getRelationship('priya');

        // All elements stored for cleanup
        const allElements: Phaser.GameObjects.GameObject[] = [bg, vigGfx, scanGfx];

        // ── Layout ──
        // Title
        const endText = this.add.text(W / 2, 35, 'End of Chapter 1: Onboarding', {
          fontFamily: FONT, fontSize: '10px', color: '#e0d0ff', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(2010).setScrollFactor(0).setAlpha(0);
        allElements.push(endText);

        const sepText = this.add.text(W / 2, 52, sep, {
          fontFamily: FONT, fontSize: '5px', color: '#6644aa',
        }).setOrigin(0.5).setDepth(2010).setScrollFactor(0).setAlpha(0);
        allElements.push(sepText);

        // Stats header
        const statsHeader = this.add.text(W / 2, 72, `MISSION REPORT  ${achieved.length}/${statsChecks.length}`, {
          fontFamily: FONT, fontSize: '7px', color: '#ccaaff',
        }).setOrigin(0.5).setDepth(2010).setScrollFactor(0).setAlpha(0);
        allElements.push(statsHeader);

        // Stats list (two columns)
        const colX1 = 80, colX2 = W / 2 + 40;
        const statsStartY = 92;
        const statTexts: Phaser.GameObjects.Text[] = [];
        statsChecks.forEach((s, i) => {
          const done = flags[s.key] === true;
          const col = i < 5 ? colX1 : colX2;
          const row = i < 5 ? i : i - 5;
          const icon = done ? '>' : ' ';
          const color = done ? '#88ff88' : '#554466';
          const label = done ? s.label : '???';
          const t = this.add.text(col, statsStartY + row * 16, `${icon} ${label}`, {
            fontFamily: FONT, fontSize: '6px', color,
          }).setDepth(2010).setScrollFactor(0).setAlpha(0);
          statTexts.push(t);
          allElements.push(t);
        });

        // Relationship
        const hearts = priyaRel >= 3 ? '>>>' : priyaRel >= 2 ? '>> ' : priyaRel >= 1 ? '>  ' : '   ';
        const relText = this.add.text(W / 2, statsStartY + 88, `PRIYA TRUST:  ${hearts}  (${priyaRel}/3)`, {
          fontFamily: FONT, fontSize: '6px', color: '#ff9966',
        }).setOrigin(0.5).setDepth(2010).setScrollFactor(0).setAlpha(0);
        allElements.push(relText);

        // Separator 2
        const sepText2 = this.add.text(W / 2, statsStartY + 108, sep, {
          fontFamily: FONT, fontSize: '5px', color: '#6644aa',
        }).setOrigin(0.5).setDepth(2010).setScrollFactor(0).setAlpha(0);
        allElements.push(sepText2);

        // "A Civic Tech Adventure"
        const cfaText = this.add.text(W / 2, statsStartY + 126, 'A Civic Tech Adventure', {
          fontFamily: FONT, fontSize: '7px', color: '#aa88dd',
        }).setOrigin(0.5).setDepth(2010).setScrollFactor(0).setAlpha(0);
        allElements.push(cfaText);

        // "Chapter 2: Discovery — Coming Soon"
        const comingSoon = this.add.text(W / 2, statsStartY + 150, 'Chapter 2: Discovery  —  Coming Soon', {
          fontFamily: FONT, fontSize: '7px', color: '#ccaaff',
        }).setOrigin(0.5).setDepth(2010).setScrollFactor(0).setAlpha(0);
        allElements.push(comingSoon);

        // Blinking cursor
        const cursor = this.add.rectangle(W / 2 + 130, statsStartY + 150, 6, 8, 0xccaaff)
          .setDepth(2010).setScrollFactor(0).setAlpha(0);
        allElements.push(cursor);

        // "Play Again" button
        const playAgainY = H - 30;
        const playAgainText = this.add.text(W / 2, playAgainY, '> PLAY AGAIN', {
          fontFamily: FONT, fontSize: '8px', color: '#8866bb',
        }).setOrigin(0.5).setDepth(2010).setScrollFactor(0).setAlpha(0);
        allElements.push(playAgainText);

        // ── Animate in sequence ──
        cam.fadeIn(500, 0, 0, 0);

        // Phase 1: Title
        this.tweens.add({
          targets: [endText, sepText], alpha: 1, duration: 1000,
        });

        // Phase 2: Stats roll in one by one
        this.time.delayedCall(1200, () => {
          this.tweens.add({ targets: statsHeader, alpha: 1, duration: 600 });
          statTexts.forEach((t, i) => {
            this.time.delayedCall(i * 200, () => {
              this.tweens.add({ targets: t, alpha: 1, duration: 300 });
              if (flags[statsChecks[i].key] === true) {
                if (this.cache.audio.exists('sfx_text_blip')) {
                  this.sound.play('sfx_text_blip', { volume: 0.08 });
                }
              }
            });
          });
        });

        // Phase 3: Relationship + lower section
        this.time.delayedCall(1200 + statsChecks.length * 200 + 500, () => {
          this.tweens.add({ targets: relText, alpha: 1, duration: 600 });
        });

        this.time.delayedCall(1200 + statsChecks.length * 200 + 1200, () => {
          this.tweens.add({ targets: [sepText2, cfaText], alpha: 1, duration: 800 });
        });

        // Phase 4: Coming soon + play again
        this.time.delayedCall(1200 + statsChecks.length * 200 + 2500, () => {
          this.tweens.add({ targets: [comingSoon], alpha: 1, duration: 1000 });
          this.tweens.add({
            targets: cursor, alpha: { from: 0.8, to: 0 },
            duration: 530, yoyo: true, repeat: -1, delay: 500,
          });

          // Show play again button
          this.time.delayedCall(1500, () => {
            this.tweens.add({ targets: playAgainText, alpha: 1, duration: 800 });

            // Enable input for play again
            this.input.enabled = true;

            // Hover effect
            this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
              const b = playAgainText.getBounds();
              if (pointer.x >= b.left - 8 && pointer.x <= b.right + 8
                && pointer.y >= b.top - 4 && pointer.y <= b.bottom + 4) {
                playAgainText.setColor('#ccaaff');
              } else {
                playAgainText.setColor('#8866bb');
              }
            });

            this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
              if (pointer.rightButtonDown()) return;
              const b = playAgainText.getBounds();
              if (pointer.x >= b.left - 8 && pointer.x <= b.right + 8
                && pointer.y >= b.top - 4 && pointer.y <= b.bottom + 4) {
                if (this.cache.audio.exists('sfx_select')) {
                  this.sound.play('sfx_select', { volume: 0.3 });
                }
                this.sound.stopAll();
                GameState.getInstance().reset();
                this.scene.start('TitleScene');
              }
            });
          });
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
    this.navGrid.addObstacle(695, 160, 130, 16);     // Break counter
    this.navGrid.addObstacle(600, 238, 100, 28);     // Coffee table + visitor chairs
    this.navGrid.addObstacle(800, 190, 20, 24);     // Mini fridge
    this.navGrid.addObstacle(830, 185, 20, 14);     // Water cooler
    this.navGrid.addObstacle(840, 187, 80, 24);     // Priya's desk
    this.navGrid.addObstacle(915, 168, 40, 36);     // Whiteboard area
    this.navGrid.addObstacle(512, 228, 16, 14);     // Trash can
    this.navGrid.addObstacle(77, 218, 16, 14);      // Floor plant
    this.navGrid.addObstacle(374, 280, 12, 12);     // Wet floor sign
  }

  // ── Ambient Life ──

  private setupAmbientLife(): void {
    const rOff = () => Math.random() * 3000;

    this.generateAmbientTextures();

    // 1. Background NPC animations are now handled in drawNPCs() via PixelLab spritesheets

    // 2. Coffee maker brew light blink
    if (this.anims.exists('bp_brew_blink')) this.anims.remove('bp_brew_blink');
    this.anims.create({
      key: 'bp_brew_blink',
      frames: [{ key: 'bp_brew_on' }, { key: 'bp_brew_off' }],
      frameRate: 1, repeat: -1,
    });
    const brewLight = this.add.sprite(730, 150, 'bp_brew_on').setOrigin(0.5, 0.5).setDepth(31);
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

    // 5-6. Priya & Kevin animations now handled in drawNPCs() via PixelLab spritesheets

    // 7. Printer paper jam LED blink (if not fixed)
    const printerLed = this.add.circle(578, 188, 2, 0xff4444).setDepth(31);
    const scheduleJamBlink = () => {
      this.time.delayedCall(800, () => {
        if (GameState.getInstance().hasFlag('printer_fixed')) {
          printerLed.setFillStyle(0x44ff44);
          return;
        }
        printerLed.setAlpha(printerLed.alpha > 0.5 ? 0.2 : 1);
        scheduleJamBlink();
      });
    };
    scheduleJamBlink();

    // 7b. Printer random paper spew (before it's fixed)
    const schedulePaperSpew = () => {
      const delay = Phaser.Math.Between(6000, 14000);
      this.time.delayedCall(delay, () => {
        if (this.cutsceneActive || GameState.getInstance().hasFlag('printer_fixed')) return;
        if (!this.printerSprite) return;

        const px = this.printerSprite.x;
        const py = this.printerSprite.y;

        // Printer shakes violently
        const origX = px;
        this.tweens.add({
          targets: this.printerSprite,
          x: origX + 2, duration: 40, yoyo: true, repeat: 8, ease: 'Sine.inOut',
          onComplete: () => { if (this.printerSprite) this.printerSprite.x = origX; },
        });

        // Shoot 1-3 pages
        const pageCount = Phaser.Math.Between(1, 3);
        for (let p = 0; p < pageCount; p++) {
          this.time.delayedCall(p * 120, () => {
            // Paper with printed lines
            const paper = this.add.graphics().setDepth(32);
            paper.fillStyle(0xffffff);
            paper.fillRect(-5, -4, 10, 8);
            paper.lineStyle(0.5, 0xcccccc);
            paper.strokeRect(-5, -4, 10, 8);
            // Printed text lines
            paper.fillStyle(0x333333, 0.4);
            paper.fillRect(-3, -2, 6, 1);
            paper.fillRect(-3, 0, 4, 1);
            paper.fillRect(-3, 2, 5, 1);
            paper.setPosition(px, py - 15);

            const dir = Phaser.Math.Between(-1, 1);
            // Shoot upward and outward
            this.tweens.add({
              targets: paper,
              y: py - 40 - Phaser.Math.Between(0, 15),
              x: px + dir * Phaser.Math.Between(8, 20),
              angle: Phaser.Math.Between(-60, 60),
              duration: 350,
              ease: 'Quad.easeOut',
              onComplete: () => {
                // Flutter down
                this.tweens.add({
                  targets: paper,
                  y: (paper as any).y + 35 + Phaser.Math.Between(0, 10),
                  x: (paper as any).x + Phaser.Math.Between(-5, 5),
                  angle: (paper as any).angle + Phaser.Math.Between(-30, 30),
                  alpha: 0,
                  duration: 700,
                  ease: 'Sine.easeIn',
                  onComplete: () => paper.destroy(),
                });
              },
            });

            // Toner dust puff
            for (let d = 0; d < 4; d++) {
              const dust = this.add.circle(
                px + Phaser.Math.Between(-8, 8),
                py - 12,
                Phaser.Math.Between(1, 2),
                0x666666, 0.5,
              ).setDepth(31);
              this.tweens.add({
                targets: dust,
                y: dust.y - Phaser.Math.Between(5, 15),
                x: dust.x + Phaser.Math.Between(-6, 6),
                alpha: 0,
                duration: Phaser.Math.Between(400, 800),
                ease: 'Quad.easeOut',
                onComplete: () => dust.destroy(),
              });
            }
          });
        }

        schedulePaperSpew();
      });
    };
    this.time.delayedCall(rOff() + 3000, schedulePaperSpew);

    // ── 8. LIVING ROOM TWEENS — subtle motions that make the space feel alive ──

    // NPC idle tweens now handled by PixelLab breathing-idle spritesheets

    // Priya's desk plant — gentle leaf sway
    const plantLeaf = this.add.circle(918, 178, 2, 0x55cc55).setDepth(32);
    this.tweens.add({
      targets: plantLeaf, y: 177, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      delay: rOff(),
    });

    // Cubicle 1 cactus — very subtle bob (it's alive!)
    const cactusY = 189;
    const cactusBob = this.add.circle(241, cactusY - 2, 1, 0x44aa44).setDepth(33);
    this.tweens.add({
      targets: cactusBob, y: cactusY - 3, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });

    // Mini fridge hum — subtle vibration
    const fridgeImg = this.children.list.find(
      (c: any) => c.texture?.key === 'bp_mini_fridge'
    ) as Phaser.GameObjects.Image | undefined;
    if (fridgeImg) {
      this.tweens.add({
        targets: fridgeImg, x: fridgeImg.x + 0.3, duration: 100, yoyo: true, repeat: -1,
      });
    }

    // Hallway shadow — someone walks past far right exit every 30-50s
    const hallShadow = this.add.rectangle(940, 120, 10, 40, 0x000000, 0).setDepth(3);
    const scheduleHallShadow = () => {
      this.time.delayedCall(Phaser.Math.Between(30000, 50000), () => {
        if (this.cutsceneActive) return;
        hallShadow.setAlpha(0);
        this.tweens.add({
          targets: hallShadow, alpha: 0.15, duration: 400,
          onComplete: () => {
            this.time.delayedCall(800, () => {
              this.tweens.add({
                targets: hallShadow, alpha: 0, duration: 400,
                onComplete: () => scheduleHallShadow(),
              });
            });
          },
        });
      });
    };
    this.time.delayedCall(rOff() + 10000, scheduleHallShadow);

    // Distant printer sound — random mechanical whir every 20-40s
    const schedulePrinterWhir = () => {
      this.time.delayedCall(Phaser.Math.Between(20000, 40000), () => {
        if (this.cutsceneActive) return;
        if (this.cache.audio.exists('sfx_text_blip')) {
          this.sound.play('sfx_text_blip', { volume: 0.03, rate: 0.5 });
        }
        schedulePrinterWhir();
      });
    };
    this.time.delayedCall(rOff() + 8000, schedulePrinterWhir);
  }

  // --- Bullpen Intro Cutscene ---

  private startBullpenIntro(): void {
    this.introActive = true;

    // Skip on click
    const skipHandler = () => {
      this.input.off('pointerdown', skipHandler);
      this.endBullpenIntro();
    };
    this.input.on('pointerdown', skipHandler);

    // Walk Casey further into the room so text bubbles aren't clipped
    const pos = this.player.getPosition();
    const entryPath = this.navGrid.findPath(pos.x, pos.y, 200, 200);
    this.player.walkPath(entryPath, () => {
    // Casey pauses, takes it all in
    this.time.delayedCall(800, () => {
      if (!this.introActive) return;
      this.showBullpenBubble(
        '"So this is the bullpen.\nWhere the magic happens.\nOr... doesn\'t."',
        () => {
          if (!this.introActive) return;
          this.time.delayedCall(400, () => {
            if (!this.introActive) return;
            this.showBullpenBubble(
              '"Ninety days to modernize all of this.\nNo pressure."',
              () => {
                if (!this.introActive) return;
                this.time.delayedCall(400, () => {
                  if (!this.introActive) return;
                  this.showBullpenBubble(
                    '"Step one: find an ally.\nStep two: find a desk.\nStep three: try not to break anything."',
                    () => {
                      if (!this.introActive) return;
                      this.time.delayedCall(400, () => {
                        if (!this.introActive) return;
                        this.showBullpenBubble(
                          '"Alright. Let\'s do this."',
                          () => {
                            if (!this.introActive) return;
                            this.endBullpenIntro();
                          },
                        );
                      });
                    },
                  );
                });
              },
            );
          });
        },
      );
    });
    }); // end walkPath callback
  }

  private showBullpenBubble(text: string, onDone: () => void): void {
    this.introBubble?.destroy();

    const pos = this.player.getPosition();
    this.introBubble = this.add.text(pos.x, pos.y - 60, text, {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#cccccc',
      fontStyle: 'italic',
      backgroundColor: '#1a1a2ecc',
      padding: { x: 8, y: 6 },
      wordWrap: { width: 220 },
    });
    this.introBubble.setOrigin(0.5, 1);
    this.introBubble.setDepth(950);
    this.introBubble.setAlpha(0);

    this.tweens.add({
      targets: this.introBubble,
      alpha: 1,
      duration: 300,
    });

    this.time.delayedCall(3000, () => {
      if (!this.introBubble) return;
      this.tweens.add({
        targets: this.introBubble,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.introBubble?.destroy();
          this.introBubble = null;
          onDone();
        },
      });
    });
  }

  private endBullpenIntro(): void {
    if (!this.introActive) return;
    this.introActive = false;

    this.introBubble?.destroy();
    this.introBubble = null;

    GameState.getInstance().setFlag('bullpen_intro_complete', true);
  }

  private generateAmbientTextures(): void {
    // Brew light frames
    for (const [suffix, color, alpha] of [['on', 0xff8800, 1], ['off', 0xff8800, 0.15]] as const) {
      const g = this.add.graphics();
      g.fillStyle(color as number, alpha as number);
      g.fillCircle(3, 3, 3);
      g.generateTexture(`bp_brew_${suffix}`, 7, 7);
      g.destroy();
    }
  }
}
