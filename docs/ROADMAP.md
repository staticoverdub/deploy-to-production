# Deploy to Production — Roadmap

## What's Done

### Title Screen
- CRT boot animation with scrolling terminal lines
- Version number easter egg
- NEW GAME / CONTINUE routing with save detection
- Power-on glow, scanline overlay, phosphor fade

### Scene 1: Lobby (100%)
- Full point-and-click adventure scene with 10 hotspots
- Badge puzzle chain (catch-22 → wait for Voss → pitch → badge → turnstile)
- 3 NPCs with branching dialogue (Gladys, Mrs. Gutierrez, Director Voss)
- Inventory system: Paper Cup → Water Cooler → Cup of Water, Lost Cat Flyer
- Custom pixel art cursors (7 states), ambient life animations
- Hint system with progressive Casey inner monologue
- Hidden coffee cup behind water cooler (bonus health for Mail Cart)

### Mail Cart Gauntlet (100%)
- Side-scrolling rail shooter between Lobby and Bullpen
- 5 phases: Tutorial → Red Tape Zone → Cable Jungle → COBOL Storm → Mega Printer boss
- WASD/Arrow dodge, mouse-aimed rubber band shooting
- PixelLab sprites for all obstacles, Casey animations (idle/shoot/hit)
- ElevenLabs SFX (4 effects), Suno music track
- Coffee cup bonus health, skip option, retry screen
- Debug menu shortcuts

### Scene 2: Bullpen (60%)
- Scrolling camera (960x360), scene structure built
- 14 hotspots defined in JSON
- Priya (5 dialogue trees), Kevin (3 dialogues) written
- PixelLab sprites placed: lockers, posters, clock, fire extinguisher, wet floor sign, employee of month
- Ambient NPCs: typing woman, phone guy
- Break area with counter, coffee maker area

### Engine Systems (100%)
- GameState singleton (flags, inventory, relationships, scene data, auto-save)
- DialogueManager with branching trees, flag conditions, item gates
- HotspotManager with polygon hit areas, verb interactions
- InventoryUI with item combinations
- CursorManager (7 procedural pixel art cursors)
- NavGrid pathfinding
- DebugMenu with scene skips, state manipulation
- Save/load to localStorage

---

## What's Next

### Immediate: Finish Bullpen (Sessions 7-9)

| Task | Status | Details |
|------|--------|---------|
| Wire all 14 hotspot interactions | ~70% | Coat rack, dead printer, supply closet, war room, Casey's desk need testing |
| Puzzle chain: Prove Yourself | Partially wired | PATH A (printer fix with water) + PATH B (whiteboard analysis) |
| Supply closet puzzle | Needs wiring | Keypad code from Priya → laptop |
| End cutscene | Not started | Priya walks to Casey, auto-dialogue, camera zoom, fade to "End of Chapter 1" |
| Ambient NPC animations | Partial | Typing woman + phone guy placed, need stagger timing |
| Music crossfades | Not started | Theme → chill → puzzle thinking → end chapter swell |
| Remaining Bullpen SFX | Needed | Printer burst, keypad beep, closet unlock, laptop boot |

### Polish: Art & Audio (Session 10)

| Task | Details |
|------|---------|
| Verify all PixelLab sprites aligned to hotspot polygons | Hit area audit |
| Priya walk animation | 4-direction sprite for end cutscene |
| Kevin seated sprite refinement | Minimal animation, headphones |
| Background NPC variations | 3-4 more ambient workers |
| Dashboard TV flicker | Wall-mounted display animation |

### QA: Full Playthrough (Session 11)

- Title → Lobby → Mail Cart → Bullpen → End cutscene, every path
- Both puzzle paths (printer fix AND whiteboard analysis)
- All inventory combinations, all dialogue branches
- Save mid-Bullpen, reload, verify state
- No console errors, no freezes

### Ship: Deploy Chapter 1 (Session 12)

- `npm run build` production bundle
- GitHub Pages with auto-deploy workflow
- Meta tags, OG image
- itch.io secondary listing
- Cross-browser testing (Chrome, Firefox, Safari)

---

## Future (Post-Chapter 1)

### Episode 2: Discovery & Prototyping
- **New rooms:** Server Room, Hal's Office, Badge Office, Cafeteria, War Room
- **New characters:** Harold "Hal" Mainframe (COBOL veteran), Senator Dalton
- **New action sequences:**
  - Database migration → on-rails shooter through TRON-like datascape
  - Load testing → tower defense (API endpoints vs. traffic waves)
  - Security audit → stealth/puzzle (navigate network without tripping IDS)

### Episode 3: Ship It
- Multi-week countdown to deployment deadline
- Congressional hearing → rhythm/timing game
- Final boss: **Rex Workflow** (sentient legacy workflow engine)
- The Deploy → multi-phase boss fight
- Triumphant ending

### Stretch Goals
- Full voice acting for key characters
- Cloud saves (Supabase)
- Mobile touch controls
- Steam/itch.io release
- Accessibility: colorblind modes, text-to-speech, difficulty options

---

**Bottom line:** ~2-4 weeks from shipping Chapter 1. The Bullpen puzzle chain and end cutscene are the critical path. Everything else is polish.
