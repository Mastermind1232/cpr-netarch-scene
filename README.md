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

Open the Scenes tab and click "NET Architecture". Set a scene name and a difficulty. Either click Roll, which fills the floor list by the rulebook's method (3d6 floors, 1d10 per branch with 7 or higher branching, the Lobby table for floors 1 and 2, the Body table for the rest, with repeated Programs and Passwords rerolled), or build the list by hand: add a floor, pick what is on it from the dropdown, give a node a DV or leave it to the difficulty, add more pieces to the same floor, add a branch. Tick "edit as text" to work in the line format below instead. Then click Build scene, or Build under this scene.

One floor per line. A line holds any of these, separated by commas:

- `Password DV8`, `File DV6`, `Control Node DV10`. Without a DV the difficulty's DV is used.
- A Black ICE name, with `x2` or `x3` for copies: `Hellhound x2`.
- A Demon name: `Imp`, `Efreet`, `Balron`.

`Branch from 3:` starts a branch off main floor 3; the lines that follow are that branch's floors. Lines starting with `#` are ignored. Leading labels such as `4:` are ignored.

The scene can also be driven from a macro:

```js
game.modules.get("cpr-netarch-scene").api.open();
```

## Building under a scene

With the Levels and Wall Height modules active, the dialog's **Build under this scene** button lays the NET beneath the scene that is open instead of making a new one. The backdrop becomes a Levels tile between elevation -12 and -8, the room walls carry Wall Height ranges for that band, the node and ICE tokens sit at elevation -10, and a hidden **Access Point** token is placed at the centre of the GM's view, to be dragged wherever the floor's access point should be. Only a token at that elevation sees the NET; everyone else sees the floor. **Remove NET here** deletes everything a build placed, including any jacked-in tokens.

Once the access point is revealed, a token owner standing within six metres of it gets a **Jack In** button on their token's right-click menu. Jack In makes a second token of that character, named with "(NET)", in the corridor at the NET elevation; the body stays where it is. The same button reads **Jack Out** while jacked in and removes the NET token. The GM's client does the creating and deleting on players' behalf, so a GM has to be online.

The **N** key (rebindable under Configure Controls) switches the viewer between their body and their NET token: selection and view jump to the other one. During combat, clicking either token's name in the combat tracker does the same.

## Settings

- Backdrop: path or URL of the Net Archive video.
- Node and ICE art folder: the folder holding `Password.webm`, `PasswordDV6.webm` and the other DV variants, `File...`, `Controlnode...`, one `.webm` per Black ICE and Demon, `Root.webm`, and a `NUMBERS/` folder with `1.webm` to `30.webm`.

## Tests

```
node test/harness.js
```

## Scanner

Shift+S (or the dish button on the token HUD) is the Scanner Meat Action: Interface + 1d10, exploding on a 10 and imploding on a 1, against the architecture's tier DV. The roll goes to chat. On a success the nearest hidden access point is revealed and marked as scanned, which makes it visible through walls from its own level only, so it never shows from inside the NET: Scanner gives the location, not a view. Needs libWrapper. The check must be made from the body, not the NET avatar.
