/**
 * Room-type + mood composition strings for AI Room image generation.
 * Combined in buildAiRoomFullPrompt with products + shared Nigerian/layout/quality blocks.
 */

export type AiRoomMoodId = 'afro_luxe' | 'warm_earthy' | 'minimal_lagos' | 'bold_colourful';

export const NIGERIAN_ROOM_CONTEXT = `Nigerian home context throughout:
POP tray ceiling with recessed lighting.
Large format ceramic or porcelain tiles.
Casement windows with aluminium frames.
One split unit AC on upper wall only — do not duplicate.
Warm recessed ceiling lighting.`;

export const LAYOUT_INSTRUCTION = `Keep the room's original architecture exactly — walls, floor, windows, ceiling height, doors, dimensions.
Do not add or remove walls or doors.
Do not change window positions or sizes.
Do not duplicate the AC unit.`;

export const QUALITY_INSTRUCTION = `Shot quality: Architectural Digest / Vogue Living editorial standard.
Sony A7R V.
Every surface must have tactile realism — fabric weave visible, wood grain present, wall texture tangible, ceramic tiles reflective.
Warm natural light from windows.
No flat or plastic-looking surfaces.
Photorealistic, not illustrated.`;

const LIVING_ROOM: Record<AiRoomMoodId, string> = {
  afro_luxe: `Reimagine this living room as a premium Afro-luxe Nigerian space.

WALL TREATMENT:
One feature wall in deep navy or charcoal with slim vertical batten panels floor to ceiling. One large bold Nigerian figurative painting centred on the feature wall in a thick gold or black frame. Two slim brass picture lights mounted above the painting. Remaining walls warm white.

FURNITURE:
One large dark sofa — charcoal, navy or deep brown velvet — against the feature wall, seats 3.
One accent chair in complementary dark tone flanking the sofa.
One oval or round dark coffee table centred in the seating arrangement.
All front legs of furniture on the rug.

FLOOR:
One large area rug in dark tones or deep jewel colour anchoring all seating. Significant tile border visible on all sides.

LIGHTING:
One statement pendant light or sputnik chandelier centred on ceiling.
Warm amber recessed lighting.

CURTAINS:
Floor length curtains in deep velvet — navy, charcoal or forest green. Hung from ceiling height to floor.

ACCESSORIES:
One tall potted plant in dark ceramic pot in corner.
Brass decorative objects on any console surface.
Minimal — every object intentional.

Do not add a second AC unit.
Do not add more than one coffee table.
Do not change window positions or sizes.`,

  warm_earthy: `Reimagine this living room as a warm earthy Nigerian space.

WALL TREATMENT:
One feature wall in terracotta or warm clay smooth plaster. One botanical or figurative painting in natural wood frame centred on feature wall. Remaining walls warm white or cream.

FURNITURE:
One large cream or warm beige upholstered sofa against main wall, seats 3, clean lines no tufting.
One natural rattan or woven accent chair flanking the sofa.
One set of nested natural wood coffee tables centred in arrangement.
All front legs of furniture on rug.

FLOOR:
One large jute or wool area rug in cream or natural tones.
Significant tile border on all sides.

LIGHTING:
One natural rattan or woven pendant light hanging from ceiling centre.
Warm Edison bulb clearly visible.

CURTAINS:
Floor length linen or cotton curtains in warm cream or terracotta tone.
Hung from ceiling height to floor.
Sheer white layer behind.

ACCESSORIES:
One large ceramic floor vase or tall tropical plant in terracotta pot.
Woven basket. Natural wood objects.
Warm and organic throughout.

Do not add a second AC unit.
Do not add more than one coffee table.`,

  minimal_lagos: `Reimagine this living room as a minimal Lagos Nigerian space.

WALL TREATMENT:
All walls clean warm white smooth plaster. One large abstract painting the only colour accent — thin black frame, hung precisely centred on main wall at exact eye level. One round or oval mirror on the side wall.

FURNITURE:
One large neutral sofa in cream light grey or white, clean lines, no tufting, seats 3.
One statement accent chair in contrasting neutral tone.
One marble or stone coffee table centred in arrangement.
All front legs of furniture on rug.

FLOOR:
One thin area rug in cream or light grey. All four sides of rug visible with tile border.

LIGHTING:
One architectural pendant light or sputnik chandelier.
Clean white or soft neutral light.

CURTAINS:
Floor length sheer white curtains.
Simple and clean.

ACCESSORIES:
Maximum 3 decorative objects total.
One architectural plant — snake plant or fiddle leaf fig. Nothing else.

Do not add a second AC unit.
Do not add more than one coffee table.`,

  bold_colourful: `Reimagine this living room as a bold colourful Nigerian space.

WALL TREATMENT:
One feature wall in a strong colour — deep teal, burnt orange or rich mustard yellow.
Smooth plaster finish.
One large scale abstract artwork in bold colours on feature wall.
Remaining walls warm white.

FURNITURE:
One statement velvet sofa in a colour that complements the wall:
If wall teal → sofa mustard or rust
If wall orange → sofa teal or green
If wall mustard → sofa teal or burgundy
One or two accent chairs in a third complementary colour.
One sculptural coffee table.
All front legs of furniture on rug.

FLOOR:
One patterned area rug with colours tying all furniture together.

LIGHTING:
One dramatic sculptural pendant.
Warm lighting throughout.

CURTAINS:
Floor length curtains in a bold complementary tone.

ACCESSORIES:
Mixed cushions with complementary patterns. Tall plant. Coloured ceramic vases. Bold but intentional.

Do not add a second AC unit.
Do not add more than one coffee table.`,
};

const BEDROOM: Record<AiRoomMoodId, string> = {
  afro_luxe: `Reimagine this bedroom as a premium Afro-luxe Nigerian space.

WALL TREATMENT:
Headboard wall in deep navy or charcoal smooth plaster or upholstered fabric panels.
One large Nigerian portrait painting above or beside the bed.
Remaining walls warm white.

FURNITURE:
One king or queen bed with upholstered headboard in dark fabric, centred against headboard wall.
Two matching dark wood bedside tables.
One upholstered bench at foot of bed.

FLOOR:
One large plush rug under lower half of bed and beside tables.

LIGHTING:
Two bedside table lamps in brass.
One statement ceiling pendant or chandelier.

CURTAINS:
Floor length velvet curtains in deep navy or forest green.

Do not add a second AC unit.`,

  warm_earthy: `Reimagine this bedroom as a warm earthy Nigerian space.

WALL TREATMENT:
Headboard wall in dusty sage or warm terracotta. Botanical artwork in natural wood frame above bed.
Remaining walls warm white or cream.

FURNITURE:
One bed with natural linen or boucle upholstered headboard.
Two natural wood bedside tables.

FLOOR:
One large natural jute or wool rug under lower half of bed.

LIGHTING:
Two warm bedside lamps.
One rattan pendant above centre.

CURTAINS:
Floor length linen in warm cream or sage tone.

Do not add a second AC unit.`,

  minimal_lagos: `Reimagine this bedroom as a minimal Lagos Nigerian space.

WALL TREATMENT:
All walls clean warm white.
One large abstract artwork above bed.
Simple oval mirror on side wall.

FURNITURE:
One platform bed, clean lines, light wood or white upholstered.
Two minimalist bedside tables.

FLOOR:
One thin neutral rug beside bed.

LIGHTING:
Two simple bedside lamps.
One architectural ceiling pendant.

CURTAINS:
Floor length sheer white curtains.

Do not add a second AC unit.`,

  bold_colourful: `Reimagine this bedroom as a bold colourful Nigerian space.

WALL TREATMENT:
Headboard wall in a bold colour — deep teal, mustard or emerald green.
One large bold artwork above bed.
Remaining walls warm white.

FURNITURE:
One upholstered bed in a complementary rich tone.
Two bedside tables in contrasting colour or material.

FLOOR:
One patterned rug beside bed.

LIGHTING:
Two statement bedside lamps.
One dramatic ceiling pendant.

CURTAINS:
Floor length curtains in bold complementary tone.

Do not add a second AC unit.`,
};

const DINING_ROOM: Record<AiRoomMoodId, string> = {
  afro_luxe: `Reimagine this dining room as a premium Afro-luxe Nigerian space.

WALL TREATMENT:
One feature wall in deep navy or charcoal. One large artwork on feature wall in gold frame.
Remaining walls warm white.

FURNITURE:
One rectangular or oval dining table in dark wood or marble top.
4-6 upholstered dining chairs in dark velvet or leather.

LIGHTING:
One dramatic pendant or chandelier directly above dining table centre.

CURTAINS:
Floor length velvet curtains.

Do not add a second AC unit.`,

  warm_earthy: `Reimagine this dining room as a warm earthy Nigerian space.

WALL TREATMENT:
One feature wall in terracotta.
Botanical artwork in natural frame.
Remaining walls warm white.

FURNITURE:
One natural wood dining table seats 4-6.
Boucle or fabric dining chairs in cream or warm tone.

LIGHTING:
One woven rattan pendant above table.

CURTAINS:
Floor length linen curtains in warm cream or earthy tone.

Do not add a second AC unit.`,

  minimal_lagos: `Reimagine this dining room as a minimal Lagos Nigerian space.

WALL TREATMENT:
All walls clean warm white.
One large abstract artwork on main wall.

FURNITURE:
One clean lined dining table in marble or light wood.
Simple upholstered dining chairs.

LIGHTING:
One architectural pendant above table.

CURTAINS:
Floor length sheer white curtains.

Do not add a second AC unit.`,

  bold_colourful: `Reimagine this dining room as a bold colourful Nigerian space.

WALL TREATMENT:
One feature wall in bold colour.
Large scale abstract artwork.
Remaining walls warm white.

FURNITURE:
Mixed dining chairs in complementary bold colours around a statement table.

LIGHTING:
One dramatic sculptural pendant.

CURTAINS:
Bold complementary floor length curtains.

Do not add a second AC unit.`,
};

const HOME_OFFICE: Record<AiRoomMoodId, string> = {
  afro_luxe: `Reimagine this home office as a premium Afro-luxe Nigerian space.

WALL TREATMENT:
One feature wall in charcoal or forest green. Nigerian artwork or abstract art in gold frame.
Remaining walls warm white.
Built-in shelving or floating shelves on side wall if space allows.

FURNITURE:
One large executive desk in dark wood against or perpendicular to feature wall.
One premium leather or velvet desk chair in dark tone.
One bookshelf or storage unit.

LIGHTING:
One brass desk lamp on desk.
One statement ceiling pendant.

CURTAINS:
Floor length curtains in deep tone.

Do not add a second AC unit.`,

  warm_earthy: `Reimagine this home office as a warm earthy Nigerian space.

WALL TREATMENT:
One feature wall in terracotta or warm sage. Botanical artwork.

FURNITURE:
One natural wood desk.
One warm upholstered desk chair.
One rattan or wood storage unit.

LIGHTING:
One warm desk lamp.
One rattan pendant.

CURTAINS:
Linen curtains in warm cream.

Do not add a second AC unit.`,

  minimal_lagos: `Reimagine this home office as a minimal Lagos Nigerian space.

WALL TREATMENT:
All walls clean white.
One large abstract artwork.
Floating shelves on side wall.

FURNITURE:
One clean lined white or light wood desk. Minimalist desk chair.
Simple storage.

LIGHTING:
One architectural desk lamp.
One simple pendant.

CURTAINS:
Sheer white curtains.

Do not add a second AC unit.`,

  bold_colourful: `Reimagine this home office as a bold colourful Nigerian space.

WALL TREATMENT:
One feature wall in bold colour — teal, mustard or deep orange.
Large bold abstract artwork.

FURNITURE:
Statement desk in contrasting colour or material.
Bold upholstered desk chair.

LIGHTING:
One sculptural desk lamp.
One dramatic pendant.

CURTAINS:
Bold complementary curtains.

Do not add a second AC unit.`,
};

const WALL_STYLING: Record<AiRoomMoodId, string> = {
  afro_luxe: `Reimagine this wall as a premium Afro-luxe Nigerian feature wall.
No furniture except a slim console table or bench against the wall.

WALL TREATMENT:
Deep navy or charcoal wall with slim vertical batten panels.
Arrangement of 2-3 Nigerian artworks in gold or black frames.
Two slim brass picture lights above the largest artwork.
One floor to near-ceiling arched mirror if wall width allows.

ACCESSORIES:
One tall plant in dark ceramic pot.
Brass objects on console if present.

Do not add furniture beyond a slim console or bench.`,

  warm_earthy: `Reimagine this wall as a warm earthy Nigerian feature wall.

WALL TREATMENT:
Terracotta or warm clay plaster wall.
2-3 botanical or figurative artworks in natural wood frames.
One round rattan mirror.

ACCESSORIES:
Dried pampas grass. Terracotta vases.
Woven wall hanging if appropriate.`,

  minimal_lagos: `Reimagine this wall as a minimal Lagos Nigerian feature wall.

WALL TREATMENT:
Clean warm white wall.
One large oversized abstract artwork perfectly centred — the only element.
One simple round mirror offset to the side.

No accessories. No clutter.`,

  bold_colourful: `Reimagine this wall as a bold colourful Nigerian feature wall.

WALL TREATMENT:
One strong colour-blocked wall — deep teal, mustard or burnt orange.
One large bold abstract artwork.
One sculptural or sunburst mirror.

ACCESSORIES:
Coloured ceramic vases.
Tall dramatic plant.`,
};

const BY_ROOM_TYPE: Record<string, Record<AiRoomMoodId, string>> = {
  living_room: LIVING_ROOM,
  bedroom: BEDROOM,
  dining_room: DINING_ROOM,
  home_office: HOME_OFFICE,
  wall_styling: WALL_STYLING,
};

export function getCompositionPrompt(roomType: string, mood: AiRoomMoodId): string {
  const table = BY_ROOM_TYPE[roomType];
  if (!table) {
    return BY_ROOM_TYPE.living_room[mood] ?? LIVING_ROOM[mood];
  }
  return table[mood] ?? LIVING_ROOM[mood];
}

export function buildAiRoomFullPrompt(params: {
  roomType: string;
  mood: AiRoomMoodId;
  productLines: string[];
}): string {
  const { roomType, mood, productLines } = params;
  const composition = getCompositionPrompt(roomType, mood);
  const productsBlock = `Feature these specific products:\n${productLines.join('\n')}`;
  return [composition, productsBlock, NIGERIAN_ROOM_CONTEXT, LAYOUT_INSTRUCTION, QUALITY_INSTRUCTION].join('\n\n');
}
