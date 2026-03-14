import Phaser from 'phaser';
import { GameState } from './GameState';

// --- Data types matching lobby_hotspots.json ---

export type Verb = 'look' | 'use' | 'pickup' | 'talkto';

export interface InteractionCondition {
  flags?: Record<string, boolean>;
  notFlags?: Record<string, boolean>;
  notItems?: string[];
}

export interface HotspotInteraction {
  text: string;
  speaker?: string;
  portrait?: string;
  animation?: string;
  condition?: InteractionCondition;
  flagsSet?: Record<string, boolean | string>;
  itemGiven?: string;
  itemRemoved?: string;
  soundEffect?: string;
  triggerSceneTransition?: string;
  subHotspot?: string;
  delay?: number;
}

export interface HotspotData {
  id: string;
  name: string;
  position: { x: number; y: number };
  polygon: number[];
  verbs: string[];
  interactions: Record<string, HotspotInteraction>;
}

export interface SceneHotspotFile {
  scene: string;
  hotspots: Record<string, HotspotData>;
  genericFallbacks: Record<string, string[]>;
  hintMessages: Record<string, string>;
}

// --- UI constants ---

const VERB_LABELS: Record<Verb, string> = {
  look: 'Look At',
  use: 'Use',
  pickup: 'Pick Up',
  talkto: 'Talk To',
};

const VERB_COLORS: Record<Verb, number> = {
  look: 0x44aaff,
  use: 0xffaa44,
  pickup: 0x44ff88,
  talkto: 0xff88ff,
};

const VERB_CURSORS: Record<Verb, string> = {
  look: '🔍',
  use: '⚙️',
  pickup: '✋',
  talkto: '💬',
};

export class HotspotManager {
  private scene: Phaser.Scene;
  private hotspots: Map<string, HotspotData> = new Map();
  private zones: Map<string, Phaser.GameObjects.Zone> = new Map();
  private highlights: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private verbMenu: Phaser.GameObjects.Container | null = null;
  private cursorLabel: Phaser.GameObjects.Text | null = null;
  private fallbacks: Record<string, string[]> = {};
  private fallbackCounters: Record<string, number> = {};
  hintMessages: Record<string, string> = {};
  private sceneInputBound = false;

  // Callbacks
  onInteraction: ((hotspotId: string, verb: Verb, response: HotspotInteraction) => void) | null = null;
  onWalkTo: ((x: number, y: number, callback: () => void) => void) | null = null;
  getSelectedItem: (() => string | null) | null = null;
  onSceneTransition: ((sceneKey: string) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createCursorLabel();
  }

  private createCursorLabel(): void {
    this.cursorLabel = this.scene.add.text(0, 0, '', { fontSize: '16px' });
    this.cursorLabel.setDepth(1200);
    this.cursorLabel.setVisible(false);

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.cursorLabel?.visible) {
        this.cursorLabel.setPosition(pointer.x + 14, pointer.y - 4);
      }
    });
  }

  // --- Loading ---

  loadFromSceneFile(data: SceneHotspotFile): void {
    if (data.genericFallbacks) {
      this.fallbacks = data.genericFallbacks;
    }
    if (data.hintMessages) {
      this.hintMessages = data.hintMessages;
    }

    for (const [id, hs] of Object.entries(data.hotspots)) {
      hs.id = id;
      this.hotspots.set(id, hs);
      this.createZone(hs);
    }
    this.bindSceneInput();
  }

  addHotspot(data: HotspotData): void {
    this.hotspots.set(data.id, data);
    this.createZone(data);
    if (!this.sceneInputBound) this.bindSceneInput();
  }

  private createZone(data: HotspotData): void {
    // Compute bounding box from polygon
    const poly = data.polygon;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < poly.length; i += 2) {
      minX = Math.min(minX, poly[i]);
      minY = Math.min(minY, poly[i + 1]);
      maxX = Math.max(maxX, poly[i]);
      maxY = Math.max(maxY, poly[i + 1]);
    }
    const w = maxX - minX;
    const h = maxY - minY;
    const cx = minX + w / 2;
    const cy = minY + h / 2;

    const zone = this.scene.add.zone(cx, cy, w, h);

    // Set polygon hit area
    if (poly.length >= 6) {
      const points: Phaser.Geom.Point[] = [];
      for (let i = 0; i < poly.length; i += 2) {
        points.push(new Phaser.Geom.Point(poly[i] - cx + w / 2, poly[i + 1] - cy + h / 2));
      }
      const geom = new Phaser.Geom.Polygon(points);
      zone.setInteractive(geom, Phaser.Geom.Polygon.Contains);
    } else {
      zone.setInteractive();
    }

    zone.setData('hotspotId', data.id);
    zone.input!.dropZone = true;

    // Highlight
    const gfx = this.scene.add.graphics();
    gfx.setVisible(false);
    gfx.setDepth(50);
    gfx.lineStyle(1, 0xffffff, 0.5);
    gfx.fillStyle(0xffffff, 0.08);
    gfx.beginPath();
    gfx.moveTo(poly[0], poly[1]);
    for (let i = 2; i < poly.length; i += 2) {
      gfx.lineTo(poly[i], poly[i + 1]);
    }
    gfx.closePath();
    gfx.strokePath();
    gfx.fillPath();

    zone.on('pointerover', () => {
      gfx.setVisible(true);
      const defaultVerb = (data.verbs[0] ?? 'look') as Verb;
      if (this.cursorLabel) {
        this.cursorLabel.setText(VERB_CURSORS[defaultVerb] ?? '🔍');
        this.cursorLabel.setVisible(true);
      }
    });

    zone.on('pointerout', () => {
      gfx.setVisible(false);
      if (this.cursorLabel) this.cursorLabel.setVisible(false);
    });

    // Left-click
    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) return;
      this.closeVerbMenu();

      const selectedItem = this.getSelectedItem?.();
      if (selectedItem) {
        this.triggerInteraction(data.id, 'use', selectedItem);
        return;
      }

      const defaultVerb = (data.verbs[0] ?? 'look') as Verb;
      this.triggerInteraction(data.id, defaultVerb);
    });

    this.zones.set(data.id, zone);
    this.highlights.set(data.id, gfx);
  }

  private bindSceneInput(): void {
    if (this.sceneInputBound) return;
    this.sceneInputBound = true;

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.rightButtonDown()) {
        if (this.verbMenu) {
          const bounds = this.verbMenu.getBounds();
          if (!bounds.contains(pointer.x, pointer.y)) {
            this.closeVerbMenu();
          }
        }
        return;
      }

      const hitZones = this.scene.input.hitTestPointer(pointer);
      const hotspotZone = hitZones.find((obj) => obj.getData('hotspotId') !== undefined);
      if (hotspotZone) {
        this.showVerbMenu(pointer.x, pointer.y, hotspotZone.getData('hotspotId') as string);
      }
    });
  }

  // --- Verb menu ---

  private showVerbMenu(x: number, y: number, hotspotId: string): void {
    this.closeVerbMenu();

    const data = this.hotspots.get(hotspotId);
    if (!data) return;

    const verbs: Verb[] = (data.verbs.length > 0 ? data.verbs : ['look', 'use', 'pickup', 'talkto']) as Verb[];
    const container = this.scene.add.container(x, y);
    container.setDepth(1000);

    const radius = 40;
    const angles = this.distributeAngles(verbs.length);

    const bgCircle = this.scene.add.graphics();
    bgCircle.fillStyle(0x0a0a1a, 0.85);
    bgCircle.fillCircle(0, 0, radius + 20);
    bgCircle.lineStyle(1, 0x444466, 0.6);
    bgCircle.strokeCircle(0, 0, radius + 20);
    container.add(bgCircle);

    verbs.forEach((verb, i) => {
      const vx = Math.cos(angles[i]) * radius;
      const vy = Math.sin(angles[i]) * radius;

      const label = this.scene.add.text(vx, vy, `${VERB_CURSORS[verb] ?? ''} ${VERB_LABELS[verb] ?? verb}`, {
        fontFamily: 'monospace', fontSize: '9px', color: '#cccccc',
      });
      label.setOrigin(0.5);

      const hitArea = this.scene.add.rectangle(vx, vy, 68, 16);
      hitArea.setFillStyle(0x000000, 0.01);
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on('pointerover', () => { label.setColor('#ffffff'); hitArea.setFillStyle(VERB_COLORS[verb] ?? 0xaaaaaa, 0.3); });
      hitArea.on('pointerout', () => { label.setColor('#cccccc'); hitArea.setFillStyle(0x000000, 0.01); });
      hitArea.on('pointerdown', () => { this.closeVerbMenu(); this.triggerInteraction(hotspotId, verb); });

      container.add([hitArea, label]);
    });

    const cam = this.scene.cameras.main;
    const menuR = radius + 20;
    container.setX(Phaser.Math.Clamp(x, menuR, cam.width - menuR));
    container.setY(Phaser.Math.Clamp(y, menuR, cam.height - menuR));

    this.verbMenu = container;
  }

  private distributeAngles(count: number): number[] {
    if (count <= 4) return [-Math.PI / 2, 0, Math.PI / 2, Math.PI].slice(0, count);
    const angles: number[] = [];
    for (let i = 0; i < count; i++) {
      angles.push(-Math.PI / 2 + (2 * Math.PI * i) / count);
    }
    return angles;
  }

  closeVerbMenu(): void {
    if (this.verbMenu) { this.verbMenu.destroy(); this.verbMenu = null; }
  }

  // --- Interaction resolution ---

  triggerInteraction(hotspotId: string, verb: Verb, itemId?: string): void {
    const data = this.hotspots.get(hotspotId);
    if (!data) return;

    const response = this.resolveInteraction(data, verb, itemId);
    if (!response) return;

    if (this.onWalkTo) {
      this.onWalkTo(data.position.x, data.position.y, () => {
        this.executeInteraction(hotspotId, verb, response);
      });
    } else {
      this.executeInteraction(hotspotId, verb, response);
    }
  }

  private resolveInteraction(data: HotspotData, verb: Verb, itemId?: string): HotspotInteraction | null {
    const state = GameState.getInstance();

    // 1. If using an inventory item, try use_[itemId] first
    if (itemId) {
      const itemKey = `use_${itemId}`;
      const itemResponse = data.interactions[itemKey];
      if (itemResponse && this.checkCondition(itemResponse.condition, state)) {
        return itemResponse;
      }
    }

    // 2. Collect all interaction keys matching this verb (verb, verb__*)
    const candidates: [string, HotspotInteraction][] = [];
    for (const [key, interaction] of Object.entries(data.interactions)) {
      if (key === verb || key.startsWith(`${verb}__`)) {
        candidates.push([key, interaction]);
      }
    }

    // 3. Check variants (verb__*) first, then base verb
    const variants = candidates.filter(([k]) => k.includes('__'));
    const base = candidates.filter(([k]) => !k.includes('__'));

    for (const [, interaction] of variants) {
      if (this.checkCondition(interaction.condition, state)) {
        return interaction;
      }
    }

    for (const [, interaction] of base) {
      if (this.checkCondition(interaction.condition, state)) {
        return interaction;
      }
    }

    // 4. Fallback
    return this.getFallback(verb);
  }

  private checkCondition(condition: InteractionCondition | undefined, state: GameState): boolean {
    if (!condition) return true;

    const hasAny = condition.flags || condition.notFlags || condition.notItems;
    if (!hasAny) return true;

    if (condition.flags) {
      for (const [flag, required] of Object.entries(condition.flags)) {
        if (state.hasFlag(flag) !== required) return false;
      }
    }

    if (condition.notFlags) {
      for (const [flag, required] of Object.entries(condition.notFlags)) {
        if (state.hasFlag(flag) === required) return false;
      }
    }

    if (condition.notItems) {
      for (const item of condition.notItems) {
        if (state.hasItem(item)) return false;
      }
    }

    return true;
  }

  private getFallback(verb: string): HotspotInteraction {
    const options = this.fallbacks[verb] ?? ['I can\'t do that.'];
    const counter = this.fallbackCounters[verb] ?? 0;
    this.fallbackCounters[verb] = counter + 1;
    return { text: options[counter % options.length] };
  }

  private executeInteraction(hotspotId: string, verb: Verb, response: HotspotInteraction): void {
    const state = GameState.getInstance();

    if (response.flagsSet) {
      for (const [flag, value] of Object.entries(response.flagsSet)) {
        state.setFlag(flag, value);
      }
    }
    if (response.itemGiven) {
      state.addItem(response.itemGiven);
    }
    if (response.itemRemoved) {
      state.removeItem(response.itemRemoved);
    }
    if (response.soundEffect) {
      console.log(`[Sound Effect] ${response.soundEffect}`);
    }
    if (response.triggerSceneTransition && this.onSceneTransition) {
      this.onSceneTransition(response.triggerSceneTransition);
    }

    if (this.onInteraction) {
      this.onInteraction(hotspotId, verb, response);
    }
  }

  // --- Utility ---

  getHotspotData(id: string): HotspotData | undefined {
    return this.hotspots.get(id);
  }

  getExaminedCount(): number {
    const state = GameState.getInstance();
    let count = 0;
    for (const id of this.hotspots.keys()) {
      if (state.hasFlag(`examined_${id}`)) count++;
    }
    return count;
  }

  removeHotspot(id: string): void {
    this.zones.get(id)?.destroy();
    this.highlights.get(id)?.destroy();
    this.zones.delete(id);
    this.highlights.delete(id);
    this.hotspots.delete(id);
  }

  destroy(): void {
    this.closeVerbMenu();
    this.cursorLabel?.destroy();
    for (const zone of this.zones.values()) zone.destroy();
    for (const hl of this.highlights.values()) hl.destroy();
    this.zones.clear();
    this.highlights.clear();
    this.hotspots.clear();
  }
}
