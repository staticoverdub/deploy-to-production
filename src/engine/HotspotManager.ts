import Phaser from 'phaser';
import { GameState } from './GameState';
import { isTouchDevice, LONG_PRESS_MS } from './TouchDetector';

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
  triggerEvent?: string;
  triggerCutscene?: string;
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

  // Long-press state (touch devices)
  private longPressTimer: Phaser.Time.TimerEvent | null = null;
  private longPressTriggered = false;
  private longPressStartPos: { x: number; y: number } = { x: 0, y: 0 };

  // Debug
  private debugGraphics: Phaser.GameObjects.Graphics | null = null;
  private debugMode = false;

  // Callbacks
  onInteraction: ((hotspotId: string, verb: Verb, response: HotspotInteraction) => void) | null = null;
  onWalkTo: ((x: number, y: number, callback: () => void) => void) | null = null;
  getSelectedItem: (() => string | null) | null = null;
  onCursorChange: ((verb: string | null) => void) | null = null;
  onTriggerEvent: ((eventName: string) => void) | null = null;

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
      if (this.longPressTriggered) return; // long-press already handled
      if (this.verbMenu) return; // let verb menu click handler process it
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
        // Start long-press timer on touch devices
        if (isTouchDevice() && pointer.wasTouch) {
          this.longPressTriggered = false;
          this.longPressStartPos = { x: pointer.x, y: pointer.y };
          this.cancelLongPress();
          this.longPressTimer = this.scene.time.delayedCall(LONG_PRESS_MS, () => {
            const hitZones = this.scene.input.hitTestPointer(pointer);
            const hotspotZone = hitZones.find((obj) => obj.getData('hotspotId') !== undefined);
            if (hotspotZone) {
              this.longPressTriggered = true;
              this.showVerbMenu(pointer.x, pointer.y, hotspotZone.getData('hotspotId') as string);
            }
          });
        }

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

    // Cancel long-press if finger moves too far
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!isTouchDevice() || !this.longPressTimer) return;
      const dx = pointer.x - this.longPressStartPos.x;
      const dy = pointer.y - this.longPressStartPos.y;
      if (dx * dx + dy * dy > 100) { // 10px threshold
        this.cancelLongPress();
      }
    });

    // Reset long-press on pointer up
    this.scene.input.on('pointerup', () => {
      this.cancelLongPress();
      // Reset triggered flag after a frame so zone handler can check it
      this.scene.time.delayedCall(0, () => { this.longPressTriggered = false; });
    });
  }

  private cancelLongPress(): void {
    if (this.longPressTimer) {
      this.longPressTimer.destroy();
      this.longPressTimer = null;
    }
  }

  // --- Verb menu (LucasArts-style radial) ---
  // Uses bounds-based click detection (no setInteractive on buttons)
  // to avoid Phaser container input bugs.

  private verbMenuButtons: { wx: number; wy: number; w: number; h: number; verb: Verb; hotspotId: string }[] = [];
  private verbMenuTimeout: Phaser.Time.TimerEvent | null = null;
  private verbMenuClickHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private verbMenuEscHandler: (() => void) | null = null;

  private showVerbMenu(x: number, y: number, hotspotId: string): void {
    this.closeVerbMenu();

    const data = this.hotspots.get(hotspotId);
    if (!data) return;

    const verbs: Verb[] = (data.verbs.length > 0 ? data.verbs : ['look', 'use', 'pickup', 'talkto']) as Verb[];

    const isTouch = isTouchDevice();
    const radius = isTouch ? 50 : 36;
    const btnW = isTouch ? 110 : 72;
    const btnH = isTouch ? 40 : 24;
    const menuExtent = radius + btnH / 2 + 4;
    const angles = this.distributeAngles(verbs.length);

    // Clamp position so the full wheel stays within the canvas
    const cam = this.scene.cameras.main;
    const cx = Phaser.Math.Clamp(x, menuExtent + 2, cam.width - menuExtent - 2);
    const cy = Phaser.Math.Clamp(y, menuExtent + 2, cam.height - menuExtent - 2);

    const container = this.scene.add.container(cx, cy);
    container.setDepth(1000).setScrollFactor(0);

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

    // Store button world positions for bounds-based click detection
    this.verbMenuButtons = [];

    verbs.forEach((verb, i) => {
      const vx = Math.cos(angles[i]) * radius;
      const vy = Math.sin(angles[i]) * radius;

      const btnBg = this.scene.add.rectangle(vx, vy, btnW, btnH, 0x1a1a2e, 0.95);
      btnBg.setStrokeStyle(1, 0x444466);

      const label = this.scene.add.text(vx, vy, VERB_LABELS[verb] ?? verb, {
        fontFamily: 'monospace', fontSize: isTouch ? '12px' : '10px', color: '#aaaacc', fontStyle: 'bold',
      }).setOrigin(0.5);

      container.add([btnBg, label]);

      // Store world-space bounds for this button
      this.verbMenuButtons.push({
        wx: cx + vx, wy: cy + vy,
        w: btnW, h: btnH,
        verb, hotspotId,
      });
    });

    this.verbMenu = container;

    // Global left-click handler: check button hits or close if outside
    this.verbMenuClickHandler = (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) return;
      const px = pointer.x, py = pointer.y;

      // Check each button
      for (const btn of this.verbMenuButtons) {
        if (px >= btn.wx - btn.w / 2 && px <= btn.wx + btn.w / 2
          && py >= btn.wy - btn.h / 2 && py <= btn.wy + btn.h / 2) {
          if (this.scene.cache.audio.exists('sfx_ui_click')) {
            this.scene.sound.play('sfx_ui_click', { volume: 0.3 });
          }
          const v = btn.verb;
          const hid = btn.hotspotId;
          this.closeVerbMenu();
          this.triggerInteraction(hid, v);
          return;
        }
      }

      // Click was outside all buttons — close menu
      this.closeVerbMenu();
    };
    this.scene.input.on('pointerdown', this.verbMenuClickHandler);

    // Escape key closes menu
    this.verbMenuEscHandler = () => this.closeVerbMenu();
    this.scene.input.keyboard?.once('keydown-ESC', this.verbMenuEscHandler);

    // Auto-close after 10 seconds
    this.verbMenuTimeout = this.scene.time.delayedCall(10000, () => this.closeVerbMenu());
  }

  private distributeAngles(count: number): number[] {
    if (count <= 4) {
      return [-Math.PI / 2, 0, Math.PI / 2, Math.PI].slice(0, count);
    }
    const angles: number[] = [];
    for (let i = 0; i < count; i++) {
      angles.push(-Math.PI / 2 + (2 * Math.PI * i) / count);
    }
    return angles;
  }

  closeVerbMenu(): void {
    if (this.verbMenu) {
      this.verbMenu.destroy();
      this.verbMenu = null;
    }
    this.verbMenuButtons = [];
    if (this.verbMenuClickHandler) {
      this.scene.input.off('pointerdown', this.verbMenuClickHandler);
      this.verbMenuClickHandler = null;
    }
    if (this.verbMenuEscHandler) {
      this.scene.input.keyboard?.off('keydown-ESC', this.verbMenuEscHandler);
      this.verbMenuEscHandler = null;
    }
    if (this.verbMenuTimeout) {
      this.verbMenuTimeout.destroy();
      this.verbMenuTimeout = null;
    }
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
    // Sort variants: ones WITH conditions first (more specific match wins)
    const variants = candidates.filter(([k]) => k.includes('__'));
    const base = candidates.filter(([k]) => !k.includes('__'));

    // Conditioned variants first, then unconditioned variants
    const conditioned = variants.filter(([, i]) => i.condition && (i.condition.flags || i.condition.notFlags || i.condition.notItems));
    const unconditioned = variants.filter(([, i]) => !i.condition || !(i.condition.flags || i.condition.notFlags || i.condition.notItems));

    for (const [, interaction] of conditioned) {
      if (this.checkCondition(interaction.condition, state)) {
        return interaction;
      }
    }
    for (const [, interaction] of unconditioned) {
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
    if (response.triggerEvent && this.onTriggerEvent) {
      // Fire after a short delay so the dialogue text shows first
      this.scene.time.delayedCall(200, () => {
        if (this.onTriggerEvent) this.onTriggerEvent(response.triggerEvent!);
      });
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

  toggleDebug(): void {
    this.debugMode = !this.debugMode;
    if (this.debugMode) {
      this.drawDebugOverlays();
    } else {
      this.debugGraphics?.destroy();
      this.debugGraphics = null;
    }
  }

  private drawDebugOverlays(): void {
    this.debugGraphics?.destroy();
    this.debugGraphics = this.scene.add.graphics().setDepth(5000);
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xff8800, 0x88ff00];
    let colorIdx = 0;

    for (const [id, data] of this.hotspots) {
      const poly = data.polygon;
      const color = colors[colorIdx % colors.length];
      colorIdx++;

      // Draw filled polygon
      this.debugGraphics.fillStyle(color, 0.25);
      this.debugGraphics.lineStyle(1, color, 0.8);

      if (poly.length >= 6) {
        this.debugGraphics.beginPath();
        this.debugGraphics.moveTo(poly[0], poly[1]);
        for (let i = 2; i < poly.length; i += 2) {
          this.debugGraphics.lineTo(poly[i], poly[i + 1]);
        }
        this.debugGraphics.closePath();
        this.debugGraphics.fillPath();
        this.debugGraphics.strokePath();
      } else {
        // Fallback: draw bounding box from zone
        const zone = this.zones.get(id);
        if (zone) {
          const b = zone.getBounds();
          this.debugGraphics.fillRect(b.x, b.y, b.width, b.height);
          this.debugGraphics.strokeRect(b.x, b.y, b.width, b.height);
        }
      }

      // Label
      const cx = poly.length >= 2 ? (poly[0] + poly[2]) / 2 : data.position.x;
      const cy = poly.length >= 4 ? poly[1] - 4 : data.position.y - 10;
      const label = this.scene.add.text(cx, cy, id, {
        fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '12px', color: '#ffffff',
        backgroundColor: '#000000cc', padding: { x: 3, y: 2 },
      }).setOrigin(0.5, 1).setDepth(5001);
      // Store for cleanup
      if (!this.debugGraphics) return;
      (this.debugGraphics as any)._debugLabels = (this.debugGraphics as any)._debugLabels || [];
      (this.debugGraphics as any)._debugLabels.push(label);
    }

    // Override destroy to also clean up labels
    const origDestroy = this.debugGraphics.destroy.bind(this.debugGraphics);
    this.debugGraphics.destroy = () => {
      const labels = (this.debugGraphics as any)?._debugLabels;
      if (labels) for (const l of labels) l.destroy();
      origDestroy();
    };
  }

  destroy(): void {
    this.closeVerbMenu();
    this.cancelLongPress();
    this.debugGraphics?.destroy();
    this.debugGraphics = null;
    for (const zone of this.zones.values()) zone.destroy();
    this.zones.clear();
    this.hotspots.clear();
  }
}
