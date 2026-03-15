import Phaser from 'phaser';
import { GameState } from './GameState';

// --- Data types matching the JSON dialogue format ---

export interface TriggerCondition {
  flags?: Record<string, boolean>;
  notFlags?: Record<string, boolean>;
}

export interface OptionCondition {
  flags?: Record<string, boolean>;
  notFlags?: Record<string, boolean>;
  minRelationship?: Record<string, number>;
}

export interface PlayerOption {
  text: string;
  nextNodeId: string;
  condition?: OptionCondition;
  flagsSet?: Record<string, boolean | string>;
  relationshipChanges?: Record<string, number>;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  portrait: string | null;
  animation: string | null;
  flagsSet: Record<string, boolean | string>;
  relationshipChanges: Record<string, number>;
  options: PlayerOption[];
  autoAdvance: string | null;
  itemGiven?: string;
  itemRemoved?: string;
  soundEffect?: string;
  tutorialTrigger?: string;
}

export interface DialogueTree {
  id: string;
  startNode: string;
  nodes: Record<string, DialogueNode>;
  triggerCondition?: TriggerCondition;
  typewriterSpeed?: number;
}

// --- UI Constants ---

const BOX_HEIGHT = 80;
const BOX_MARGIN = 8;
const PORTRAIT_SIZE = 56;
const PORTRAIT_MARGIN = 12;
const TEXT_X = BOX_MARGIN + PORTRAIT_MARGIN + PORTRAIT_SIZE + 12;
const DEFAULT_TYPING_SPEED = 30;
const OPTION_LINE_HEIGHT = 18;

const SPEAKER_COLORS: Record<string, string> = {
  casey: '#88ccff',
  gladys: '#ffcc88',
  mrs_gutierrez: '#ffaaaa',
  voss: '#ccaaff',
  priya: '#ff9966',
  kevin: '#8888aa',
};

const PORTRAIT_COLORS: Record<string, number> = {
  casey: 0x4488cc,
  gladys: 0xcc8844,
  mrs_gutierrez: 0xcc6666,
  voss: 0x8866cc,
  priya: 0xcc6633,
  kevin: 0x666688,
};

// Speaker to voice babble audio key mapping
const VOICE_KEYS: Record<string, string> = {
  casey: 'voice_casey',
  gladys: 'voice_gladys',
  mrs_gutierrez: 'voice_mrs_g',
  voss: 'voice_voss',
  kevin: 'voice_kevin',
  priya: 'voice_priya',
};

// Formatted display names for speakers
const SPEAKER_DISPLAY_NAMES: Record<string, string> = {
  casey: 'Casey',
  gladys: 'Gladys',
  mrs_gutierrez: 'Mrs. Gutierrez',
  voss: 'Voss',
  priya: 'Priya',
  kevin: 'Kevin',
};

export class DialogueManager {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private dialogueTrees: Map<string, DialogueTree> = new Map();
  private currentTree: DialogueTree | null = null;
  private currentNode: DialogueNode | null = null;

  // Typewriter state
  private fullText: string = '';
  private displayedText: string = '';
  private typingTimer: Phaser.Time.TimerEvent | null = null;
  private isTyping: boolean = false;
  private charIndex: number = 0;

  // Voice babble
  private voiceBabble: Phaser.Sound.BaseSound | null = null;

  // UI elements
  private bgBox: Phaser.GameObjects.Rectangle | null = null;
  private portraitContainer: Phaser.GameObjects.Container | null = null;
  private speakerText: Phaser.GameObjects.Text | null = null;
  private bodyText: Phaser.GameObjects.Text | null = null;
  private optionElements: Phaser.GameObjects.GameObject[] = [];
  // Stored option data for bounds-based click detection
  private visibleOptions: { text: Phaser.GameObjects.Text; opt: PlayerOption }[] = [];
  private optionsShowing = false;

  // Callbacks
  onDialogueEnd: ((treeId: string) => void) | null = null;
  onItemGiven: ((itemId: string) => void) | null = null;

  get isActive(): boolean {
    return this.currentTree !== null;
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // --- Loading ---

  loadTree(tree: DialogueTree): void {
    this.dialogueTrees.set(tree.id, tree);
  }

  loadTrees(trees: DialogueTree[]): void {
    for (const tree of trees) {
      this.loadTree(tree);
    }
  }

  /**
   * Load raw NPC JSON file data. The JSON has multiple conversation trees
   * as top-level keys (e.g. "gladys_first_contact", "gladys_badge_quest").
   */
  loadNPCFile(data: Record<string, any>): void {
    for (const key of Object.keys(data)) {
      const tree = data[key] as DialogueTree;
      this.loadTree(tree);
    }
  }

  // --- Conversation selection ---

  /**
   * Given an array of conversation trees (typically all trees for one NPC),
   * select the best one whose triggerCondition is satisfied by the current
   * game state. Trees with a triggerCondition are checked first (in order);
   * a tree without a triggerCondition is used as a fallback.
   */
  selectConversation(conversations: DialogueTree[]): DialogueTree | null {
    const state = GameState.getInstance();
    let fallback: DialogueTree | null = null;

    for (const tree of conversations) {
      if (!tree.triggerCondition) {
        // No condition means this is a fallback / default conversation
        if (!fallback) {
          fallback = tree;
        }
        continue;
      }

      if (this.checkTriggerCondition(tree.triggerCondition, state)) {
        return tree;
      }
    }

    return fallback;
  }

  private checkTriggerCondition(
    condition: TriggerCondition,
    state: GameState,
  ): boolean {
    if (condition.flags) {
      for (const [flag, required] of Object.entries(condition.flags)) {
        if (state.hasFlag(flag) !== required) return false;
      }
    }
    if (condition.notFlags) {
      for (const [flag, required] of Object.entries(condition.notFlags)) {
        // notFlags means the flag must NOT match. e.g. notFlags: { voss_convinced: true }
        // means voss_convinced must NOT be true.
        if (state.hasFlag(flag) === required) return false;
      }
    }
    return true;
  }

  // --- Starting dialogue ---

  startDialogue(treeId: string): void {
    const tree = this.dialogueTrees.get(treeId);
    if (!tree) {
      console.warn(`Dialogue tree "${treeId}" not found`);
      return;
    }

    this.currentTree = tree;
    this.createUI();
    this.showNode(tree.startNode);
  }

  /**
   * Start a conversation from a set of trees for an NPC, automatically
   * selecting the right one based on triggerConditions.
   */
  startConversation(conversations: DialogueTree[]): void {
    const tree = this.selectConversation(conversations);
    if (!tree) {
      console.warn('No matching conversation found');
      return;
    }

    this.currentTree = tree;
    this.createUI();
    this.showNode(tree.startNode);
  }

  // --- UI ---

  private createUI(): void {
    const cam = this.scene.cameras.main;
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(900);
    this.container.setScrollFactor(0);

    const boxY = cam.height - BOX_HEIGHT - BOX_MARGIN;

    // Background box
    this.bgBox = this.scene.add.rectangle(
      cam.width / 2,
      boxY + BOX_HEIGHT / 2,
      cam.width - BOX_MARGIN * 2,
      BOX_HEIGHT,
      0x0a0a1a,
      0.92,
    );
    this.bgBox.setStrokeStyle(1, 0x444466);
    this.container.add(this.bgBox);

    // Portrait container (updated per node)
    this.portraitContainer = this.scene.add.container(
      BOX_MARGIN + PORTRAIT_MARGIN + PORTRAIT_SIZE / 2,
      boxY + BOX_HEIGHT / 2,
    );
    this.container.add(this.portraitContainer);

    // Speaker name
    this.speakerText = this.scene.add.text(TEXT_X, boxY + 8, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.container.add(this.speakerText);

    // Body text
    this.bodyText = this.scene.add.text(TEXT_X, boxY + 24, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#cccccc',
      wordWrap: { width: cam.width - TEXT_X - BOX_MARGIN - 8 },
      lineSpacing: 3,
    });
    this.container.add(this.bodyText);

    // Click handler: DOM mousedown on canvas directly.
    // Bypasses Phaser's input system so hotspot zones can't eat clicks.
    // _dialogueOpenTime prevents the same mousedown that opened the dialogue
    // from immediately dismissing it (100ms grace period).
    this._dialogueOpenTime = Date.now();
    this._canvasClickHandler = (e: MouseEvent) => {
      if (e.button !== 0) return;
      // Ignore clicks within 100ms of dialogue opening (same event that triggered it)
      if (Date.now() - this._dialogueOpenTime < 100) return;
      const rect = this.scene.game.canvas.getBoundingClientRect();
      const scaleX = this.scene.game.canvas.width / rect.width;
      const scaleY = this.scene.game.canvas.height / rect.height;
      const fakePointer = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
        rightButtonDown: () => false,
      } as unknown as Phaser.Input.Pointer;
      this.handleClick(fakePointer);
    };
    // Register immediately — the 100ms grace period prevents premature dismissal
    this.scene.game.canvas.addEventListener('mousedown', this._canvasClickHandler);
  }

  private _canvasClickHandler: ((e: MouseEvent) => void) | null = null;
  private _dialogueOpenTime = 0;

  private updatePortrait(speaker: string, portraitKey: string | null): void {
    if (!this.portraitContainer) return;
    this.portraitContainer.removeAll(true);

    // Portrait border
    const border = this.scene.add.rectangle(0, 0, PORTRAIT_SIZE + 4, PORTRAIT_SIZE + 4);
    border.setStrokeStyle(1, 0x444466);
    border.setFillStyle(0x111122, 0.8);
    this.portraitContainer.add(border);

    const textureKey = this.resolvePortraitTexture(speaker, portraitKey);
    if (textureKey) {
      const portrait = this.scene.add.image(0, 0, textureKey);
      portrait.setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE);
      this.portraitContainer.add(portrait);
    } else {
      const color = PORTRAIT_COLORS[speaker] ?? 0x666666;
      this.portraitContainer.add(
        this.scene.add.rectangle(0, 0, PORTRAIT_SIZE, PORTRAIT_SIZE, color, 0.6)
      );
      const displayName = SPEAKER_DISPLAY_NAMES[speaker] ?? speaker;
      const initial = this.scene.add.text(0, 0, displayName.charAt(0).toUpperCase(), {
        fontFamily: 'monospace', fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.portraitContainer.add(initial);
    }
  }

  private resolvePortraitTexture(speaker: string, portraitKey: string | null): string | null {
    // Try exact portrait key (e.g. "casey_friendly")
    if (portraitKey && this.scene.textures.exists(portraitKey)) {
      return portraitKey;
    }
    // Fall back to speaker's default portrait (e.g. "portrait_casey")
    const defaultKey = `portrait_${speaker}`;
    if (this.scene.textures.exists(defaultKey)) {
      return defaultKey;
    }
    return null;
  }

  private showNode(nodeId: string): void {
    const tree = this.currentTree;
    if (!tree) return;

    const node = tree.nodes[nodeId];
    if (!node) {
      console.warn(
        `Dialogue node "${nodeId}" not found in tree "${tree.id}"`,
      );
      this.endDialogue();
      return;
    }

    this.currentNode = node;
    this.clearOptions();

    // Apply side effects
    const state = GameState.getInstance();

    // flagsSet: values can be boolean or string
    if (node.flagsSet) {
      for (const [flag, value] of Object.entries(node.flagsSet)) {
        if (typeof value === 'boolean') {
          state.setFlag(flag, value);
        } else {
          // String flag value - store via setFlag cast
          // GameState.flags is Record<string, boolean> but we store string
          // values for game logic (e.g. "voss_impression": "best")
          (state as any).flags[flag] = value;
        }
      }
    }

    if (node.relationshipChanges) {
      for (const [npc, delta] of Object.entries(node.relationshipChanges)) {
        state.modifyRelationship(npc, delta);
      }
    }

    if (node.itemGiven) {
      state.addItem(node.itemGiven);
      if (this.onItemGiven) this.onItemGiven(node.itemGiven);
    }

    if (node.itemRemoved) {
      state.removeItem(node.itemRemoved);
    }

    if (node.soundEffect && this.scene.cache.audio.exists(node.soundEffect)) {
      this.scene.sound.play(node.soundEffect, { volume: 0.4 });
    }

    // tutorialTrigger: reserved for future use

    // Update portrait
    this.updatePortrait(node.speaker, node.portrait);

    // Update speaker name with color
    const displayName = SPEAKER_DISPLAY_NAMES[node.speaker] ?? node.speaker;
    const color = SPEAKER_COLORS[node.speaker] ?? '#ffffff';
    this.speakerText?.setText(displayName).setColor(color);

    // Determine typing speed: node-level typewriterSpeed on tree, or default
    const speed = tree.typewriterSpeed ?? DEFAULT_TYPING_SPEED;

    // Start typewriter
    this.startTypewriter(node.text, speed);
  }

  private startTypewriter(text: string, speed: number): void {
    this.fullText = text;
    this.displayedText = '';
    this.charIndex = 0;
    this.isTyping = true;
    this.bodyText?.setText('');

    // Start voice babble loop for current speaker
    this.stopVoiceBabble();
    if (this.currentNode) {
      const voiceKey = VOICE_KEYS[this.currentNode.speaker];
      if (voiceKey && this.scene.cache.audio.exists(voiceKey)) {
        this.voiceBabble = this.scene.sound.add(voiceKey, { loop: true, volume: 0.3 });
        this.voiceBabble.play();
      }
    }

    this.typingTimer = this.scene.time.addEvent({
      delay: speed,
      repeat: text.length - 1,
      callback: () => {
        this.displayedText += this.fullText[this.charIndex];
        this.charIndex++;
        this.bodyText?.setText(this.displayedText);

        // Text blip on non-space characters
        const ch = this.fullText[this.charIndex - 1];
        if (ch && ch !== ' ' && this.scene.cache.audio.exists('sfx_text_blip')) {
          this.scene.sound.play('sfx_text_blip', { volume: 0.1 });
        }

        if (this.charIndex >= this.fullText.length) {
          this.finishTyping();
        }
      },
    });
  }

  private stopVoiceBabble(): void {
    if (this.voiceBabble) {
      this.voiceBabble.stop();
      this.voiceBabble.destroy();
      this.voiceBabble = null;
    }
  }

  private finishTyping(): void {
    this.isTyping = false;
    this.stopVoiceBabble();
    if (this.typingTimer) {
      this.typingTimer.destroy();
      this.typingTimer = null;
    }
    this.bodyText?.setText(this.fullText);

    // Show options if there are any, otherwise wait for click to advance/end
    if (this.currentNode && this.currentNode.options.length > 0) {
      this.showOptions(this.currentNode.options);
    }
    // Terminal nodes (no options, no autoAdvance) wait for click via handleClick
  }

  private showOptions(options: PlayerOption[]): void {
    this.clearOptions();
    const cam = this.scene.cameras.main;
    const GAP = 6; // vertical gap between options

    const visible = options.filter((opt) =>
      this.checkOptionCondition(opt.condition),
    );
    if (visible.length === 0) return;

    // First pass: create texts off-screen to measure their rendered heights
    const measured: { text: Phaser.GameObjects.Text; opt: PlayerOption; h: number }[] = [];
    let totalHeight = 0;
    for (const opt of visible) {
      const text = this.scene.add.text(
        -9999, -9999,
        `\u25B8 ${opt.text}`,
        {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#aaaacc',
          wordWrap: { width: cam.width - BOX_MARGIN * 2 - 32 },
          lineSpacing: 2,
        },
      );
      const h = text.height;
      measured.push({ text, opt, h });
      totalHeight += h + GAP;
    }
    totalHeight -= GAP; // no gap after last item

    // Position options above the dialogue box
    const baseY = cam.height - BOX_HEIGHT - BOX_MARGIN - totalHeight - 10;

    // Options background
    const optBg = this.scene.add.rectangle(
      cam.width / 2,
      baseY + totalHeight / 2,
      cam.width - BOX_MARGIN * 2,
      totalHeight + 12,
      0x0a0a1a,
      0.88,
    );
    optBg.setStrokeStyle(1, 0x444466);
    this.container?.add(optBg);
    this.optionElements.push(optBg);

    // Second pass: position texts at correct Y with measured heights
    this.visibleOptions = [];
    let curY = baseY;
    for (const { text, opt, h } of measured) {
      text.setPosition(BOX_MARGIN + 16, curY);
      this.container?.add(text);
      this.optionElements.push(text);
      this.visibleOptions.push({ text, opt });
      curY += h + GAP;
    }
    this.optionsShowing = true;
  }

  private clearOptions(): void {
    for (const obj of this.optionElements) {
      obj.destroy();
    }
    this.optionElements = [];
    this.visibleOptions = [];
    this.optionsShowing = false;
  }

  private checkOptionCondition(condition?: OptionCondition): boolean {
    if (!condition) return true;

    // Empty condition object {} should pass
    const hasAny =
      condition.flags || condition.notFlags || condition.minRelationship;
    if (!hasAny) return true;

    const state = GameState.getInstance();

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

    if (condition.minRelationship) {
      for (const [npc, minVal] of Object.entries(condition.minRelationship)) {
        if (state.getRelationship(npc) < minVal) return false;
      }
    }

    return true;
  }

  private _lastClickTime = 0;

  private handleClick = (pointer: Phaser.Input.Pointer): void => {
    // Debounce: prevent double-firing
    const now = Date.now();
    if (now - this._lastClickTime < 50) return;
    this._lastClickTime = now;

    if (!this.currentTree) return;
    if (pointer.rightButtonDown()) return;

    // If options are showing, check bounds-based click on each option
    if (this.optionsShowing && this.visibleOptions.length > 0) {
      const px = pointer.x, py = pointer.y;
      const state = GameState.getInstance();

      for (const { text, opt } of this.visibleOptions) {
        const b = text.getBounds();
        if (px >= b.left && px <= b.right && py >= b.top - 2 && py <= b.bottom + 2) {
          // Play select SFX
          if (this.scene.cache.audio.exists('sfx_select')) {
            this.scene.sound.play('sfx_select', { volume: 0.25 });
          }
          // Apply option side effects
          if (opt.flagsSet) {
            for (const [flag, value] of Object.entries(opt.flagsSet)) {
              if (typeof value === 'boolean') {
                state.setFlag(flag, value);
              } else {
                (state as any).flags[flag] = value;
              }
            }
          }
          if (opt.relationshipChanges) {
            for (const [npc, delta] of Object.entries(opt.relationshipChanges)) {
              state.modifyRelationship(npc, delta);
            }
          }
          this.showNode(opt.nextNodeId);
          return;
        }
      }
      // Click was outside all options — do nothing (wait for valid option click)
      return;
    }

    if (this.isTyping) {
      this.finishTyping();
      return;
    }

    // No options visible and not typing — check autoAdvance or end
    if (this.currentNode && this.currentNode.autoAdvance) {
      this.showNode(this.currentNode.autoAdvance);
    } else {
      this.endDialogue();
    }
  };

  private endDialogue(): void {
    const treeId = this.currentTree?.id;
    this.currentTree = null;
    this.currentNode = null;
    this.isTyping = false;

    this.stopVoiceBabble();
    if (this.typingTimer) {
      this.typingTimer.destroy();
      this.typingTimer = null;
    }

    this.clearOptions();
    if (this._canvasClickHandler) {
      this.scene.game.canvas.removeEventListener('mousedown', this._canvasClickHandler);
      this._canvasClickHandler = null;
    }

    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    this.bgBox = null;
    this.portraitContainer = null;
    this.speakerText = null;
    this.bodyText = null;

    if (this.onDialogueEnd && treeId) {
      this.onDialogueEnd(treeId);
    }
  }

  destroy(): void {
    this.endDialogue();
  }
}
