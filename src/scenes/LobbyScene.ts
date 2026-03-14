import Phaser from 'phaser';
import { Player } from '../engine/Player';
import { HotspotManager, SceneHotspotFile, HotspotInteraction } from '../engine/HotspotManager';
import { DialogueManager, DialogueTree } from '../engine/DialogueManager';
import { InventoryUI } from '../engine/InventoryUI';
import { GameState } from '../engine/GameState';
import lobbyHotspotsRaw from '../data/hotspots/lobby.json';
import gladysData from '../data/dialogues/gladys.json';
import mrsGutierrezData from '../data/dialogues/mrs_gutierrez.json';
import vossData from '../data/dialogues/voss.json';

const lobbyHotspots = lobbyHotspotsRaw as unknown as SceneHotspotFile;

const WALK_MIN_Y = 240;
const WALK_MAX_Y = 310;
const CASEY_SPAWN_X = 50;
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

  // Hint system
  private hintTimer: number = 0;
  private lastFlagCount: number = 0;
  private hintsShown: Set<string> = new Set();

  constructor() {
    super({ key: 'LobbyScene' });
  }

  create(): void {
    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    GameState.getInstance().reset();

    this.drawBackground();
    this.drawFurniture();
    this.drawNPCs();

    // --- Engine systems ---
    this.player = new Player(this, CASEY_SPAWN_X, CASEY_SPAWN_Y);

    this.hotspotManager = new HotspotManager(this);
    this.hotspotManager.loadFromSceneFile(lobbyHotspots);

    // Add NPC hotspots (not in the JSON)
    this.hotspotManager.addHotspot({
      id: 'npc_gladys',
      name: 'Gladys',
      position: { x: 320, y: 265 },
      polygon: [305, 110, 345, 110, 345, 160, 305, 160],
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
      position: { x: 120, y: 265 },
      polygon: [120, 140, 150, 140, 150, 180, 120, 180],
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

    // --- Wire systems ---
    this.hotspotManager.onWalkTo = (x, y, cb) => this.player.walkTo(x, y, cb);
    this.hotspotManager.getSelectedItem = () => this.inventoryUI.getSelectedItem();

    this.hotspotManager.onSceneTransition = (sceneKey) => {
      console.log(`[Scene Transition] → ${sceneKey}`);
      GameState.getInstance().save();
      this.scene.start('EndSliceScene');
    };

    this.hotspotManager.onInteraction = (hotspotId, _verb, response) => {
      const state = GameState.getInstance();
      state.setFlag(`examined_${hotspotId}`, true);
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

      // Regular hotspot interaction
      if (response.text) {
        this.showMonologue(response.text, response.speaker, response.portrait);
      }

      this.inventoryUI.refresh();
      this.resetHintTimer();
      this.checkVossSpawn();
    };

    this.dialogueManager.onDialogueEnd = () => {
      this.inventoryUI.refresh();
      this.resetHintTimer();
      this.checkVossSpawn();
    };

    this.dialogueManager.onItemGiven = () => {
      this.inventoryUI.refresh();
    };

    this.inventoryUI.onExamineItem = (text) => {
      this.showMonologue(text);
    };

    // Click to walk
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) return;
      if (this.dialogueManager.isActive) return;

      const cam = this.cameras.main;
      if (pointer.y > cam.height - 38) return;

      const hitObjects = this.input.hitTestPointer(pointer);
      const hitHotspot = hitObjects.some((obj) => obj.getData('hotspotId') !== undefined);
      if (hitHotspot) return;

      const walkY = Phaser.Math.Clamp(pointer.y, WALK_MIN_Y, WALK_MAX_Y);
      this.player.walkTo(pointer.x, walkY);
    });

    // Initialize hint timer
    this.lastFlagCount = Object.keys(GameState.getInstance().flags).length;
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

    const state = GameState.getInstance();
    if (!state.hasFlag('wait_for_voss')) return;

    const examined = this.hotspotManager.getExaminedCount();
    if (examined < 3) return;

    this.spawnVoss();
  }

  private spawnVoss(): void {
    this.vossSpawned = true;
    const state = GameState.getInstance();

    // Voss walk-in cutscene
    this.vossSprite = this.add.container(-30, 200);
    this.vossSprite.setDepth(490);

    const body = this.add.rectangle(0, 0, 16, 30, 0x665599).setOrigin(0.5, 1);
    const head = this.add.circle(0, -30, 7, 0xddbb99);
    const nameLabel = this.add.text(0, -42, 'Dir. Voss', {
      fontFamily: 'monospace', fontSize: '7px', color: '#ccaaff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.vossSprite.add([body, head, nameLabel]);

    // Walk in animation
    this.tweens.add({
      targets: this.vossSprite,
      x: 250,
      y: 200,
      duration: 2000,
      ease: 'Power1',
      onComplete: () => {
        state.setFlag('voss_present', true);

        // Add Voss as clickable NPC hotspot
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
    const state = GameState.getInstance();
    if (state.hasFlag('has_temp_badge')) return 'BADGE_GET';
    if (state.hasFlag('voss_present')) return 'VOSS_ARRIVES';
    if (state.hasFlag('wait_for_voss')) return 'VOSS_HINT';
    if (state.hasFlag('badge_quest_active')) return 'CATCH_22';
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
      delay: 3000,
      duration: 1000,
      onComplete: () => bubble.destroy(),
    });
  }

  // --- Background & Environment ---

  private drawBackground(): void {
    this.add.rectangle(320, 50, 640, 100, 0xc8c4b8);
    this.add.rectangle(320, 130, 640, 60, 0xd4d0c4);
    this.add.rectangle(320, 160, 640, 4, 0x888078);
    this.add.rectangle(320, 241, 640, 162, 0xc4b898);
    this.add.rectangle(200, 260, 30, 3, 0xb8aa88, 0.4);
    this.add.rectangle(400, 280, 25, 2, 0xb8aa88, 0.3);
    this.add.rectangle(520, 250, 20, 3, 0xb8aa88, 0.35);
    this.add.rectangle(610, 120, 60, 100, 0x555550);
    this.add.text(590, 75, 'AUTHORIZED\nPERSONNEL\nONLY', {
      fontFamily: 'monospace', fontSize: '5px', color: '#999988', align: 'center',
    }).setOrigin(0.5, 0);
  }

  private drawFurniture(): void {
    // Entrance Doors
    this.add.rectangle(30, 125, 48, 110, 0x7788aa);
    this.add.rectangle(20, 125, 16, 100, 0x99bbdd, 0.6);
    this.add.rectangle(40, 125, 16, 100, 0x99bbdd, 0.6);
    this.add.circle(30, 105, 8, 0x667799);
    this.add.text(30, 105, 'D', { fontFamily: 'monospace', fontSize: '8px', color: '#ddd', fontStyle: 'bold' }).setOrigin(0.5);

    // Sad Plant
    this.add.rectangle(75, 178, 14, 16, 0x885533);
    this.add.rectangle(75, 158, 18, 24, 0x338833);
    this.add.rectangle(82, 165, 6, 3, 0x447744).setAngle(25);

    // Waiting Chairs
    this.add.rectangle(115, 178, 16, 16, 0xcc7733);
    this.add.rectangle(135, 178, 16, 16, 0xcc7733);
    this.add.rectangle(155, 178, 16, 16, 0xcc7733);
    this.add.rectangle(135, 188, 56, 3, 0x999999);

    // Water Cooler
    this.add.rectangle(201, 165, 16, 30, 0x7799bb);
    this.add.rectangle(201, 148, 12, 14, 0xaaddff, 0.7);
    this.add.rectangle(208, 168, 4, 3, 0xcccccc);

    // Now Serving
    this.add.rectangle(297, 42, 52, 24, 0x222211);
    this.add.rectangle(297, 42, 48, 20, 0x110808);
    this.add.text(297, 42, '847', { fontFamily: 'monospace', fontSize: '14px', color: '#cc2222', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(297, 28, 'NOW SERVING', { fontFamily: 'monospace', fontSize: '5px', color: '#888877' }).setOrigin(0.5);

    // Motivational Poster
    this.add.rectangle(240, 78, 32, 42, 0xddddcc);
    this.add.rectangle(240, 71, 26, 14, 0xee9944);
    this.add.text(240, 84, 'TEAMWORK', { fontFamily: 'monospace', fontSize: '4px', color: '#333333', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(240, 92, '...Paperwork', { fontFamily: 'monospace', fontSize: '3px', color: '#666666' }).setOrigin(0.5);

    // Bulletin Board
    this.add.rectangle(440, 122, 50, 80, 0xaa8844);
    this.add.rectangle(440, 122, 46, 76, 0xbb9955);
    this.add.rectangle(428, 105, 18, 14, 0xeeeedd).setAngle(-3);
    this.add.rectangle(443, 112, 16, 12, 0xddddee).setAngle(5);
    this.add.rectangle(453, 100, 14, 18, 0xffeecc).setAngle(-2);
    this.add.rectangle(431, 130, 14, 16, 0xffddaa);
    this.add.text(431, 130, '🐱', { fontSize: '6px' }).setOrigin(0.5);
    this.add.rectangle(451, 138, 16, 14, 0xccddee).setAngle(2);
    this.add.rectangle(438, 150, 12, 10, 0xeeffee).setAngle(-1);

    // Security Desk
    this.add.rectangle(320, 198, 96, 40, 0x606672);
    this.add.rectangle(320, 216, 96, 8, 0x50555f);
    this.add.rectangle(320, 178, 80, 4, 0xaaccee, 0.5);
    this.add.rectangle(285, 176, 2, 20, 0x88aabb);
    this.add.rectangle(355, 176, 2, 20, 0x88aabb);
    this.add.rectangle(355, 202, 10, 8, 0x333333);
    this.add.circle(355, 200, 2, 0xcc3333);
    this.add.rectangle(300, 200, 12, 8, 0xddcc99);
    this.add.rectangle(340, 195, 6, 7, 0xeeeeee);

    // Turnstile
    this.add.rectangle(400, 210, 6, 36, 0x888888);
    this.add.rectangle(400, 203, 22, 4, 0x999999);
    this.add.rectangle(400, 213, 22, 4, 0x999999);
    this.add.circle(400, 193, 3, 0xcc3333);

    // American Flag
    this.add.rectangle(587, 75, 2, 50, 0xccaa44);
    this.add.rectangle(580, 68, 18, 24, 0xcc3333);
    this.add.rectangle(580, 64, 18, 4, 0xffffff);
    this.add.rectangle(580, 72, 18, 4, 0xffffff);
    this.add.rectangle(574, 62, 8, 10, 0x334488);

    // Labels
    const ls = { fontFamily: 'monospace', fontSize: '6px', color: '#777766' } as Phaser.Types.GameObjects.Text.TextStyle;
    this.add.text(30, 68, 'Doors', ls).setOrigin(0.5);
    this.add.text(75, 142, 'Plant', ls).setOrigin(0.5);
    this.add.text(135, 195, 'Chairs', ls).setOrigin(0.5);
    this.add.text(201, 135, 'Cooler', ls).setOrigin(0.5);
    this.add.text(440, 75, 'Board', ls).setOrigin(0.5);
    this.add.text(400, 180, 'Turnstile', ls).setOrigin(0.5);
  }

  private drawNPCs(): void {
    // Gladys
    this.add.rectangle(325, 188, 16, 28, 0x445588).setOrigin(0.5, 1);
    this.add.circle(325, 162, 7, 0xddaa77);
    this.add.rectangle(325, 162, 14, 3, 0x444444, 0.6);
    this.add.text(325, 150, 'Gladys', {
      fontFamily: 'monospace', fontSize: '7px', color: '#ffcc88', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Mrs. Gutierrez
    this.add.rectangle(135, 170, 14, 20, 0xcc6666).setOrigin(0.5, 1);
    this.add.circle(135, 152, 6, 0xddaa88);
    this.add.rectangle(135, 168, 10, 6, 0xddcc88);
    this.add.text(135, 140, 'Mrs. G', {
      fontFamily: 'monospace', fontSize: '7px', color: '#ffaaaa', fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  // --- Update loop ---

  update(time: number, delta: number): void {
    this.player.update(time, delta);

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
  }
}
