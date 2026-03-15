# Deploy to Production — PixelLab Prompts: Bullpen Characters

Use the same style reference workflow as the Lobby characters:
upload LimeZu office tileset + Casey's sprite as references.

---

## PRIYA KAPOOR (Key Ally / UX Researcher)

**Base sprite prompt:**
```
young professional woman, early 30s, South Asian, dark hair
in a loose low bun, colorful teal scarf over a dark blazer,
pen behind ear, confident posture, standing near a desk
covered in sticky notes
```

**Rotation:** Generate 4 directions (she walks to Casey's desk in the end cutscene)

**Animations:**
- idle_standing (weight shift, 2-3 frames)
- idle_at_desk (seated, typing, occasional glance, 3-4 frames)
- talking (hand gestures, expressive, 2-3 frames)
- arms_crossed (guarded pose, static)
- writing_note (handing a sticky note, transition)
- leaning_on_wall (end cutscene pose)

**Dialogue portraits (64x64 or 96x96):**
```
pixel art portrait, young South Asian woman, early 30s, dark
hair in loose bun, colorful scarf, intelligent eyes, pen
behind ear, RPG dialogue box style
```
Variants:
- sizing_up (appraising, slightly skeptical)
- wry (half-smile, knowing)
- arms_crossed (guarded, testing)
- surprised_pleased (eyebrows up, genuine)
- serious (direct gaze, leveling)
- impressed (real respect in eyes)
- half_laugh (amused despite herself)
- warm (open, trusting)
- genuine_smile (full smile, rare and earned)
- curious (head tilt, interested)
- softening (guard dropping)
- guarded (reserved, waiting to be convinced)
- really_looking (studying Casey carefully)
- leaning_back (casual, evaluating)

---

## KEVIN (Running Gag NPC)

**Base sprite prompt:**
```
office worker man, early 40s, receding hairline, large
over-ear headphones, plain white dress shirt slightly
wrinkled, seated at desk staring at monitor, completely
zoned out, zero expression
```

**NOTE:** Kevin is always seated. Never moves. Ever. No walk
cycles needed. This is fundamental to his character.

**Animations:**
- idle_seated (subtle typing, completely unaware of
  surroundings, 2-3 frames — this is his ONLY animation
  for the entire game until the finale)

**Dialogue portrait (64x64 or 96x96):**
```
pixel art portrait, office worker man, early 40s, receding
hairline, over-ear headphones, completely blank expression,
staring straight ahead, empty eyes but not menacing just
utterly disengaged, RPG dialogue box style
```
Variants:
- not_looking (default — eyes fixed on something offscreen, 
  this is used for ALL his dialogue in every scene)

NOTE: Kevin gets exactly ONE additional portrait variant,
but it's not created until the finale: "looking_up" — the
first time he ever makes eye contact. Save this for later.

---

## BACKGROUND NPCs (4-5 ambient cubicle workers)

These don't need individual portraits or dialogue. Generate
as a batch:

```
pixel art office workers, 32x32, top-down 3/4 view,
various body types and genders, seated at desks, typical
office attire, bland colors (khaki, gray, white shirts),
4-5 variations
```

**Animations needed (shared across all):**
- typing (2-3 frames, loop)
- phone_call (holding phone to ear, 2 frames)
- staring_at_screen (completely still, 1 frame)
- look_toward_printer (brief head turn, 2 frames — used
  for the printer fix event, then returns to idle)

---

## FILE NAMING CONVENTION

Sprites:
  priya_idle_standing.png
  priya_idle_at_desk.png
  priya_walk_sheet.png
  priya_arms_crossed.png
  kevin_idle_seated.png
  bg_npc_typing_1.png through bg_npc_typing_5.png
  bg_npc_look_printer.png (shared reaction)

Portraits:
  portrait_priya_sizing_up.png
  portrait_priya_wry.png
  portrait_priya_impressed.png
  portrait_priya_genuine_smile.png
  portrait_kevin_not_looking.png

Drop everything into: src/assets/sprites/characters/
and: src/assets/sprites/portraits/
