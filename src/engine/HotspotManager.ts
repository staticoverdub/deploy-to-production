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

// Verb priority for cursor display: talkto > use > pickup > look
const VERB_PRIORITY: Verb[] = ['talkto', 'use', 'pickup', 'look'];

export class HotspotManager {
  private scene: Phaser.Scene;
  private hotspots: Map<string, HotspotData> = new Map();
  private zones: Map<string, Phaser.GameObjects.Zone> = new Map();
  private verbMenu: Phaser.GameObjects.Container | null = null;
  private fallbacks: Record<string, string[]> = {};
  private fallbackCounters: Record<string, number> = {};
  hintMessages: Record<string, string> = {};
  private sceneInputBound = false;

  // Pending scene transition (deferred until after dialogue/monologue ends)
  private _pendingSceneTransition: string | null = null;

  // Callbacks
  onInteraction: ((hotspotId: string, verb: Verb, response: HotspotInteraction) => void) | null = null;
  onWalkTo: ((x: number, y: number, callback: () => void) => void) | null = null;
  getSelectedItem: (() => string | null) | null = null;
  onCursorChange: ((verb: string | null) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
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

    // No hover highlight — cursor change is the only feedback (LucasArts style)
    zone.on('pointerover', () => {
      if (this.onCursorChange) {
        this.onCursorChange(this.getPriorityVerb(data.verbs));
      }
    });

    zone.on('pointerout', () => {
      if (this.onCursorChange) {
        this.onCursorChange(null);
      }
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

  // --- Verb menu (LucasArts-style radial) ---

  private showVerbMenu(x: number, y: number, hotspotId: string): void {
    this.closeVerbMenu();

    const data = this.hotspots.get(hotspotId);
    if (!data) return;

    const verbs: Verb[] = (data.verbs.length > 0 ? data.verbs : ['look', 'use', 'pickup', 'talkto']) as Verb[];

    const radius = 36;
    const btnW = 72;
    const btnH = 24;
    const menuExtent = radius + btnH / 2 + 4; // total radius including buttons
    const angles = this.distributeAngles(verbs.length);

    // Clamp position so the full wheel stays within the canvas
    const cam = this.scene.cameras.main;
    const cx = Phaser.Math.Clamp(x, menuExtent + 2, cam.width - menuExtent - 2);
    const cy = Phaser.Math.Clamp(y, menuExtent + 2, cam.height - menuExtent - 2);

    const container = this.scene.add.container(cx, cy);
    container.setDepth(1000);

    // Dark translucent background disc
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0a1a, 0.88);
    bg.fillCircle(0, 0, menuExtent);
    bg.lineStyle(2, 0x333355, 0.8);
    bg.strokeCircle(0, 0, menuExtent);
    container.add(bg);

    // Center dot
    const dot = this.scene.add.graphics();
    dot.fillStyle(0x444466, 1);
    dot.fillCircle(0, 0, 3);
    container.add(dot);

    verbs.forEach((verb, i) => {
      const vx = Math.cos(angles[i]) * radius;
      const vy = Math.sin(angles[i]) * radius;

      // Button background (chunky, visible)
      const btnBg = this.scene.add.rectangle(vx, vy, btnW, btnH, 0x1a1a2e, 0.95);
      btnBg.setStrokeStyle(1, 0x444466);

      // Label
      const label = this.scene.add.text(vx, vy, VERB_LABELS[verb] ?? verb, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#aaaacc',
        fontStyle: 'bold',
      });
      label.setOrigin(0.5);

      btnBg.setInteractive({});
      btnBg.on('pointerover', () => {
        btnBg.setFillStyle(VERB_COLORS[verb] ?? 0x444466, 0.5);
        btnBg.setStrokeStyle(1, 0xaaaacc);
        label.setColor('#ffffff');
      });
      btnBg.on('pointerout', () => {
        btnBg.setFillStyle(0x1a1a2e, 0.95);
        btnBg.setStrokeStyle(1, 0x444466);
        label.setColor('#aaaacc');
      });
      btnBg.on('pointerdown', () => {
        if (this.scene.cache.audio.exists('sfx_ui_click')) {
          this.scene.sound.play('sfx_ui_click', { volume: 0.3 });
        }
        this.closeVerbMenu();
        this.triggerInteraction(hotspotId, verb);
      });

      container.add([btnBg, label]);
    });

    this.verbMenu = container;
  }

  private distributeAngles(count: number): number[] {
    if (count <= 4) {
      // Cardinal positions: top, right, bottom, left
      return [-Math.PI / 2, 0, Math.PI / 2, Math.PI].slice(0, count);
    }
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
    if (response.soundEffect && this.scene.cache.audio.exists(response.soundEffect)) {
      this.scene.sound.play(response.soundEffect, { volume: 0.4 });
    }
    if (response.triggerSceneTransition) {
      this._pendingSceneTransition = response.triggerSceneTransition;
    }

    if (this.onInteraction) {
      this.onInteraction(hotspotId, verb, response);
    }
  }

  private getPriorityVerb(verbs: string[]): string {
    for (const v of VERB_PRIORITY) {
      if (verbs.includes(v)) return v;
    }
    return verbs[0] ?? 'look';
  }

  // --- Pending transition ---

  getPendingTransition(): string | null {
    return this._pendingSceneTransition;
  }

  clearPendingTransition(): void {
    this._pendingSceneTransition = null;
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
    this.zones.delete(id);
    this.hotspots.delete(id);
  }

  destroy(): void {
    this.closeVerbMenu();
    for (const zone of this.zones.values()) zone.destroy();
    this.zones.clear();
    this.hotspots.clear();
  }
}
