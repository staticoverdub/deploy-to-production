import Phaser from 'phaser';
import { Player, CHAR_FRAMES, GLADYS_FRAMES } from '../engine/Player';
import { HotspotManager, SceneHotspotFile, HotspotInteraction } from '../engine/HotspotManager';
import { DialogueManager, DialogueTree } from '../engine/DialogueManager';
import { InventoryUI } from '../engine/InventoryUI';
import { GameState } from '../engine/GameState';
import { CursorManager, CursorState } from '../engine/CursorManager';
import { NavGrid } from '../engine/NavGrid';
import { DebugMenu } from '../engine/DebugMenu';
import lobbyHotspotsRaw from '../data/hotspots/lobby.json';
import gladysData from '../data/dialogues/gladys.json';
import mrsGutierrezData from '../data/dialogues/mrs_gutierrez.json';
import vossData from '../data/dialogues/voss.json';

// Asset imports (Vite resolves these to URLs)
import lobbyBgUrl from '../assets/backgrounds/lobby_bg.png';
import caseyUrl from '../assets/sprites/characters/casey_sheet.png';
import gladysCharUrl from '../assets/sprites/characters/gladys_sheet.png';
import mrsgCharUrl from '../assets/sprites/characters/mrsg_sheet.png';
import mrsgSeatedUrl from '../assets/sprites/characters/mrsg_seated.png';
import vossCharUrl from '../assets/sprites/characters/voss_sheet.png';
import nowServingUrl from '../assets/tilesets/custom/now_serving_display.png';
import posterUrl from '../assets/tilesets/custom/motivational_poster.png';
import bulletinUrl from '../assets/tilesets/custom/bulletin_board.png';
import ficusUrl from '../assets/tilesets/custom/sad_ficus.png';
import turnstileUrl from '../assets/tilesets/custom/security_turnstile.png';
import coolerUrl from '../assets/tilesets/custom/water_cooler.png';
import chairsUrl from '../assets/tilesets/custom/waiting_chairs.png';
import flagUrl from '../assets/tilesets/custom/american_flag.png';
import securityDeskUrl from '../assets/tilesets/custom/security_desk.png';
// Lore object sprites
import suggestionBoxUrl from '../assets/tilesets/custom/suggestion_box.png';
import lobbyWallClockUrl from '../assets/tilesets/custom/lobby_wall_clock.png';
import floorPlaqueUrl from '../assets/tilesets/custom/floor_plaque.png';
import pamphletRackUrl from '../assets/tilesets/custom/pamphlet_rack.png';
// Dialogue portraits
import caseyPortraitUrl from '../assets/sprites/portraits/casey_default.png';
import gladysPortraitUrl from '../assets/sprites/portraits/gladys_default.png';
import mrsgPortraitUrl from '../assets/sprites/portraits/mrs_g_default.png';
import vossPortraitUrl from '../assets/sprites/portraits/voss_default.png';
// Footstep sounds
import footstepCaseyUrl from '../assets/audio/sfx/footsteps/footstep_casey.mp3';
import footstepVossUrl from '../assets/audio/sfx/footsteps/footstep_voss.mp3';
import footstepMrsGUrl from '../assets/audio/sfx/footsteps/footstep_mrs_g.mp3';
// Inventory item icons
import iconFlyerUrl from '../assets/sprites/items/icon_lost_cat_flyer.png';
import iconCupEmptyUrl from '../assets/sprites/items/icon_paper_cup.png';
import iconCupWaterUrl from '../assets/sprites/items/icon_cup_of_water.png';
import iconBadgeUrl from '../assets/sprites/items/icon_temporary_badge.png';
import iconLobbyCoffeeUrl from '../assets/sprites/items/icon_lobby_coffee.png';
// Audio
import lobbyMusicUrl from '../assets/audio/lobby_music.mp3';
// SFX
import sfxUiClickUrl from '../assets/audio/sfx/sfx_ui_click.mp3';
import sfxBadgeFailUrl from '../assets/audio/sfx/sfx_badge_fail.mp3';
import sfxBadgeSuccessUrl from '../assets/audio/sfx/sfx_badge_success.mp3';
import sfxTurnstileUrl from '../assets/audio/sfx/sfx_turnstile.mp3';
import sfxDoorOpenUrl from '../assets/audio/sfx/sfx_door_open.mp3';
import sfxWaterBubbleUrl from '../assets/audio/sfx/sfx_water_bubble.mp3';
import sfxFluorescentHumUrl from '../assets/audio/sfx/sfx_fluorescent_hum.mp3';
import sfxBadgePrintUrl from '../assets/audio/sfx/sfx_badge_print.mp3';
import sfxTextBlipUrl from '../assets/audio/sfx/sfx_text_blip.mp3';
import sfxSelectUrl from '../assets/audio/sfx/sfx_select.mp3';
import lobbyCoffeeUrl from '../assets/sprites/mailcart/coffee_cup.png';
// Voice babble
import voiceCaseyUrl from '../assets/audio/sfx/voices/voice_casey.mp3';
import voiceGladysUrl from '../assets/audio/sfx/voices/voice_gladys.mp3';
import voiceMrsGUrl from '../assets/audio/sfx/voices/voice_mrs_g.mp3';
import voiceVossUrl from '../assets/audio/sfx/voices/voice_voss.mp3';
import voiceKevinUrl from '../assets/audio/sfx/voices/voice_kevin.mp3';

const lobbyHotspots = lobbyHotspotsRaw as unknown as SceneHotspotFile;

// Walkable floor area (the tiled floor, not the walls above)
const WALK_MIN_X = 10;
const WALK_MAX_X = 630;
const WALK_MIN_Y = 190;
const WALK_MAX_Y = 320;
const CASEY_SPAWN_X = 100;
const CASEY_SPAWN_Y = 270;

export class LobbyScene extends Phaser.Scene {
  private player!: Player;
  private hotspotManager!: HotspotManager;
  private dialogueManager!: DialogueManager;
  private inventoryUI!: InventoryUI;

  // NPC conversation lists (for selectConversation)
  private gladysConversations: DialogueTree[] = [];
  private mrsGConversations: DialogueTree[] = [];
  private vossConversations: DialogueTree[] = [];

  // Voss spawn state
  private vossSpawned = false;
  private vossSprite: Phaser.GameObjects.Container | null = null;

  // Cursor
  private cursorManager: CursorManager | null = null;
  private hotspotHovered = false;

  // Navigation
  private navGrid!: NavGrid;
  private debugMenu: DebugMenu | null = null;

  // Hint system
  private hintTimer: number = 0;
  private lastFlagCount: number = 0;
  private hintsShown: Set<string> = new Set();

  // Intro cutscene
  private introActive = false;
  private introBubble: Phaser.GameObjects.Text | null = null;

  // Ambient life references
  private turnstileLed: Phaser.GameObjects.Arc | null = null;
  private nowServingText: Phaser.GameObjects.Text | null = null;
  private flagSprite: Phaser.GameObjects.Image | null = null;
  private lobbyCoffeeSprite: Phaser.GameObjects.Image | null = null;

  // Load support
  private shouldLoadSave = false;

  constructor() {
    super({ key: 'LobbyScene' });
  }

  init(data?: { loadSave?: boolean }): void {
    this.shouldLoadSave = data?.loadSave ?? false;
  }

  preload(): void {
    // Background
    this.load.image('lobby_bg', lobbyBgUrl);

    // Character spritesheets (64x64 frames, LucasArts side-view style)
    const ssConfig = { frameWidth: 64, frameHeight: 64 };
    this.load.spritesheet('char_casey', caseyUrl, ssConfig);
    this.load.spritesheet('char_gladys', gladysCharUrl, ssConfig);
    this.load.spritesheet('char_mrsg', mrsgCharUrl, ssConfig);
    this.load.image('mrsg_seated', mrsgSeatedUrl);
    this.load.spritesheet('char_voss', vossCharUrl, ssConfig);

    // Custom objects (PixelLab-generated)
    this.load.image('obj_now_serving', nowServingUrl);
    this.load.image('obj_poster', posterUrl);
    this.load.image('obj_bulletin', bulletinUrl);
    this.load.image('obj_ficus', ficusUrl);
    this.load.image('obj_turnstile', turnstileUrl);
    this.load.image('obj_cooler', coolerUrl);
    this.load.image('obj_chairs', chairsUrl);
    this.load.image('obj_flag', flagUrl);
    this.load.image('obj_security_desk', securityDeskUrl);
    this.load.image('obj_lobby_coffee', lobbyCoffeeUrl);
    // Lore objects
    this.load.image('obj_suggestion_box', suggestionBoxUrl);
    this.load.image('obj_lobby_clock', lobbyWallClockUrl);
    this.load.image('obj_floor_plaque', floorPlaqueUrl);
    this.load.image('obj_pamphlet_rack', pamphletRackUrl);

    // Audio
    this.load.audio('lobby_music', lobbyMusicUrl);
    // SFX
    this.load.audio('sfx_ui_click', sfxUiClickUrl);
    this.load.audio('sfx_badge_fail', sfxBadgeFailUrl);
    this.load.audio('sfx_badge_success', sfxBadgeSuccessUrl);
    this.load.audio('sfx_turnstile', sfxTurnstileUrl);
    this.load.audio('sfx_door_open', sfxDoorOpenUrl);
    this.load.audio('sfx_water_bubble', sfxWaterBubbleUrl);
    this.load.audio('sfx_fluorescent_hum', sfxFluorescentHumUrl);
    this.load.audio('sfx_badge_print', sfxBadgePrintUrl);
    this.load.audio('sfx_text_blip', sfxTextBlipUrl);
    this.load.audio('sfx_select', sfxSelectUrl);
    // Voice babble
    this.load.audio('voice_casey', voiceCaseyUrl);
    this.load.audio('voice_gladys', voiceGladysUrl);
    this.load.audio('voice_mrs_g', voiceMrsGUrl);
    this.load.audio('voice_voss', voiceVossUrl);
    this.load.audio('voice_kevin', voiceKevinUrl);

    // Dialogue portraits (96x96, LucasArts style)
    this.load.image('portrait_casey', caseyPortraitUrl);
    this.load.image('portrait_gladys', gladysPortraitUrl);
    this.load.image('portrait_mrs_gutierrez', mrsgPortraitUrl);
    this.load.image('portrait_voss', vossPortraitUrl);
    // Footstep sounds
    this.load.audio('footstep_casey', footstepCaseyUrl);
    this.load.audio('footstep_voss', footstepVossUrl);
    this.load.audio('footstep_mrs_g', footstepMrsGUrl);
    // Inventory item icons (keys match items.json "icon" field)
    this.load.image('icon_flyer', iconFlyerUrl);
    this.load.image('icon_cup_empty', iconCupEmptyUrl);
    this.load.image('icon_cup_water', iconCupWaterUrl);
    this.load.image('icon_badge', iconBadgeUrl);
    this.load.image('icon_lobby_coffee', iconLobbyCoffeeUrl);
  }

  create(): void {
    this.sound.stopAll();
    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    const state = GameState.getInstance();
    if (this.shouldLoadSave) {
      state.load();
    } else {
      state.reset();
    }
    state.enableAutoSave();

    this.drawBackground();
    this.drawFurniture();
    this.drawNPCs();
    this.setupNavGrid();
    this.setupAmbientLife();

    // --- Engine systems ---
    this.player = new Player(this, CASEY_SPAWN_X, CASEY_SPAWN_Y, 'char_casey');

    this.hotspotManager = new HotspotManager(this);
    this.hotspotManager.loadFromSceneFile(lobbyHotspots);

    // Add NPC hotspots (not in the JSON)
    this.hotspotManager.addHotspot({
      id: 'npc_gladys',
      name: 'Gladys',
      position: { x: 325, y: 265 },
      polygon: [293, 136, 357, 136, 357, 200, 293, 200],
      verbs: ['talkto', 'look'],
      interactions: {
        look: {
          text: "The security guard. Late 50s, reading glasses on a chain, doing a crossword puzzle. Unflappable.",
        },
        talkto: { text: '' },
      },
    });

    this.hotspotManager.addHotspot({
      id: 'npc_mrs_gutierrez',
      name: 'Mrs. Gutierrez',
      position: { x: 135, y: 265 },
      polygon: [111, 139, 159, 139, 159, 203, 111, 203],
      verbs: ['talkto', 'look'],
      interactions: {
        look: {
          text: "A woman sitting patiently with a thick manila folder of documents on her lap. She's been here a while.",
        },
        talkto: { text: '' },
      },
    });

    this.dialogueManager = new DialogueManager(this);

    // Load all NPC dialogue trees
    this.dialogueManager.loadNPCFile(gladysData);
    this.dialogueManager.loadNPCFile(mrsGutierrezData);
    this.dialogueManager.loadNPCFile(vossData);

    // Build conversation lists for selectConversation
    this.gladysConversations = Object.values(gladysData) as unknown as DialogueTree[];
    this.mrsGConversations = Object.values(mrsGutierrezData) as unknown as DialogueTree[];
    this.vossConversations = Object.values(vossData) as unknown as DialogueTree[];

    this.inventoryUI = new InventoryUI(this);
    this.inventoryUI.refresh();

    // --- Custom cursor ---
    this.cursorManager = new CursorManager(this);
    this.debugMenu = new DebugMenu(this);

    const verbToCursor: Record<string, CursorState> = {
      talkto: 'talk', look: 'look', use: 'use', pickup: 'pickup',
    };
    this.hotspotManager.onCursorChange = (verb) => {
      if (verb) {
        this.hotspotHovered = true;
        this.cursorManager?.setState(verbToCursor[verb] ?? 'default');
      } else {
        this.hotspotHovered = false;
      }
    };

    // --- Wire systems ---
    this.hotspotManager.onWalkTo = (x, y, cb) => {
      const clamped = this.clampToWalkArea(x, y);
      const pos = this.player.getPosition();
      const path = this.navGrid.findPath(pos.x, pos.y, clamped.x, clamped.y);
      this.player.walkPath(path, cb);
    };
    this.hotspotManager.getSelectedItem = () => this.inventoryUI.getSelectedItem();

    this.hotspotManager.onInteraction = (hotspotId, _verb, response) => {
      const st = GameState.getInstance();
      st.setFlag(`examined_${hotspotId}`, true);
      this.inventoryUI.clearSelection();

      // NPC talkto — start conversation
      if (hotspotId === 'npc_gladys' && _verb === 'talkto') {
        this.startNPCConversation(this.gladysConversations);
        return;
      }
      if (hotspotId === 'npc_mrs_gutierrez' && _verb === 'talkto') {
        this.startNPCConversation(this.mrsGConversations);
        return;
      }
      if (hotspotId === 'npc_voss' && _verb === 'talkto') {
        this.startNPCConversation(this.vossConversations);
        return;
      }

      // Flag straighten gag — straightens then slowly tilts back
      if (hotspotId === 'american_flag' && _verb === 'use' && this.flagSprite) {
        this.tweens.add({
          targets: this.flagSprite, angle: 0, duration: 400, ease: 'Sine.out',
          onComplete: () => {
            // Slowly tilt back over 30 seconds
            this.time.delayedCall(5000, () => {
              if (this.flagSprite) {
                this.tweens.add({
                  targets: this.flagSprite, angle: 3, duration: 25000, ease: 'Sine.inOut',
                });
              }
            });
          },
        });
      }

      // Remove coffee cup sprite when picked up
      if (hotspotId === 'lobby_coffee_cup' && _verb === 'pickup' && this.lobbyCoffeeSprite) {
        this.lobbyCoffeeSprite.destroy();
        this.lobbyCoffeeSprite = null;
      }

      // Regular hotspot interaction
      if (response.text) {
        this.showMonologue(response.text, response.speaker, response.portrait);
      } else if (this.hotspotManager.getPendingTransition()) {
        this.hotspotManager.clearPendingTransition();
        this.performWipeTransition();
        return;
      }

      this.inventoryUI.refresh();
      this.resetHintTimer();
      this.checkVossSpawn();
    };

    this.dialogueManager.onDialogueEnd = (treeId) => {
      this.inventoryUI.refresh();
      this.resetHintTimer();
      this.checkVossSpawn();

      if (treeId === 'voss_arrival' && GameState.getInstance().hasFlag('voss_convinced')) {
        this.vossExits();
      }

      const pending = this.hotspotManager.getPendingTransition();
      if (pending) {
        this.hotspotManager.clearPendingTransition();
        // Badge used — turn LED green before wipe
        if (this.turnstileLed) {
          this.tweens.killTweensOf(this.turnstileLed);
          this.turnstileLed.setFillStyle(0x33cc33);
          this.turnstileLed.setAlpha(1);
        }
        this.time.delayedCall(400, () => this.performWipeTransition());
      }
    };

    this.dialogueManager.onItemGiven = (itemId) => {
      this.inventoryUI.refresh();
      if (itemId === 'temporary_badge' && this.cache.audio.exists('sfx_badge_print')) {
        this.sound.play('sfx_badge_print', { volume: 0.3 });
      }
    };

    this.inventoryUI.onExamineItem = (text) => {
      this.showMonologue(text);
    };

    // Click to walk
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) return;
      if (this.dialogueManager.isActive) return;
      if (this.introActive) return;

      const cam = this.cameras.main;
      if (pointer.y > cam.height - 38) return;

      const hitObjects = this.input.hitTestPointer(pointer);
      const hitHotspot = hitObjects.some((obj) => obj.getData('hotspotId') !== undefined);
      if (hitHotspot) return;

      const clamped = this.clampToWalkArea(pointer.x, pointer.y);
      const pos = this.player.getPosition();
      const path = this.navGrid.findPath(pos.x, pos.y, clamped.x, clamped.y);
      this.player.walkPath(path);
    });

    // Pause menu
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.dialogueManager.isActive) return;
      this.scene.pause();
      this.scene.launch('PauseMenuScene', { parentScene: 'LobbyScene' });
    });

    // Debug overlay toggle (D key) — shows hotspot zones + nav grid
    this.input.keyboard?.on('keydown-D', () => {
      this.hotspotManager.toggleDebug();
      // Also toggle nav grid debug
      if ((this as any)._navDebug) {
        (this as any)._navDebug.destroy();
        (this as any)._navDebug = null;
      } else {
        const g = this.add.graphics().setDepth(5000);
        this.navGrid.drawDebug(g);
        (this as any)._navDebug = g;
      }
    });

    // Restore visual state if loading a save
    if (this.shouldLoadSave) {
      this.restoreVisualState();
      this.inventoryUI.refresh();
    }

    // Initialize hint timer
    this.lastFlagCount = Object.keys(GameState.getInstance().flags).length;

    // Intro cutscene — first visit only
    const st = GameState.getInstance();
    if (!this.shouldLoadSave && !st.hasFlag('intro_complete')) {
      this.startIntroCutscene();
    }
  }

  // --- Walk area clamping ---

  private clampToWalkArea(x: number, y: number): { x: number; y: number } {
    return {
      x: Phaser.Math.Clamp(x, WALK_MIN_X, WALK_MAX_X),
      y: Phaser.Math.Clamp(y, WALK_MIN_Y, WALK_MAX_Y),
    };
  }

  // --- NPC Conversations ---

  private startNPCConversation(conversations: DialogueTree[]): void {
    if (this.dialogueManager.isActive) return;
    const tree = this.dialogueManager.selectConversation(conversations);
    if (tree) {
      this.dialogueManager.startDialogue(tree.id);
    } else {
      this.showMonologue("They don't seem to want to talk right now.");
    }
  }

  // --- Voss Spawn ---

  private checkVossSpawn(): void {
    if (this.vossSpawned) return;

    const st = GameState.getInstance();
    if (!st.hasFlag('wait_for_voss')) return;

    const examined = this.hotspotManager.getExaminedCount();
    if (examined < 3) return;

    this.spawnVoss();
  }

  private spawnVoss(immediate = false): void {
    this.vossSpawned = true;
    const st = GameState.getInstance();

    const startX = immediate ? 250 : -30;
    this.vossSprite = this.add.container(startX, 200);
    this.vossSprite.setDepth(490);

    // Voss character sprite (64x64 LucasArts style)
    const vossChar = this.add.sprite(0, 0, 'char_voss', CHAR_FRAMES.IDLE_S);
    vossChar.setOrigin(0.5, 1);
    this.vossSprite.add(vossChar);

    // Create Voss walk animations (uses VOSS_FRAMES which has north walk)
    if (!this.anims.exists('char_voss_walk_e')) {
      this.anims.create({
        key: 'char_voss_walk_s',
        frames: this.anims.generateFrameNumbers('char_voss', {
          start: CHAR_FRAMES.WALK_S.start, end: CHAR_FRAMES.WALK_S.end,
        }),
        frameRate: 10, repeat: -1,
      });
      this.anims.create({
        key: 'char_voss_walk_e',
        frames: this.anims.generateFrameNumbers('char_voss', {
          start: CHAR_FRAMES.WALK_E.start, end: CHAR_FRAMES.WALK_E.end,
        }),
        frameRate: 10, repeat: -1,
      });
    }

    const finishSpawn = () => {
      st.setFlag('voss_present', true);
      vossChar.stop();
      vossChar.setFlipX(false);
      vossChar.setFrame(CHAR_FRAMES.IDLE_S);

      this.hotspotManager.addHotspot({
        id: 'npc_voss',
        name: 'Director Voss',
        position: { x: 240, y: 265 },
        polygon: [235, 170, 265, 170, 265, 210, 235, 210],
        verbs: ['talkto', 'look'],
        interactions: {
          look: {
            text: "Mid-50s, sharp business attire, sensible shoes. Radiates competence. She looks like she's in a hurry.",
          },
          talkto: { text: '' },
        },
      });
      this.resetHintTimer();
    };

    if (immediate) {
      finishSpawn();
    } else {
      // Voss's heels announce her arrival before she's visible
      vossChar.play('char_voss_walk_e');

      // Rhythmic heel clicks during walk (every 200ms = 10fps / 2)
      const heelTimer = this.time.addEvent({
        delay: 200,
        loop: true,
        callback: () => {
          if (this.cache.audio.exists('footstep_voss')) {
            const pitch = 0.95 + Math.random() * 0.1;
            this.sound.play('footstep_voss', { volume: 0.25, rate: pitch });
          }
        },
      });

      this.tweens.add({
        targets: this.vossSprite,
        x: 250,
        y: 200,
        duration: 2000,
        ease: 'Power1',
        onComplete: () => {
          heelTimer.destroy();
          finishSpawn();
        },
      });
    }
  }

  private restoreVisualState(): void {
    const st = GameState.getInstance();
    if (st.hasFlag('voss_convinced')) {
      this.vossSpawned = true;
    } else if (st.hasFlag('voss_present')) {
      this.spawnVoss(true);
    }
  }

  // --- Voss Exit ---

  private vossExits(): void {
    if (this.vossSprite) {
      const vossChar = this.vossSprite.getAt(0) as Phaser.GameObjects.Sprite;
      if (vossChar?.play) {
        vossChar.setFlipX(false);
        vossChar.play('char_voss_walk_e');
      }

      // Heel clicks during exit
      const exitHeelTimer = this.time.addEvent({
        delay: 200, loop: true,
        callback: () => {
          if (this.cache.audio.exists('footstep_voss')) {
            this.sound.play('footstep_voss', { volume: 0.2, rate: 0.95 + Math.random() * 0.1 });
          }
        },
      });

      this.tweens.add({
        targets: this.vossSprite,
        x: 640,
        duration: 1500,
        ease: 'Power1',
        onComplete: () => {
          exitHeelTimer.destroy();
          this.vossSprite?.destroy();
          this.vossSprite = null;
          this.hotspotManager.removeHotspot('npc_voss');
        },
      });
    }
  }

  // --- Scene Transition (horizontal wipe) ---

  private performWipeTransition(): void {
    this.input.enabled = false;
    if (this.cache.audio.exists('sfx_turnstile')) {
      this.sound.play('sfx_turnstile', { volume: 0.35 });
    }

    const { width, height } = this.cameras.main;
    const wipe = this.add.rectangle(0, 0, width, height, 0x000000)
      .setOrigin(0, 0)
      .setDepth(2000)
      .setScrollFactor(0);
    wipe.x = -width;

    this.tweens.add({
      targets: wipe,
      x: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
        GameState.getInstance().save();
        this.scene.start('MailCartScene');
      },
    });
  }

  // --- Monologue (hotspot responses shown as Casey speaking) ---

  private showMonologue(text: string, speaker?: string, portrait?: string): void {
    if (this.dialogueManager.isActive) return;
    const treeId = `_mono_${Date.now()}`;
    this.dialogueManager.loadTree({
      id: treeId,
      startNode: 'line',
      nodes: {
        line: {
          id: 'line',
          speaker: speaker ?? 'casey',
          portrait: portrait ?? null,
          text,
          animation: null,
          flagsSet: {},
          relationshipChanges: {},
          options: [],
          autoAdvance: null,
        },
      },
    });
    this.dialogueManager.startDialogue(treeId);
  }

  // --- Hint System ---

  private resetHintTimer(): void {
    this.hintTimer = 0;
    this.lastFlagCount = Object.keys(GameState.getInstance().flags).length;
  }

  private getHintState(): string {
    const st = GameState.getInstance();
    if (st.hasFlag('has_temp_badge')) return 'BADGE_GET';
    if (st.hasFlag('voss_present')) return 'VOSS_ARRIVES';
    if (st.hasFlag('wait_for_voss')) return 'VOSS_HINT';
    if (st.hasFlag('badge_quest_active')) return 'CATCH_22';
    return 'INIT';
  }

  private tryShowHint(): void {
    if (this.dialogueManager.isActive) return;

    const hintState = this.getHintState();
    if (this.hintsShown.has(hintState)) return;

    const hintText = this.hotspotManager.hintMessages[hintState];
    if (!hintText) return;

    this.hintsShown.add(hintState);
    this.showThoughtBubble(hintText);
  }

  // --- Intro Cutscene ---

  private startIntroCutscene(): void {
    this.introActive = true;

    // Move Casey off-screen left
    this.player.walkTo(-30, CASEY_SPAWN_Y);
    // Force position immediately (walkTo is async, just set directly)
    (this.player as any).container.setPosition(-30, CASEY_SPAWN_Y);
    (this.player as any).isWalking = false;

    // Fade in from black
    this.cameras.main.fadeIn(1000, 0, 0, 0);

    // Skip on click — any click during intro jumps to end
    const skipHandler = () => {
      this.input.off('pointerdown', skipHandler);
      this.endIntroCutscene();
    };
    this.input.on('pointerdown', skipHandler);

    // Step 1: Hold 1 second, then doors open
    this.time.delayedCall(1500, () => {
      if (!this.introActive) return;

      // Step 2: Door sound, Casey walks in
      if (this.cache.audio.exists('sfx_door_open')) {
        this.sound.play('sfx_door_open', { volume: 0.3 });
      }

      this.player.walkTo(CASEY_SPAWN_X, CASEY_SPAWN_Y, () => {
        if (!this.introActive) return;

        // Step 3: Casey looks around, first thought
        this.time.delayedCall(800, () => {
          if (!this.introActive) return;
          this.showIntroBubble(
            '"Okay. New job. New agency.\nHow hard can it be to modernize\na government office in 90 days?"',
            () => {
              if (!this.introActive) return;

              // Step 4: Look at Now Serving
              this.time.delayedCall(500, () => {
                if (!this.introActive) return;
                this.showIntroBubble(
                  '"...847. They\'re serving\nnumber 847."',
                  () => {
                    if (!this.introActive) return;

                    // Step 5: Look at poster
                    this.time.delayedCall(500, () => {
                      if (!this.introActive) return;
                      this.showIntroBubble(
                        '"TEAMWORK: Together Everyone\nAchieves More Paperwork."',
                        () => {
                          if (!this.introActive) return;

                          // Step 6: Final thought
                          this.time.delayedCall(500, () => {
                            if (!this.introActive) return;
                            this.showIntroBubble(
                              '"I should have negotiated\na longer fellowship."',
                              () => {
                                if (!this.introActive) return;
                                this.endIntroCutscene();
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
      });
    });
  }

  private showIntroBubble(text: string, onDone: () => void): void {
    // Remove previous bubble
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

    // Fade in
    this.tweens.add({
      targets: this.introBubble,
      alpha: 1,
      duration: 300,
    });

    // Auto-advance after 3 seconds
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

  private endIntroCutscene(): void {
    if (!this.introActive) return;
    this.introActive = false;

    // Clean up any lingering bubble
    this.introBubble?.destroy();
    this.introBubble = null;

    // Ensure Casey is at spawn position
    (this.player as any).container.setPosition(CASEY_SPAWN_X, CASEY_SPAWN_Y);
    (this.player as any).isWalking = false;
    (this.player as any).sprite.setFrame(CHAR_FRAMES.IDLE_S);

    // Mark intro complete so it never plays again
    GameState.getInstance().setFlag('intro_complete', true);

    // Tutorial text
    const tutorial = this.add.text(320, 30, 'Left-click to walk. Right-click to interact.', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#aaaacc',
      backgroundColor: '#0a0a1acc',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(900).setAlpha(0);

    this.tweens.add({
      targets: tutorial,
      alpha: 1,
      duration: 500,
      onComplete: () => {
        this.time.delayedCall(4000, () => {
          this.tweens.add({
            targets: tutorial,
            alpha: 0,
            duration: 800,
            onComplete: () => tutorial.destroy(),
          });
        });
      },
    });
  }

  private showThoughtBubble(text: string): void {
    const pos = this.player.getPosition();
    const bubble = this.add.text(pos.x, pos.y - 60, text, {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#cccccc',
      fontStyle: 'italic',
      backgroundColor: '#1a1a2ecc',
      padding: { x: 6, y: 4 },
      wordWrap: { width: 200 },
    });
    bubble.setOrigin(0.5, 1);
    bubble.setDepth(950);

    this.tweens.add({
      targets: bubble,
      alpha: { from: 1, to: 0 },
      delay: 4000,
      duration: 1000,
      onComplete: () => bubble.destroy(),
    });
  }

  // --- Background & Environment ---

  private drawBackground(): void {
    // Composited background from LimeZu tiles
    this.add.image(320, 180, 'lobby_bg').setDepth(0);

    // American flag — wall-mounted, left of hallway entrance (starts slightly crooked)
    this.flagSprite = this.add.image(510, 90, 'obj_flag').setOrigin(0.5, 0.5).setDepth(5);
    this.flagSprite.setAngle(3);
  }

  private drawFurniture(): void {
    // Custom PixelLab objects at hotspot positions
    // Sad Ficus Plant — at potted_plant hotspot area
    this.add.image(75, 168, 'obj_ficus').setOrigin(0.5, 1).setDepth(20);

    // Water Cooler — at water_cooler hotspot area
    this.add.image(201, 182, 'obj_cooler').setOrigin(0.5, 1).setDepth(20);

    // Hidden coffee cup — tucked on the floor behind the water cooler
    // Only visible if not already picked up
    if (!GameState.getInstance().hasItem('lobby_coffee') && !GameState.getInstance().hasFlag('lobby_coffee_taken')) {
      this.lobbyCoffeeSprite = this.add.image(218, 178, 'obj_lobby_coffee').setOrigin(0.5, 1).setDepth(19).setScale(0.4);
    }

    // Now Serving Display — on wall
    this.add.image(297, 42, 'obj_now_serving').setOrigin(0.5, 0.5).setDepth(10);

    // Motivational Poster — on wall
    this.add.image(240, 78, 'obj_poster').setOrigin(0.5, 0.5).setDepth(10);

    // Bulletin Board — on wall
    this.add.image(440, 122, 'obj_bulletin').setOrigin(0.5, 0.5).setDepth(10);

    // Security Turnstile — at turnstile hotspot area
    this.add.image(400, 210, 'obj_turnstile').setOrigin(0.5, 0.5).setDepth(30);

    // Waiting Chairs — connected orange plastic row
    this.add.image(135, 180, 'obj_chairs').setOrigin(0.5, 0.5).setDepth(15);

    // Security Desk — PixelLab-generated sprite
    this.add.image(320, 210, 'obj_security_desk').setOrigin(0.5, 0.5).setDepth(30);
    // Badge reader LED (on desk surface)
    this.turnstileLed = this.add.circle(355, 200, 2, 0xcc3333).setDepth(34);

    // ── Lore objects (PixelLab sprites) ──
    this.add.image(360, 78, 'obj_suggestion_box').setOrigin(0.5, 0.5).setDepth(10);
    this.add.image(150, 50, 'obj_lobby_clock').setOrigin(0.5, 0.5).setDepth(10);
    this.add.image(135, 275, 'obj_floor_plaque').setOrigin(0.5, 0.5).setDepth(2);
    this.add.image(380, 140, 'obj_pamphlet_rack').setOrigin(0.5, 0.5).setDepth(10);

    // ── Security barrier/railing ──
    // Runs from turnstile right edge (x=424) to the right wall (x=640)
    // Creates a visible barrier that blocks passage to the "other side"
    this.drawSecurityBarrier();
  }

  private drawSecurityBarrier(): void {
    const barrierY = 200; // same height as desk/turnstile
    const barrierStartX = 424; // right edge of turnstile
    const barrierEndX = 630; // near right wall
    const postSpacing = 32;

    const g = this.add.graphics().setDepth(28);

    // Horizontal rail bars (two rails, chrome style)
    g.fillStyle(0x999999);
    g.fillRect(barrierStartX, barrierY - 4, barrierEndX - barrierStartX, 2); // top rail
    g.fillRect(barrierStartX, barrierY + 8, barrierEndX - barrierStartX, 2); // bottom rail
    // Highlight on top rail
    g.fillStyle(0xbbbbbb);
    g.fillRect(barrierStartX, barrierY - 5, barrierEndX - barrierStartX, 1);

    // Vertical posts
    for (let x = barrierStartX; x <= barrierEndX; x += postSpacing) {
      // Post body
      g.fillStyle(0x888888);
      g.fillRect(x - 2, barrierY - 8, 4, 24);
      // Post highlight
      g.fillStyle(0xaaaaaa);
      g.fillRect(x - 2, barrierY - 8, 1, 24);
      // Post base
      g.fillStyle(0x666666);
      g.fillRect(x - 3, barrierY + 14, 6, 3);
    }

    // "AUTHORIZED PERSONNEL ONLY" sign on the barrier
    const signX = (barrierStartX + barrierEndX) / 2;
    const signY = barrierY - 14;

    // Sign background
    const signBg = this.add.rectangle(signX, signY, 120, 14, 0xcc2222).setDepth(29);
    signBg.setStrokeStyle(1, 0x991111);

    // Sign text
    this.add.text(signX, signY, 'AUTHORIZED ONLY', {
      fontFamily: 'monospace',
      fontSize: '6px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(29);

    // ── Floor tint: right side is darker (restricted area) ──
    const restrictedArea = this.add.rectangle(
      (barrierStartX + 640) / 2, (WALK_MIN_Y + barrierY) / 2,
      640 - barrierStartX, barrierY - WALK_MIN_Y,
      0x000000, 0.08
    ).setOrigin(0.5, 0.5).setDepth(1);

    // Hallway suggestion behind barrier (darker corridor hint)
    this.add.rectangle(580, 150, 80, 60, 0x222222, 0.3).setDepth(1);
    this.add.text(580, 150, 'BULLPEN', {
      fontFamily: 'monospace', fontSize: '5px', color: '#555555',
    }).setOrigin(0.5).setDepth(2);
  }

  private drawNPCs(): void {
    // Gladys — seated BEHIND security desk. Desk front is depth 30-34,
    // so Gladys at depth 25 makes the desk overlap her lower body.
    const gladys = this.add.sprite(325, 200, 'char_gladys', CHAR_FRAMES.IDLE_S);
    gladys.setOrigin(0.5, 1);
    gladys.setDepth(25);

    // Mrs. Gutierrez — seated on the second waiting chair (no built-in chair)
    // Chairs sprite is at (135, 180) depth 15. Position her on top at higher depth.
    const mrsG = this.add.image(135, 203, 'mrsg_seated');
    mrsG.setOrigin(0.5, 1);
    mrsG.setDepth(200);
  }

  // --- Navigation Grid ---

  private setupNavGrid(): void {
    this.navGrid = new NavGrid(WALK_MIN_X, WALK_MIN_Y, WALK_MAX_X, WALK_MAX_Y);

    // Obstacle positions derived from sprite bounds (with padding built into NavGrid.addObstacle)
    // Potted plant: img(75, 168) 32x48 origin(0.5,1) → bounds 59,120-91,168
    // Only the floor footprint matters (y >= WALK_MIN_Y)
    this.navGrid.addObstacle(59, 190, 32, 30);

    // Waiting chairs: img(135, 180) 96x48 origin(0.5,0.5) → bounds 87,156-183,204
    this.navGrid.addObstacle(87, 190, 96, 14);

    // Water cooler: img(201, 182) 32x48 origin(0.5,1) → bounds 185,134-217,182
    this.navGrid.addObstacle(185, 190, 32, 10);

    // Security desk: img(320, 210) 128x64 origin(0.5,0.5) → bounds 256,178-384,242
    this.navGrid.addObstacle(256, 190, 128, 52);

    // Turnstile: img(400, 210) 48x48 origin(0.5,0.5) → bounds 376,186-424,234
    this.navGrid.addObstacle(376, 190, 48, 44);

    // Security barrier: solid wall from turnstile right edge to right wall
    // Blocks all passage — only way through is the turnstile (scene transition)
    this.navGrid.addObstacle(424, 190, 216, 16);

    // Mrs. Gutierrez in chair: img(135, 203) 48x64 origin(0.5,1) → bounds 111,139-159,203
    // She's seated in the chairs — obstacle covers her + chair footprint
    this.navGrid.addObstacle(111, 190, 48, 14);
  }

  // --- Ambient Life ---

  private setupAmbientLife(): void {
    // Stagger all timers with random offsets so nothing syncs
    const rOff = () => Math.random() * 3000;

    // 1. Background music — low volume, looping
    if (this.cache.audio.exists('lobby_music')) {
      this.sound.play('lobby_music', { loop: true, volume: 0.18 });
    }

    // 2a. Fluorescent hum — looping ambient drone at very low volume
    if (this.cache.audio.exists('sfx_fluorescent_hum')) {
      this.sound.play('sfx_fluorescent_hum', { loop: true, volume: 0.05 });
    }

    // 2b. Water cooler bubble SFX — random interval 10-15 seconds
    if (this.cache.audio.exists('sfx_water_bubble')) {
      const scheduleBubbleSfx = () => {
        const delay = Phaser.Math.Between(10000, 15000);
        this.time.delayedCall(delay, () => {
          this.sound.play('sfx_water_bubble', { volume: 0.15 });
          scheduleBubbleSfx();
        });
      };
      this.time.delayedCall(rOff(), () => scheduleBubbleSfx());
    }

    // 2. Potted plant — gentle leaf bob using a Graphics overlay
    // The main ficus sprite stays static. A small green leaf triangle
    // is drawn at the top-right of the plant and bobs with a sine wave.
    const leafGfx = this.add.graphics();
    leafGfx.fillStyle(0x3b7a2a, 0.85);
    leafGfx.fillTriangle(0, 0, 4, -3, 2, -6);
    // Generate a tiny canvas texture from the graphics
    leafGfx.generateTexture('leaf_overlay', 6, 8);
    leafGfx.destroy();
    const leaf = this.add.image(83, 120, 'leaf_overlay')
      .setOrigin(0.5, 1)
      .setDepth(21);
    this.time.addEvent({
      delay: 4000 + rOff(),
      callback: () => {
        this.time.addEvent({
          delay: 3000 + Math.random() * 4000,
          loop: true,
          callback: () => {
            this.tweens.add({
              targets: leaf,
              y: leaf.y - 1.5,
              duration: 900,
              yoyo: true,
              ease: 'Sine.inOut',
            });
          },
        });
      },
    });

    // 3. Now Serving display — dying LED glitch with segment dropout
    this.nowServingText = this.add.text(297, 44, '847', {
      fontFamily: 'monospace', fontSize: '12px', color: '#cc2222', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);

    // Subtle red glow pulse on the text (alpha oscillation)
    this.tweens.add({
      targets: this.nowServingText,
      alpha: { from: 1, to: 0.7 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // Dying-LED glitch: segments disappear, corrupted chars, then snap back
    this.time.addEvent({
      delay: 15000 + rOff() * 3,
      loop: true,
      callback: () => {
        if (!this.nowServingText) return;
        // Simulate segment dropout: underscores = missing segments,
        // garbled chars = misread digits on a seven-segment display
        const corruptedFrames = [
          '8_7', '_ 7', '  7', '  _', '   ',  // segments dying
          ' 4_', '_47', '§_7', '8∆_',          // garbled recovery
          '847',                                 // snap back to normal
        ];
        let step = 0;
        this.time.addEvent({
          delay: 70,
          repeat: corruptedFrames.length - 1,
          callback: () => {
            if (!this.nowServingText) return;
            this.nowServingText.setText(corruptedFrames[step]);
            // Flash brightness on corruption frames
            if (step < corruptedFrames.length - 1) {
              this.nowServingText.setAlpha(0.4 + Math.random() * 0.6);
            } else {
              this.nowServingText.setAlpha(1);
            }
            step++;
          },
        });
      },
    });

    // 4. Water cooler — multi-bubble rise with wobble
    // 2-3 tiny bubbles rise at staggered intervals, wobble side to side,
    // and fade out near the top of the jug.
    this.time.addEvent({
      delay: 8000 + rOff() * 2,
      loop: true,
      callback: () => {
        const bubbleCount = Phaser.Math.Between(2, 3);
        for (let i = 0; i < bubbleCount; i++) {
          this.time.delayedCall(i * Phaser.Math.Between(100, 200), () => {
            const radius = Phaser.Math.Between(1, 2);
            const startX = 201 + Phaser.Math.Between(-2, 2);
            const startY = 160;
            const endY = 144;
            const bubble = this.add.circle(startX, startY, radius, 0xaaddff, 0.65)
              .setDepth(21);

            // Rise + fade
            this.tweens.add({
              targets: bubble,
              y: endY,
              alpha: 0,
              duration: 700 + Phaser.Math.Between(0, 300),
              ease: 'Sine.out',
              onComplete: () => bubble.destroy(),
            });

            // Wobble side-to-side (sine movement on x)
            this.tweens.add({
              targets: bubble,
              x: startX + Phaser.Math.Between(-2, 2),
              duration: 350,
              yoyo: true,
              repeat: 1,
              ease: 'Sine.inOut',
            });
          });
        }
      },
    });

    // 5. Fluorescent light flicker — dying tube double-flash pattern
    // A rectangle overlay on the wall does rapid alpha spikes mimicking
    // a failing fluorescent ballast. Random interval 8-25 seconds.
    const lightPatch = this.add.rectangle(180, 20, 120, 30, 0xffffff, 0).setDepth(2);
    const scheduleFlicker = () => {
      const nextDelay = Phaser.Math.Between(8000, 25000);
      this.time.delayedCall(nextDelay, () => {
        // Double-flash pattern: spike, drop, spike (weaker), drop
        this.tweens.chain({
          targets: lightPatch,
          tweens: [
            { alpha: 0.05, duration: 30 },    // first flash ON
            { alpha: 0, duration: 50 },        // OFF
            { alpha: 0.03, duration: 30 },     // second flash ON (weaker)
            { alpha: 0, duration: 40 },        // OFF
            // Occasional third flicker (50% chance)
            ...(Math.random() > 0.5 ? [
              { alpha: 0.02, duration: 25 },
              { alpha: 0, duration: 60 },
            ] : []),
          ],
          onComplete: () => {
            lightPatch.setAlpha(0);
            scheduleFlicker();
          },
        });
      });
    };
    // Kick off with initial random offset
    this.time.delayedCall(rOff(), () => scheduleFlicker());

    // 6. Turnstile LED blink — crisp on/off like a real LED
    if (this.turnstileLed) {
      this.tweens.add({
        targets: this.turnstileLed,
        alpha: { from: 1, to: 0.1 },
        duration: 80,
        yoyo: true,
        hold: 420,        // stay at alpha=1 for 420ms
        repeatDelay: 420,  // stay at alpha=0.1 for 420ms
        repeat: -1,
        ease: 'Stepped',
      });
    }

    // 7. Gladys crossword idle — PixelLab sprite animation
    if (!this.anims.exists('gladys_crossword')) {
      this.anims.create({
        key: 'gladys_crossword',
        frames: this.anims.generateFrameNumbers('char_gladys', {
          start: GLADYS_FRAMES.CROSSWORD.start,
          end: GLADYS_FRAMES.CROSSWORD.end,
        }),
        frameRate: 5,
        repeat: -1,
      });
    }
    const gladysSprite = this.children.list.find(
      (c) => c instanceof Phaser.GameObjects.Sprite
        && (c as Phaser.GameObjects.Sprite).texture.key === 'char_gladys'
    ) as Phaser.GameObjects.Sprite | undefined;
    if (gladysSprite) {
      // Start crossword animation after a staggered delay
      this.time.delayedCall(2000 + rOff(), () => {
        gladysSprite.play('gladys_crossword');
      });
    }

    // 8. Entrance doors — sweeping vertical light bar reflection
    // A thin bright bar sweeps left-to-right across the door glass,
    // simulating someone walking past outside.
    const doorBarGfx = this.add.graphics();
    doorBarGfx.fillStyle(0xffffff, 1);
    doorBarGfx.fillRect(0, 0, 3, 80);
    doorBarGfx.generateTexture('door_light_bar', 3, 80);
    doorBarGfx.destroy();
    const doorLightBar = this.add.image(10, 120, 'door_light_bar')
      .setOrigin(0.5, 0.5)
      .setAlpha(0)
      .setDepth(2);
    this.time.addEvent({
      delay: 20000 + rOff() * 5,
      loop: true,
      callback: () => {
        // Fade in, sweep across door area (x 10 -> 50), fade out
        doorLightBar.setPosition(10, 120);
        doorLightBar.setAlpha(0);
        this.tweens.chain({
          targets: doorLightBar,
          tweens: [
            { alpha: Phaser.Math.FloatBetween(0.04, 0.06), duration: 80 },
            { x: 50, duration: 600, ease: 'Sine.inOut' },
            { alpha: 0, duration: 80 },
          ],
        });
      },
    });

    // 9. Mrs. Gutierrez — static seated sprite (no animation needed)
  }

  // --- Update loop ---

  update(time: number, delta: number): void {
    this.player.update(time, delta);

    // Update custom cursor
    if (this.cursorManager) {
      const pointer = this.input.activePointer;
      if (!this.hotspotHovered) {
        const cam = this.cameras.main;
        if (this.dialogueManager.isActive) {
          this.cursorManager.setState('default');
        } else if (pointer.y > cam.height - 38) {
          this.cursorManager.setState('inventory');
        } else if (pointer.y >= WALK_MIN_Y - 10 && pointer.y <= WALK_MAX_Y + 10) {
          this.cursorManager.setState('walk');
        } else {
          this.cursorManager.setState('default');
        }
      }
      this.cursorManager.update(pointer);
    }

    // Hint timer: show hint after 60s of no progress
    const currentFlagCount = Object.keys(GameState.getInstance().flags).length;
    if (currentFlagCount !== this.lastFlagCount) {
      this.resetHintTimer();
    }
    this.hintTimer += delta;
    if (this.hintTimer > 60000) {
      this.tryShowHint();
      this.hintTimer = 0;
    }

    this.debugMenu?.update();
  }
}
