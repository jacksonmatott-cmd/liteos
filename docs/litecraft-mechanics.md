# LiteCraft 0.8 mechanics coverage

The research target is modern Java 26.x (26.3 stable), not a release named 1.26. This is a substantial original prototype update, not Minecraft Java or complete feature parity.

| System | Working behavior | Simplifications and omissions |
| --- | --- | --- |
| Dimensions | Separate Overworld, Nether and End terrain, edits, mobs, chests and return locations; safe first arrival; Nether horizontal travel scaling; usable portals | Simplified terrain and portal linking; no full biome/structure catalog, strongholds or vanilla portal search |
| Progression | 35 tools/weapons including copper and gold; pickaxe tiers, speed, durability and ore drops; iron/copper/gold smelting and netherite upgrades | Automatic recipe book; approximate tuning; no smithing templates, enchantments or full crafting grid |
| Armor | 24 pieces, four real equipment slots, protection/toughness and durability | Java-inspired damage reduction; no trims, enchantments or complex damage-source exceptions |
| Combat | Attack charging, weak early swings, falling criticals, knockback, sword sweep, directional shield protection, wear, bow arrows that collide with terrain | Sparring bots and PvE only; no remote players or online PvP; simplified shield/axe handling |
| Mobs | Pig, cow, zombie, skeleton, spider, creeper, Enderman, blaze, dragon and sparring bot; wandering, chasing, ranged attacks, drops, fuse explosions and daylight burning | Bounded nearby simulation; simple collision/step movement and UV-mapped 3D geometry from Mojang’s official Bedrock samples, animated in both renderers; no full pathfinding/breeding/AI catalog; dragon is an introductory flying boss without crystals/phases |
| Redstone | Lever/source, dust, strengths 0–15 with decay, lamp activation and TNT ignition; recalculation after edits and source removal | Basic circuits, not full Java redstone: no repeaters, comparators, pistons, observers, torch inversion or quasi-connectivity |
| Survival | Hunger, food, regeneration, air/drowning, armor-aware hazards, fall damage, death/respawn and five-minute recoverable inventory drops; keepInventory rule | Simplified exhaustion/difficulty; no sleeping, potion/status-effect system or full damage rules |
| Storage/farming | Usable placed chests, nearby placed-furnace queue, hoe farmland, planting seeds and wheat maturation | Chest transfers up to16 items per action; recipe-based smelting uses one coal per item; simplified random growth/no hydration simulation |
| Commands | /help, /give, /gamemode, /tp (relative coordinates), /time, /difficulty, /summon, /dimension, /setblock, /fill, /spawnpoint, /gamerule, /weather, /kill, /xp, /heal, /kit, /arena | Allowlisted LiteCraft grammar, not the complete Java command language; weather is visual; fill limited to4096 blocks |
| Persistence | World backups and profile-local saves include all three realms and mechanical state; old16-block inventories are expanded safely | No hosted database or networked server authority; transient projectiles are not saved |

## Biomes

New worlds use generator 3 (generator-2 climate and biome layout, with new ore/rock patches): Plains, Forest, Birch Forest, Taiga, Desert, Snowy Plains, Savanna, Swamp, Mountains, Badlands, Ocean, River and Dappled Forest. Seeded climate fields control regions, while continuous elevation fields keep chunk/biome borders coherent. Surface layers, tree shapes/species, leaf colors, grass tints, cacti, cold-water ice and mountain snow distinguish regions. Ice reduces movement traction and cactus contact causes damage. /biome reports the current region; /locate biome <key> searches a bounded sampled grid. This is an original approximation, not Mojang’s world-generation algorithm. Existing saves keep their saved generator (1 or 2), so builds are preserved.

## Controls and progression

Open **Bag → World** for the field guide and world settings. Creative worlds enable commands by default; Survival worlds require explicitly enabling them in World. /kit starter, /kit combat, /kit redstone and /kit portals help test the systems. /arena creates bot opponents and does not start a multiplayer session.

A Survival path is logs → boards/sticks → wooden and stone tools → copper/iron equipment → diamond → obsidian → Nether portal → blaze powder and Enderman pearls → Eyes of Ender → simplified End Gate → introductory dragon fight. Mine stone for the prototype’s flint drops. Use seeds from vegetation with farmland. To open a Nether portal, build a4×5 obsidian outline with an empty2×3 interior, equip flint and steel and Use the frame. The End Gate recipe consumes twelve eyes and twelve obsidian; stronghold generation and eye-filled portal frames are not simulated.

## Research sources

Official sources consulted by the research agent and implementation owner:

- https://www.minecraft.net/en-us/article/minecraft-new-version-numbering-system
- https://www.minecraft.net/en-us/article/minecraft-java-edition-26-3
- https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-9
- https://www.minecraft.net/en-us/updates/copper-age-drop
- https://www.minecraft.net/en-us/article/taking-inventory-pickaxe
- https://www.minecraft.net/en-us/article/taking-inventory--sword
- https://www.minecraft.net/nl-nl/article/taking-inventory--shield
- https://www.minecraft.net/en-us/article/health-minecraft
- https://www.minecraft.net/en-us/article/how-survive-your-first-night-minecraft
- https://www.minecraft.net/en-us/article/stronghold
- https://www.minecraft.net/en-us/article/ender-dragon
- https://www.minecraft.net/en-us/article/redstone-dust
- https://www.minecraft.net/en-us/article/minecraft-commands

Introductory official articles do not fully specify Java simulation internals. Unverified values and rules are treated as LiteCraft tuning, not claims of exact parity. The additional artwork is extracted from the owner-supplied26.3.x-Template.zip and packed in content-art.json; the original texture provenance file remains alongside the existing PNGs.

## Visual assets and geology

Model data is downloaded from https://github.com/Mojang/bedrock-samples/tree/main/resource_pack/models/entity and adapted to the LiteCraft coordinate system. Original UV-mapped cuboids, bones and skins replace all flat mob billboards; walking, raised arms, blaze rods and dragon wings use simplified LiteCraft poses. The dragon is assembled from the supplied geometry with a repeated neck-based tail. The source skins and block PNGs come from the owner’s 26.3.x-Template.zip. Both WebGL and software render model faces with alpha cutouts and terrain occlusion. Default texture artwork and geometry remain © Mojang AB / Microsoft and subject to their terms, not the application license.

Generator 3 uses seeded globally anchored ore lenses and stone patches, including Nether gold and quartz, deepslate coal/copper/iron/gold/redstone/diamond, gravel, granite, diorite, andesite, blackstone and basalt. Generation is an original approximation. Existing terrain stays versioned, while old gold in the Nether and ores below Y zero receive context-correct visuals. Nether gold drops nuggets (nine craft an ingot), and quartz has an inventory item.
