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

Open the Scenes tab and click "NET Architecture". Set a scene name and a difficulty. Either click Roll, which fills the floor list by the rulebook's method (3d6 floors, 1d10 per branch with 7 or higher branching, the Lobby table for floors 1 and 2, the Body table for the rest, with repeated Programs and Passwords rerolled), or build the list by hand: add a floor, pick what is on it from the dropdown, give a node a DV or leave it to the difficulty, add more pieces to the same floor, add a branch. Tick "edit as text" to work in the line format below instead. Then click Build scene, or Build beside this scene.

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

With the Levels and Wall Height modules active, the dialog's **Build beside this scene** button lays the NET beneath the scene that is open instead of making a new one. The backdrop becomes a Levels tile between elevation -12 and -8, the room walls carry Wall Height ranges for that band, the node and ICE tokens sit at elevation -10, and a hidden **Access Point** token is placed in the middle of the map, to be dragged wherever the floor's access point should be. Only a token at that elevation sees the NET; everyone else sees the floor. **Remove NET here** deletes everything a build placed, including any jacked-in tokens.

Once the access point is revealed, a token owner standing within six metres of it gets a **Jack In** button on their token's right-click menu. Jack In makes a second token of that character, named with "(NET)", in the corridor at the NET elevation; the body stays where it is. The same button reads **Jack Out** while jacked in and removes the NET token. The GM's client does the creating and deleting on players' behalf, so a GM has to be online.

The **N** key (rebindable under Configure Controls) switches the viewer between their body and their NET token: selection and view jump to the other one. During combat, clicking either token's name in the combat tracker does the same.

## Settings

- Backdrop: path or URL of the Net Archive video.
- Node and ICE art folder: the folder holding `Password.webm`, `PasswordDV6.webm` and the other DV variants, `File...`, `Controlnode...`, one `.webm` per Black ICE and Demon, `Root.webm`, and a `NUMBERS/` folder with `1.webm` to `30.webm`.

## Tests

```
node test/harness.js
```

## Building beside a scene

"Build beside this scene" grows the open scene downward by the NET backdrop's height plus one row, keeps the map at its natural size at the top (background fit switches to width), moves every document on the map down with it, and lays the NET in the new strip with a wall along the seam. Everything is plain 2D: no Levels, no Wall Height, no elevation. Remove NET deletes the NET, moves the map's documents back and restores the scene's height and background fit.

## Scanner

Shift+J (or the plug button on the token HUD) is the mechanical act: it jacks the body in beside a found access point within 6 metres, or jacks out if already in. J on its own only changes the view, jumping between the body on the floor and the NET token; the NET is virtual, so the body still sees the room and the runner can flip between the two at will. Shift+S (or the dish button on the token HUD) is the Scanner Meat Action. It runs the system's own Interface check (the CPR roll dialog with mods and LUCK, 3D dice, the CPR roll card) against a DV set by distance to the nearest unfound access point: 6 within 20 m, 9 within 30 m, 13 within 40 m, 21 beyond. On a miss within 2 of the DV the chat gives the point's direction (one of eight compass points) without revealing it. Every Scan posts the roll card and a one-line outcome to chat, without the DV. Jack In and Jack Out post a one-line notice. On a success the nearest unfound access point is revealed and every player character on the scene gains a detection mode that senses found access points through walls, on their own level only, so it never shows from inside the NET. The GM's eye toggle on a point flips it between found and not found. The check must be made from the body, not the NET avatar.

## Walking into a room

Moving a jacked-in avatar into a room resolves the floor. Every piece of Black ICE lying in wait there is contested: the runner's Interface, plus any Speed bonus from an Active Effect, plus the wound penalty and any allActions bonus the system would put on an Interface roll, plus a d10 that explodes on a 10 and implodes on a 1, against the ICE's SPD plus the same kind of d10. The ICE lands its effect only if it beats the runner's check; a tie is not a win. Either way it wakes and enters the Initiative Queue at the top, one above the highest initiative in the order. A Demon has no SPD, so it is not contested and simply wakes. ICE that is already awake is not rolled against again, and an avatar that re-enters a room it has already cleared triggers nothing.

The ICE joins whichever combat is currently active rather than the one belonging to the scene on screen, because the runner's body is usually in a fight elsewhere. If no combat is running at all, one is created on the NET scene with the avatar in it and started. The result of the floor is whispered to the GM and to whoever owns the avatar.

Of each landed effect, brain damage and NET Action penalties are applied directly: brain damage comes off HP without worn or implanted armour and cannot cause a Critical Injury, less any brain damage reduction the runner has. CPR ships the Armor program with no Active Effect of its own, so a program named Armor that is installed on the equipped deck and rezzed is read as the 4 it prints; an Active Effect supplying brain damage reduction takes over instead, so the two are never counted together. and the pool for the following turn is reduced on the spot. Everything else is rolled so the number is on the table and left for the GM. A Liche's three stat losses, a Scorpion's MOVE loss and an anti-program ICE's damage to REZ are rolled and stated; an Asp names the Program it destroys, picked at random from the equipped deck, without deleting it. The card says which parts were applied.

When the last runner jacks out safely the Architecture's defenses reset: every woken piece of ICE goes back to lying in wait and leaves the initiative queue.

## NET Actions

Cyberpunk RED has no NET Action counter and neither does the system, so the module keeps one. The pool is read off the Interface rank printed on the role item: ranks 1 to 3 give 2, 4 to 6 give 3, 7 to 9 give 4, and rank 10 gives 5. Active Effects that raise the Interface check do not widen the pool.

The count is drawn above the Interface Abilities on the Fight tab, which is where CPR already lists them, so it appears only when a cyberdeck is equipped and the tab is in Netspace mode. Clicking Backdoor, Cloak, Control, Eye-Dee, Pathfinder, Slide, Virus or Zap takes one, and so does jacking in or out, though jacking is only charged while a combat has started with the runner in it, since outside a Turn there is no pool to spend from. Scanner is a Meat Action and Defense and Speed are not actions, so none of the three costs anything. Running out does not block the roll; it posts a warning and leaves the call to the GM. The count is taken when the link is clicked, so a roll cancelled at CPR's dialog still costs one: clicking the number gives one back, and the arrow beside it refills the pool.

The pool refills at the start of the runner's turn in combat, less anything owed to it. A Wisp, which reduces NET Actions by one on the turn after it hits, leaves that debt on the pool and it is paid off by the refill. The floor of two is a floor on the pool, not a cap on the reduction, so three Wisps on a rank 9 runner still leave a pool of two.
