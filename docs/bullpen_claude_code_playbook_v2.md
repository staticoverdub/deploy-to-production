# Deploy to Production — Claude Code Playbook: Scene 2 (The Bullpen)
# REVISED v2 — Incorporates all Lobby bug fixes and lessons learned

---

## Prerequisites

Before starting, confirm:
- Scene 1 (Lobby) fully working — all hotspots, dialogues, items, 
  intro cutscene, badge puzzle, scene transition
- The dialogue "click to dismiss" fix is solid — picking up ANY item
  in the Lobby does not freeze the game
- The hitAreaCallback error is fixed — zero console errors on mouse move
- Custom cursor working (no system cursor visible)

Drop these files into the project:
- bullpen_priya_v2.json -> src/data/dialogues/priya.json
- bullpen_kevin.json -> src/data/dialogues/kevin.json
- bullpen_hotspots_v2.json -> src/data/hotspots/bullpen.json
- bullpen_items_v2.json -> src/data/bullpen_items.json
- Bullpen scene spec -> docs/Deploy_to_Production_Bullpen_Scene_Spec.docx

NOTE: Use the v2 files, not the originals. The v2 files have critical
fixes for bugs discovered during the Lobby build.

---

## Session 6: Bullpen Scene + Scrolling Camera

### Prompt 6.1: Build the scene

```
Continuing Deploy to Production. Review the entire codebase
to understand the current engine, especially how the Lobby
scene loads hotspots, dialogues, and handles interactions.
Then read the Bullpen scene spec at
docs/Deploy_to_Production_Bullpen_Scene_Spec.docx.

Build the Bullpen scene in src/scenes/BullpenScene.ts.
This is the first SCROLLING scene.

SCROLLING CAMERA SETUP:
- Scene dimensions: 960x360 (1.5x wider than Lobby)
- Load camera settings from the bullpen.json hotspot data
  (it has a cameraSettings field with deadZone, lerpX, bounds)
- Camera follows Casey with:
  Dead zone: 200px wide
  Lerp: 0.1 for smooth follow
  Bounds clamped to 0,0,960,360
- Casey spawns at x:60, y:200

BUILD THE ROOM using LimeZu tilesets or placeholders:
- Wide beige linoleum floor (same style as Lobby)
- Rows of gray cubicles across the middle
- Break area center (counter with appliances)
- Glass-walled War Room right side
- Hallway exit far right (locked, for future)
- Coat rack near the entrance far left
- Supply closet with keypad lock, left-center
- DAY 1 OF 90 banner on background wall
- Dashboard TV on background wall showing red numbers

PLACE ALL NPCs:
- Priya: standing/seated at her desk, right-center
- Kevin: seated in cubicle with headphones, left-center
- 4-5 background NPCs in cubicles (simple idle anims:
  typing, phone call, staring at screen)
- Background NPCs are NOT interactive — they only respond
  with generic fallback lines from the hotspot JSON

SCENE TRANSITION FROM LOBBY:
- When player uses badge on turnstile in Lobby, horizontal
  wipe (left to right) to BullpenScene
- Carry forward ALL inventory items from Scene 1
- Remove temporary_badge from inventory on scene enter
- Cup of Water and Lost Cat Flyer should persist if the
  player picked them up

WALKABLE AREA:
- Define walkable floor bounds just like the Lobby
  (bottom 55-60% of screen only — Casey cannot walk
  on walls or through furniture)
- Add collision rectangles for all furniture: cubicles,
  desks, break counter, supply closet door, War Room wall
- Use the same navgrid/A* pathfinding from the Lobby

CRITICAL — APPLY LOBBY FIXES FROM THE START:
- Hotspot hit areas must use valid Phaser.Geom objects
  with proper Contains callbacks (the hitAreaCallback bug)
- Do NOT call setInteractive() on the custom cursor sprite
- All single-line dialogue responses (hotspot examine,
  item pickup) MUST dismiss on click — same terminal node
  fix from the Lobby
- The custom cursor and cursor:none CSS must work in this
  scene too (it's global, but verify)

Test: Casey walks around the full 960px width with smooth
camera scrolling. No console errors.
```

---

## Session 7: Wire All Content

### Prompt 7.1: Wire hotspots, dialogues, and items

```
Continuing Deploy to Production. Review the codebase.

The Bullpen data files are already in src/data/. Wire them
into the scene using the SAME patterns as the Lobby. The
data format is identical.

HOTSPOTS (src/data/hotspots/bullpen.json):
- 14 hotspots total (11 objects + Kevin + Priya NPC +
  Priya's desk as a separate lookable object)
- Load and create them the same way as Lobby hotspots
- Hotspot hit areas should derive from sprite bounds
  where possible (the Lobby fix), not hardcoded polygons
- Wall-mounted hotspots (dashboard TV, Day 90 banner):
  Casey walks to floor below them, then interacts
- The hotspot JSON has cameraSettings and sceneWidth
  fields — use these for camera setup

DIALOGUES:
- src/data/dialogues/priya.json has 5 conversation trees:
  1. priya_first_meeting (main branching conversation)
  2. priya_after_proof_whiteboard (after whiteboard insight)
  3. priya_after_proof_printer (after fixing printer)
  4. priya_gives_code (after proving yourself)
  5. priya_default (fallback after getting the code)

- src/data/dialogues/kevin.json has 3 sequential convos:
  1. kevin_talk_1 (first attempt)
  2. kevin_talk_2 (second attempt)
  3. kevin_talk_3 (gives up, internal monologue)

PRIYA CONVERSATION SELECTION LOGIC:
When the player clicks Talk To on Priya, select the
conversation based on current game state flags:
  - met_priya == false -> "priya_first_meeting"
  - priya_test_active AND whiteboard_insight AND NOT
    prove_yourself_complete -> "priya_after_proof_whiteboard"
  - priya_test_active AND printer_fixed AND NOT
    prove_yourself_complete -> "priya_after_proof_printer"
  - prove_yourself_complete AND NOT has_supply_code ->
    "priya_gives_code"
  - has_supply_code == true -> "priya_default"

Each conversation tree has a triggerCondition field that
specifies which flags are required. Use this to determine
which tree to activate.

KEVIN CONVERSATION SELECTION:
Sequential based on flags:
  - kevin_talked_1 == false -> "kevin_talk_1"
  - kevin_talked_1 AND NOT kevin_talked_2 -> "kevin_talk_2"
  - kevin_talked_2 == true -> "kevin_talk_3"

ITEMS (src/data/bullpen_items.json):
- Merge with existing item registry. New items:
  faded_password_note, umbrella, supply_closet_code, laptop
- The coat rack gives faded_password_note (look twice) and
  umbrella (pickup verb)
- supply_closet_code comes from Priya dialogue (itemGiven)
- laptop comes from supply closet interaction (itemGiven)

CRITICAL ITEM PICKUP WARNING:
The priya_gives_code conversation ends with a terminal node
that has itemGiven: "supply_closet_code". This is the EXACT
pattern that caused the Lobby freeze bug. The dialogue
system MUST handle this: show the text, add item to
inventory, then wait for click to dismiss. Verify this
works BEFORE moving on. Same for the supply closet giving
the laptop.

HINT SYSTEM:
Load hintMessages from the bullpen.json file. Same timer
logic as Lobby — show hint after 60 seconds of no progress.
Determine state from flags:
  - No needs_computer -> ENTER
  - needs_computer, no met_priya -> NO_COMPUTER
  - priya_test_active, no prove_yourself_complete ->
    PROVE_WHITEBOARD or PROVE_PRINTER
  - prove_yourself_complete, no has_supply_code -> CODE_GET  
  - has_laptop -> LAPTOP_GET

CHARACTER VOICES:
- Priya needs a babble voice. Generate via ElevenLabs:
  "Young woman voice mumbling enthusiastic nonsense
  syllables, passionate and animated, like ba-da-na-ba,
  mid-high pitch, energetic rhythm, 2 seconds"
  Save to src/assets/audio/sfx/voices/voice_priya.mp3
- Kevin already has a babble voice defined
- Wire Priya and Kevin babble to dialogue system same as
  Lobby characters

FOOTSTEPS:
- Casey's footsteps from the Lobby should carry over
- Kevin and background NPCs don't walk so no footsteps
- Priya walks in the end cutscene — use a sensible shoes
  footstep (similar to Casey's sneakers but slightly
  different pitch)

Test: click on every hotspot, talk to Kevin all 3 times,
talk to Priya through the first meeting conversation.
No freezes. No console errors. All dialogues dismiss
properly on terminal nodes.
```

---

## Session 8: Puzzle Chain + Events

### Prompt 8.1: Both proof paths

```
Continuing Deploy to Production. Review the codebase.

Wire the two proof paths and the printer event:

PATH A — FIX THE PRINTER (requires Cup of Water from Lobby):
1. Player uses cup_of_water on dead_printer hotspot
2. The "use_cup_of_water" interaction fires:
   - cup_of_water removed from inventory
   - Casey's line displays
   - printer_fixed flag set
3. PRINTER EVENT: after Casey's line dismisses:
   - Play printer sound effect (generate via ElevenLabs:
     "office printer suddenly roaring to life, mechanical
     whirring, papers printing rapidly, 3 seconds")
   - All background NPCs briefly turn heads toward printer
     (sprite frame change, hold 1.5 seconds, return to idle)
   - One background NPC shows floating text above head:
     "Hey, new person fixed the printer!" (fade after 3 sec)
   - This is a triggerEvent: "bullpen_printer_reaction" in
     the hotspot data — wire this as a custom event handler
4. Next time player talks to Priya, the conversation
   selection logic picks "priya_after_proof_printer"

PATH B — ANALYZE THE WHITEBOARD (no items needed):
1. Player examines Priya's desk with Look At
2. First look sets examined_priya_whiteboard flag
3. There is a sub-interaction "look__whiteboard" that
   shows the whiteboard description
4. If priya_test_active AND examined_priya_whiteboard
   are both true, a THIRD look interaction becomes
   available: "look__whiteboard_deep"
5. This deep examination sets whiteboard_insight flag
6. Next time player talks to Priya, the conversation
   selection logic picks "priya_after_proof_whiteboard"

BOTH paths end with prove_yourself_complete being set
inside the Priya dialogue (not in the hotspot — the flag
is set in the dialogue JSON nodes).

NEW ENGINE FEATURES NEEDED:
- triggerEvent field on hotspot interactions: when present,
  fire a named event that the scene listens for and handles
  with custom logic (the printer reaction)
- Sub-hotspot deep examination: the whiteboard needs 3
  levels of Look At interaction. The condition system
  already handles this — just make sure the interaction
  selector checks conditions and picks the most specific
  matching interaction.

Test BOTH paths independently:
- Save before talking to Priya about the test
- Complete via printer with Cup of Water -> talk to Priya
- Reload save -> complete via whiteboard analysis -> talk
  to Priya
- Both should end with Priya saying "you did the thing"
```

### Prompt 8.2: Supply closet and end cutscene

```
Continuing Deploy to Production. Review the codebase.

Wire the final puzzle sequence and end-of-chapter cutscene:

SUPPLY CLOSET:
1. After prove_yourself_complete, talking to Priya triggers
   "priya_gives_code" conversation
2. That conversation's terminal node has
   itemGiven: "supply_closet_code" — verify this works
   without freezing (click to dismiss after item given)
3. Player uses supply_closet_code on supply_closet hotspot
4. The "use_supply_closet_code" interaction fires:
   - supply_closet_code removed from inventory
   - laptop added to inventory  
   - Casey's line about government displays
   - has_laptop flag set
5. Again: this node has BOTH itemRemoved AND itemGiven.
   Make sure the dialogue dismisses on click afterward.

END CUTSCENE:
Triggered when player uses laptop on casey_desk hotspot.
The hotspot interaction has triggerCutscene: "bullpen_end".

Wire this as a new cutscene handler. When triggered:

1. Disable all player input
2. Casey walks to his desk (auto-pathfind)
3. Casey places laptop animation (or just swap desk sprite
   to include an open laptop)
4. Desk lamp flickers, Casey taps it, it turns on
   (simple sprite swap or tween)
5. Casey sits down, starts typing animation
6. Pause 2 seconds
7. Priya walks from her desk to Casey's cubicle wall
   (use walk system, auto-pathfind to target point)
8. Play Priya footstep sounds during walk
9. Priya stops, leaning pose
10. Dialogue plays automatically (NOT player-triggered):
    - Priya: "First commit?" [priya_genuine_smile portrait]
    - Casey: "Just setting up the dev environment. But
      yeah... first commit incoming." [casey_determined]
    - Priya: "Welcome to D.A.S.H., Casey. For real this
      time." [priya_genuine_smile portrait]
11. Each line auto-advances after 3 seconds (no player
    click needed — this is a cutscene, not a conversation)
12. Camera slowly zooms out over 3 seconds
    (camera.zoomTo(0.85, 3000))
13. DAY 1 OF 90 banner should be visible in the zoomed
    out view
14. Fade to black over 2 seconds (camera.fadeOut(2000))
15. On black screen, show centered text:
    "End of Chapter 1: Onboarding"
16. Hold 3 seconds
17. Replace with: "Chapter 2: Discovery — Coming Soon"
18. Hold 3 seconds
19. If end_chapter music is loaded, it plays during steps
    10-18 at volume 0.5 (louder than background music)
20. Fade to title screen or show a simple credits screen

Auto-save game state after cutscene completes.

Test the full sequence. It should feel like a small,
earned, warm moment — not rushed.
```

---

## Session 9: Ambient Life + Audio

### Prompt 9.1: Bullpen ambient animations

```
Continuing Deploy to Production.

Add ambient life to the Bullpen scene, same philosophy
as the Lobby — subtle background animation that makes
the world feel alive. Use PixelLab to generate sprite
sheet animations (NOT code tweens — we learned this in
the Lobby).

GENERATE AND WIRE:

1. Background NPC idle animations (sprite sheets):
   - NPC typing: 3-4 frame loop at 4fps
   - NPC on phone: 2-3 frame loop at 3fps  
   - NPC staring at screen: static (1 frame, they just
     sit there — this IS the animation)
   Generate 4-5 variations via PixelLab.

2. Coffee maker: "brew" light blinks orange, 2 frames,
   0.5s on, 0.5s off, infinite loop

3. Dashboard TV: subtle screen flicker, numbers all red,
   occasional refresh animation (4 frames, triggered
   every 20-30 seconds)

4. Fluorescent light flicker: same as Lobby, random
   interval, subtle brightness change on ceiling area

5. Priya idle at desk: writing, glancing at whiteboard,
   writing again. 6-8 frames, loop. She's always working.

6. Kevin idle: typing with zero expression. 2-3 frames.
   The most minimal animation possible. He barely moves.
   This is intentional.

All animations: stagger start times with random offsets.
Load as Phaser spritesheets with anims.create().
4-6fps for idle loops. Do NOT use tweens.
```

### Prompt 9.2: Wire Bullpen music and SFX

```
Continuing Deploy to Production.

Wire the Bullpen audio:

MUSIC (files in src/assets/audio/music/):
- bullpen_theme: plays on scene enter, loop, volume 0.3
- bullpen_chill: crossfade to this when met_priya flag
  is set (1.5s crossfade)
- puzzle_thinking: crossfade when priya_test_active is
  set (1.5s crossfade)
- end_chapter: plays during end cutscene, volume 0.5,
  does NOT loop

Crossfade music on scene transition from Lobby (lobby
music fades out over 1s, bullpen music fades in over 1s).

SFX:
- Reuse existing SFX from Lobby where applicable
  (ui_click, text_blip, select, etc.)
- Generate via ElevenLabs if not already done:
  "Office printer roaring to life, paper burst" ->
  sfx_printer_burst.mp3
  "Keypad button press, electronic beep, single digit" ->
  sfx_keypad_press.mp3
  "Supply closet door unlocking and opening, metal door
  with click" -> sfx_closet_open.mp3
  "Laptop opening and booting up, brief startup chime" ->
  sfx_laptop_open.mp3

Save to src/assets/audio/sfx/
```

---

## Session 10: Art Swap + Polish

### Prompt 10.1: Replace placeholders with real art

```
Continuing Deploy to Production.

Replace all placeholder art in the Bullpen with real
pixel art, same approach as the Lobby art swap:

BACKGROUND (960x360, scrolling):
Build with LimeZu Modern Office and Modern Interiors
tilesets:
- Open office floor, beige linoleum (same as Lobby)
- Rows of cubicles with varying personal items
- Break area center (counter, coffee maker, microwave,
  mini fridge)
- Glass-walled War Room right side with visible
  whiteboard inside
- Hallway exit far right with door
- Supply closet with keypad, left-center
- Coat rack near entrance, far left
- DAY 1 OF 90 banner on wall
- Dashboard TV on wall

CHARACTERS (from src/assets/sprites/characters/):
- Casey: same sprites as Lobby (already loaded globally)
- Priya: generated via PixelLab prompts (see
  pixellab_bullpen_prompts.md)
- Kevin: seated, headphones, zero expression
- Background NPCs: 4-5 typing/phone variations

CUSTOM OBJECTS (generate via PixelLab if not already done):
- Dead printer with paper jam indicator and queue display
- Coffee maker with orange brew light
- Microwave with passive-aggressive sign
- Mini fridge with name labels
- Supply closet door with keypad
- Coat rack with jacket and umbrella
- Dashboard TV showing red metrics
- DAY 1 OF 90 banner
- War Room glass wall with sprint board visible inside
- Casey's empty desk (lamp, sticky note, no computer)
- Casey's desk WITH laptop (variant for after placement)

IMPORTANT — LEARNED FROM LOBBY:
- After placing sprites, update hotspot hit areas to
  match actual sprite bounds (use getBounds(), not
  hardcoded polygons)
- Furniture needs collision rectangles in the navgrid
- NPCs that are seated need sprites WITHOUT built-in
  chairs (layer them on top of furniture sprites, like
  we did with Mrs. Gutierrez)
- Test every hotspot click after the art swap to confirm
  hit areas still align
```

---

## Session 11: Full Playthrough Test

### Prompt 11.1: End-to-end test

```
Do a COMPLETE playthrough test of the entire game from
title screen through end of Chapter 1. Check every item
on this list:

TITLE SCREEN:
- CRT boot animation plays
- Version number gag works
- NEW GAME is clickable
- Boot sequence scrolls properly, clears, shows
  "PRESS ANY KEY TO REPORT FOR DUTY"
- CRT power-off animation plays
- Transitions to Lobby

LOBBY:
- Intro cutscene: Casey walks in, thought bubbles display,
  player can skip by clicking
- All 10 hotspots respond to Look At, Use, Pick Up
- Right-click verb wheel works on all hotspots and never
  gets stuck or clips off screen
- Gladys conversation 1: all 3 options work, crossword
  path sets rapport
- Gladys conversation 2: all 4 options work, conditional
  options appear correctly
- Mrs. Gutierrez conversation works, sets talked_to_mrs_g
- Voss spawns after conditions met, all 3 pitch options
  work
- Badge acquisition: item given, dialogue dismisses
- Paper cup from Gladys, fill at water cooler -> cup of
  water
- Lost cat flyer from bulletin board
- Badge on turnstile: transition to Bullpen
- Ambient animations playing (plant, water cooler, 847
  display, Gladys crossword)
- Music plays and loops
- No console errors
- No freezes on any item pickup

BULLPEN:
- Scene loads with carried-over items (cup of water, lost
  cat flyer)
- Temporary badge removed from inventory
- Camera scrolls smoothly
- All 14 hotspots respond correctly
- Kevin: all 3 dialogue stages work
- Coat rack: faded password note (look twice), umbrella
  (pickup)
- Priya first meeting: all option branches work,
  conditional options appear based on Lobby flags
  (whiteboard examined, dashboard seen, Mrs. G talked to)
- PATH A: examine whiteboard -> deep examination after
  priya_test_active -> talk to Priya -> proves yourself
- PATH B: use cup_of_water on printer -> printer event
  (NPC reactions, floating text) -> talk to Priya ->
  proves yourself
- Priya gives supply closet code (dialogue dismisses
  after item given — NO FREEZE)
- Supply closet: use code -> laptop given (NO FREEZE)
- Laptop on desk -> end cutscene triggers
- End cutscene plays fully: Casey sits, Priya walks over,
  dialogue, camera zoom, fade, chapter end text
- Music crossfades at correct moments
- End chapter music plays during cutscene
- Auto-save after completion

GLOBAL:
- Zero console errors throughout
- Custom cursor works in all scenes (no system cursor)
- No black bars above game canvas
- Save/load works: save in Bullpen, reload, state persists
- CONTINUE from title screen loads saved state correctly

Fix EVERYTHING that's broken before deploying.
```

---

## Session 12: Deploy

### Prompt 12.1: Production build

```
Build the game for production:

1. npm run build
2. Serve dist/ locally and test
3. index.html meta tags:
   - Title: "Deploy to Production - A Code for America
     Adventure"
   - og:title, og:description for social sharing
   - og:image placeholder
4. All asset paths must be relative
5. Test on Chrome, Firefox, Safari, mobile Chrome

Report total bundle size. If over 15MB, compress PNGs
and optimize audio (convert WAV to MP3 if any, reduce
bitrate on ambient loops).
```

### Prompt 12.2: GitHub Pages deploy

```
Set up GitHub Pages:

1. Init git repo if needed
2. Create .github/workflows/deploy.yml:
   - Trigger on push to main
   - Build with npm run build
   - Deploy dist/ to GitHub Pages
3. Add .nojekyll file
4. Create README.md:
   - Game title + description
   - Screenshot (take one from the game)
   - "Play now" link
   - Tech stack: Phaser 3, TypeScript, Vite
   - Asset credits: LimeZu, PixelLab, ElevenLabs, Suno
   - License
5. Push and deploy
6. Test the live URL works
```

---

## Quick Reference: File Locations

```
DATA FILES:
src/data/dialogues/priya.json      <- Priya's 5 conversation trees (v2)
src/data/dialogues/kevin.json      <- Kevin's 3 sequential talks
src/data/hotspots/bullpen.json     <- 14 hotspots + camera config (v2)
src/data/bullpen_items.json        <- 4 new items (v2)

DOCS:
docs/Deploy_to_Production_Bullpen_Scene_Spec.docx

SPRITE PROMPTS:
pixellab_bullpen_prompts.md

AUDIO TO GENERATE:
- Priya babble voice (ElevenLabs)
- Printer burst SFX (ElevenLabs)
- Keypad press SFX (ElevenLabs)
- Closet open SFX (ElevenLabs)
- Laptop open SFX (ElevenLabs)
- Priya footstep (ElevenLabs)
- Bullpen theme (Suno)
- Bullpen chill (Suno)
- Puzzle thinking (Suno)
- End chapter (Suno)
```

---

## Lobby Bugs to Watch For (Don't Repeat These)

1. **Item pickup freeze**: Any dialogue node with itemGiven
   and autoAdvance:null MUST dismiss on click. Test every
   item pickup immediately.

2. **hitAreaCallback crash**: All setInteractive() calls must
   use valid Phaser.Geom objects with Contains callbacks.
   Never pass undefined or invalid objects.

3. **Cursor sprite blocking input**: The custom cursor must
   NEVER have setInteractive(). It's purely visual.

4. **Dialogue options not clickable**: Use scene-level
   pointerdown with bounds checking, not per-object
   interactive handlers.

5. **Hotspot misalignment**: Derive hit areas from sprite
   bounds, not hardcoded coordinates. Use debug mode (D key)
   to verify.

6. **Verb wheel edge clipping**: Clamp wheel position inside
   canvas bounds. Add escape/timeout to close stuck wheels.

7. **Texture key duplication**: Check textures.exists() before
   creating. Load shared textures once in Boot scene.
