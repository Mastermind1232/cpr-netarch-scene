# NET Architecture Scene Builder

A Foundry VTT module for the Cyberpunk RED system. It builds a new scene for a NET Architecture on the S0L Net Archive backdrop.

## What it makes

- A new scene, 3840 by 2160 with a 150 px grid, on the backdrop set in the module settings.
- One walled 2 by 2 room per floor. The main path enters from the left of the hall, runs right along the entry row and snakes back along the row above. Branches leave their attach floor into a free neighbouring room and continue, preferring downwards.
- A closed door between each pair of consecutive floors. The door into floor 1 starts open. The GM opens a door when the floor behind it is beaten.
- A token for each Password, File and Control Node, using the DV art for DV 6, 8, 10 and 12.
- A token for each copy of Black ICE, backed by a Black ICE actor. The actor is created in the "NET Architecture" folder from the core rulebook's table if it does not exist yet, with PER, SPD, ATK, DEF and REZ filled in and the effect in its notes. The matching Black ICE program item is embedded when an Item compendium supplies it.
- A token for each Demon listed on a floor, backed by a Demon actor created the same way.
- A floor number tile in each room and a Root tile under the deepest floor.
- A GM-only chat message listing every floor, the bottom floor, and the stats of every kind of ICE or Demon present.

## Using it

Open the Scenes tab and click "NET Architecture". Set a scene name and a difficulty. Either click Roll, which fills the floors box by the rulebook's method (3d6 floors, 1d10 per branch with 7 or higher branching, the Lobby table for floors 1 and 2, the Body table for the rest, with repeated Programs and Passwords rerolled), or type the floors by hand. Edit the box as needed, then click Build scene.

One floor per line. A line holds any of these, separated by commas:

- `Password DV8`, `File DV6`, `Control Node DV10`. Without a DV the difficulty's DV is used.
- A Black ICE name, with `x2` or `x3` for copies: `Hellhound x2`.
- A Demon name: `Imp`, `Efreet`, `Balron`.

`Branch from 3:` starts a branch off main floor 3; the lines that follow are that branch's floors. Lines starting with `#` are ignored. Leading labels such as `4:` are ignored.

The scene can also be driven from a macro:

```js
game.modules.get("cpr-netarch-scene").api.open();
```

## Settings

- Backdrop: path or URL of the Net Archive video.
- Node and ICE art folder: the folder holding `Password.webm`, `PasswordDV6.webm` and the other DV variants, `File...`, `Controlnode...`, one `.webm` per Black ICE and Demon, `Root.webm`, and a `NUMBERS/` folder with `1.webm` to `30.webm`.

## Tests

```
node test/harness.js
```
