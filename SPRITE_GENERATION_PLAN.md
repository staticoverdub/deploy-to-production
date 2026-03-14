# Sprite Generation Plan — PixelLab MCP

## Status: WAITING FOR MCP RECONNECT

Restart Claude Code to activate the PixelLab MCP server, then resume this plan.

## Style Reference
Look at the LimeZu tilesets in `src/assets/tilesets/` before generating — match that style:
- `Room_Builder_32x32.png` and `Room_Builder_Office_32x32.png` for environment style
- `Modern_Office_Black_Shadow_32x32.png` for object style
- Premade characters in `src/assets/sprites/characters/premade/` for character proportions
- 32x32 tiles, top-down 3/4 RPG perspective, pixel art

## Characters to Generate

### 1. Casey Park (Protagonist) — PRIORITY
- **Size:** 32x32, top-down 3/4 RPG perspective
- **Look:** Young professional, late 20s, short dark hair. Blue button-up shirt with rolled sleeves, dark pants. Empty lanyard around neck, laptop messenger bag slung over shoulder
- **Animations needed:**
  - 4-directional walk cycle (up/down/left/right)
  - Idle animation (front-facing)
- **Save to:** `src/assets/sprites/characters/casey_walk.png` (spritesheet) and `casey_idle.png`
- **Creative note:** Think LucasArts protagonist energy — curious, slightly out of place, relatable

### 2. Gladys Chen (Security Guard) — PRIORITY
- **Size:** 32x32, front-facing only (she sits behind the desk the entire scene)
- **Look:** Older woman, late 50s, dark hair in a bun. Navy security uniform. Reading glasses on a chain around her neck. Deadpan expression.
- **Animations needed:**
  - Seated idle (doing crossword)
  - Seated talking (slight head movement or gesture)
- **Save to:** `src/assets/sprites/characters/gladys_idle.png`, `gladys_talk.png`

### 3. Mrs. Gutierrez (Waiting Citizen)
- **Size:** 32x32, front-facing only (seated in waiting chairs)
- **Look:** Older woman, early 60s, silver-streaked dark hair. Cardigan over blouse. Manila folder on her lap. Patient expression.
- **Animations needed:**
  - Seated idle only
- **Save to:** `src/assets/sprites/characters/mrs_g_idle.png`

### 4. Director Voss (Authority Figure)
- **Size:** 32x32, top-down 3/4 RPG perspective
- **Look:** Mid 50s, sharp blonde bob haircut, dark charcoal pantsuit. Carrying a travel coffee mug in one hand and a stack of folders. Radiates competence and urgency.
- **Animations needed:**
  - 4-directional walk cycle (she walks into the scene)
  - Idle animation (front-facing, standing)
- **Save to:** `src/assets/sprites/characters/voss_walk.png`, `voss_idle.png`

## Dialogue Portraits (Phase 2 — after characters)
- 56x56 (or 64x64) portrait close-ups for the dialogue box
- Casey: neutral, friendly, frustrated, thinking, determined, sheepish, amused
- Gladys: neutral, deadpan, surprised, slight_smile, looking_up, leaning_in
- Mrs. G: smiling, warm, tired, showing_folder
- Voss: checking_watch, impressed, commanding, brisk, eyebrow_raise

## Environment Tiles (Phase 3 — if time)
- May not need custom tiles — LimeZu office pack covers most of it
- Potential custom pieces: D.A.S.H. lobby-specific items (the "Now Serving 847" display, the motivational poster, the sad plant)

## Integration Notes
- After downloading sprites, update `LobbyScene.ts` to preload and use them
- Update `Player.ts` to use Casey's spritesheet instead of colored rectangle
- Update NPC drawing in `LobbyScene.drawNPCs()` to use sprite images
- Update `DialogueManager.ts` portrait rendering to use portrait sprites
- Phaser spritesheet loading: `this.load.spritesheet('casey_walk', path, { frameWidth: 32, frameHeight: 32 })`

## PixelLab API Notes (from docs)
- `create_character` — generates character with directional views (params: description, n_directions, size, proportions)
- `animate_character` — queues animation for existing character (params: character_id, template_animation_id)
- `get_character` — retrieves sprites + download links
- Non-blocking: create → queue animations → check status later → download when ready
