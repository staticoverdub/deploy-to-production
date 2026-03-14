import Phaser from 'phaser';
import { Player } from '../engine/Player';
import { HotspotManager } from '../engine/HotspotManager';
import { DialogueManager, DialogueTree } from '../engine/DialogueManager';
import { InventoryUI } from '../engine/InventoryUI';
import { GameState } from '../engine/GameState';

const TEST_DIALOGUE: DialogueTree = {
  id: 'test_dialogue',
  startNode: 'start',
  nodes: {
    start: {
      id: 'start',
      speaker: 'gladys',
      portrait: 'gladys_neutral',
      text: "Sign in. Badge on the reader. No tailgating.",
      animation: null,
      flagsSet: {},
      relationshipChanges: {},
      options: [],
      autoAdvance: 'casey_reply',
    },
    casey_reply: {
      id: 'casey_reply',
      speaker: 'casey',
      portrait: null,
      text: "Hi! I'm Casey Park, new Solutions Engineer. It's my first day.",
      animation: null,
      flagsSet: {},
      relationshipChanges: {},
      options: [
        { text: "Can I get a paper cup?", nextNodeId: 'cup_path' },
      ],
      autoAdvance: null,
    },
    cup_path: {
      id: 'cup_path',
      speaker: 'gladys',
      portrait: null,
      text: "Government-issue. They're not great, but they hold water. Usually.",
      animation: null,
      flagsSet: {},
      relationshipChanges: {},
      itemGiven: 'paper_cup',
      options: [],
      autoAdvance: null,
    },
  },
};

export class TestScene extends Phaser.Scene {
  private player!: Player;
  private hotspotManager!: HotspotManager;
  private dialogueManager!: DialogueManager;
  private inventoryUI!: InventoryUI;

  constructor() {
    super({ key: 'TestScene' });
  }

  create(): void {
    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.cameras.main.setBackgroundColor('#2a2a1e');

    this.add.rectangle(320, 300, 640, 120, 0x8a7a5a);
    this.add.rectangle(320, 120, 640, 240, 0x4a4a3e);
    this.add.rectangle(120, 205, 40, 50, 0x228822);
    this.add.rectangle(320, 190, 100, 60, 0x555566);
    this.add.rectangle(497, 197, 35, 55, 0x6688aa);

    GameState.getInstance().reset();

    this.player = new Player(this, 80, 280);

    this.hotspotManager = new HotspotManager(this);
    this.hotspotManager.addHotspot({
      id: 'test_plant', name: 'Plant',
      position: { x: 130, y: 280 },
      polygon: [100, 180, 140, 180, 140, 230, 100, 230],
      verbs: ['look', 'use', 'pickup'],
      interactions: {
        look: { text: "This ficus has seen things." },
        use: { text: "I give the leaf a gentle pat." },
        pickup: { text: "I can't take this." },
      },
    });
    this.hotspotManager.addHotspot({
      id: 'test_desk', name: 'Desk',
      position: { x: 320, y: 280 },
      polygon: [270, 160, 370, 160, 370, 220, 270, 220],
      verbs: ['talkto', 'look'],
      interactions: {
        look: { text: "The security desk." },
        talkto: { text: '' },
      },
    });
    this.hotspotManager.addHotspot({
      id: 'test_cooler', name: 'Cooler',
      position: { x: 500, y: 280 },
      polygon: [480, 170, 515, 170, 515, 225, 480, 225],
      verbs: ['look', 'use'],
      interactions: {
        look: { text: "Water cooler. Full of water. Zero cups." },
        use: { text: "Water splashes into the drip tray." },
        use_paper_cup: { text: "Water acquired!", itemRemoved: 'paper_cup', itemGiven: 'cup_of_water' },
      },
    });

    this.dialogueManager = new DialogueManager(this);
    this.dialogueManager.loadTree(TEST_DIALOGUE);

    this.inventoryUI = new InventoryUI(this);
    this.inventoryUI.refresh();

    this.hotspotManager.onWalkTo = (x, y, cb) => this.player.walkTo(x, y, cb);
    this.hotspotManager.getSelectedItem = () => this.inventoryUI.getSelectedItem();

    this.hotspotManager.onInteraction = (hotspotId, verb, response) => {
      GameState.getInstance().setFlag(`examined_${hotspotId}`, true);
      this.inventoryUI.clearSelection();

      if (hotspotId === 'test_desk' && verb === 'talkto') {
        this.dialogueManager.startDialogue('test_dialogue');
      } else if (response.text) {
        this.showMonologue(response.text);
      }
      this.inventoryUI.refresh();
    };

    this.dialogueManager.onDialogueEnd = () => this.inventoryUI.refresh();
    this.dialogueManager.onItemGiven = () => this.inventoryUI.refresh();
    this.inventoryUI.onExamineItem = (text) => this.showMonologue(text);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) return;
      if (this.dialogueManager.isActive) return;
      const cam = this.cameras.main;
      if (pointer.y > cam.height - 38) return;
      const hit = this.input.hitTestPointer(pointer).some((obj) => obj.getData('hotspotId'));
      if (hit) return;
      this.player.walkTo(pointer.x, Math.min(Math.max(pointer.y, 250), 320));
    });
  }

  private showMonologue(text: string): void {
    const treeId = `_mono_${Date.now()}`;
    this.dialogueManager.loadTree({
      id: treeId, startNode: 'line',
      nodes: {
        line: {
          id: 'line', speaker: 'casey', portrait: null, text,
          animation: null, flagsSet: {}, relationshipChanges: {},
          options: [], autoAdvance: null,
        },
      },
    });
    this.dialogueManager.startDialogue(treeId);
  }

  update(time: number, delta: number): void {
    this.player.update(time, delta);
  }
}
