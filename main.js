/**
 * NET Architecture Scene Builder (Cyberpunk RED)
 *
 * Builds a brand-new Foundry scene for a NET Architecture on the S0L
 * "Net Archive" backdrop. Every floor is a walled 2x2 room. Consecutive
 * floors are joined by a closed door; the GM opens the door when the floor's
 * obstacle is beaten. Long architectures snake back and forth across the
 * hall; branches hang off the main path into the free rows.
 *
 * Password, File and Control Node floors get a node token with the DV art.
 * Black ICE floors get one token per copy, each backed by a real Black ICE
 * actor (created from the core rulebook's table if it does not exist yet).
 * Demons listed on a floor get a Demon actor token the same way.
 *
 * Floors can be rolled by the rulebook's method (3d6 floors, d10 branches,
 * Lobby and Body tables by difficulty) or typed by hand, one floor per line.
 */

const ID = "cpr-netarch-scene";
const G = 150;                                   // grid size of the backdrop, px
const SCENE = { width: 3840, height: 2160 };
/** Lattice of 2x2 rooms: 9 columns (x 4..22) by 4 rows (y 3..11), all in grid units. */
const LAT = { cols: 9, rows: 4, x0: 4, y0: 3, entryRow: 1 };
const ROOM = 2;

const TIERS = ["Basic", "Standard", "Uncommon", "Advanced"];
const TIER_DV = { Basic: 6, Standard: 8, Uncommon: 10, Advanced: 12 };
const ACTOR_FOLDER = "NET Architecture";

/* ------------------------------------------------------------------ */
/*  Core rulebook tables                                               */
/* ------------------------------------------------------------------ */

/** Black ICE, core rulebook p. 208-209. */
const ICE = {
  Asp:        { cls: "antipersonnel", per: 4, spd: 6, atk: 2, def: 2, rez: 15, cost: 100,  effect: "Destroys one Program on the runner's deck at random." },
  Giant:      { cls: "antipersonnel", per: 2, spd: 2, atk: 8, def: 4, rez: 25, cost: 1000, effect: "3d6 to the brain. The runner is forcibly and unsafely jacked out, suffering the effect of every rezzed enemy Black ICE met on this run except the Giant." },
  Hellhound:  { cls: "antipersonnel", per: 6, spd: 6, atk: 6, def: 2, rez: 20, cost: 500,  effect: "2d6 to the brain. Deck and clothing catch fire unless insulated: 2 HP at the end of each turn until a Meat Action puts it out. Does not stack." },
  Kraken:     { cls: "antipersonnel", per: 6, spd: 2, atk: 8, def: 4, rez: 30, cost: 1000, effect: "3d6 to the brain. Until the end of the runner's next turn they cannot go deeper or jack out safely." },
  Liche:      { cls: "antipersonnel", per: 8, spd: 2, atk: 6, def: 2, rez: 25, cost: 500,  effect: "INT, REF and DEX each lowered by 1d6 for an hour, minimum 1." },
  Raven:      { cls: "antipersonnel", per: 6, spd: 4, atk: 4, def: 2, rez: 15, cost: 50,   effect: "Derezzes one rezzed Defender at random, then 1d6 to the brain." },
  Scorpion:   { cls: "antipersonnel", per: 2, spd: 6, atk: 2, def: 2, rez: 15, cost: 100,  effect: "MOVE lowered by 1d6 for an hour, minimum 1." },
  Skunk:      { cls: "antipersonnel", per: 2, spd: 4, atk: 4, def: 2, rez: 10, cost: 500,  effect: "Until derezzed, the runner hit makes all Slide checks at -2. One runner per Skunk; several Skunks stack." },
  Wisp:       { cls: "antipersonnel", per: 4, spd: 4, atk: 4, def: 2, rez: 15, cost: 50,   effect: "1d6 to the brain. The runner's NET Actions next turn are reduced by 1, minimum 2." },
  Dragon:     { cls: "antiprogram",   per: 6, spd: 4, atk: 6, def: 6, rez: 30, cost: 1000, effect: "6d6 to a Program. If that would derez it, it is destroyed instead." },
  Killer:     { cls: "antiprogram",   per: 4, spd: 8, atk: 6, def: 2, rez: 20, cost: 500,  effect: "4d6 to a Program. If that would derez it, it is destroyed instead." },
  Sabertooth: { cls: "antiprogram",   per: 8, spd: 6, atk: 6, def: 2, rez: 25, cost: 1000, effect: "6d6 to a Program. If that would derez it, it is destroyed instead." },
};

/** Demons, core rulebook p. 209. */
const DEMONS = {
  Imp:    { rez: 15, interface: 3, actions: 2, combatNumber: 14, cost: 1000 },
  Efreet: { rez: 25, interface: 4, actions: 3, combatNumber: 14, cost: 5000 },
  Balron: { rez: 30, interface: 7, actions: 4, combatNumber: 14, cost: 10000 },
};

/** The Lobby, floors 1 and 2 (1d6). */
const LOBBY = ["File DV6", "Password DV6", "Password DV8", "Skunk", "Wisp", "Killer"];

/** All other floors (3d6), index = roll - 3. */
const BODY = {
  Basic:    ["Hellhound", "Sabertooth", "Raven x2", "Hellhound", "Wisp", "Raven", "Password DV6", "File DV6", "Control Node DV6", "Password DV6", "Skunk", "Asp", "Scorpion", "Killer, Skunk", "Wisp x3", "Liche"],
  Standard: ["Hellhound x2", "Hellhound, Killer", "Skunk x2", "Sabertooth", "Scorpion", "Hellhound", "Password DV8", "File DV8", "Control Node DV8", "Password DV8", "Asp", "Killer", "Liche", "Asp", "Raven x3", "Liche, Raven"],
  Uncommon: ["Kraken", "Hellhound, Scorpion", "Hellhound, Killer", "Raven x2", "Sabertooth", "Hellhound", "Password DV10", "File DV10", "Control Node DV10", "Password DV10", "Killer", "Liche", "Dragon", "Asp, Raven", "Dragon, Wisp", "Giant"],
  Advanced: ["Hellhound x3", "Asp x2", "Hellhound, Liche", "Wisp x3", "Hellhound, Sabertooth", "Kraken", "Password DV12", "File DV12", "Control Node DV12", "Password DV12", "Giant", "Dragon", "Killer, Scorpion", "Kraken", "Raven, Wisp, Hellhound", "Dragon x2"],
};

/* ------------------------------------------------------------------ */
/*  Floor text: parse and print                                        */
/* ------------------------------------------------------------------ */

const NODE_LABEL = { password: "Password", file: "File", control: "Control Node" };
const NODE_ART = { password: "Password", file: "File", control: "Controlnode" };

function canonName(word) {
  let n = word[0].toUpperCase() + word.slice(1).toLowerCase();
  if (!ICE[n] && !DEMONS[n] && n.endsWith("s")) n = n.slice(0, -1);
  return n;
}

/** One comma-separated piece of a floor line. */
function parseEntry(raw) {
  const s = raw.trim().replace(/\s+/g, " ");
  if (!s) return null;
  let m = s.match(/^(password|file|control ?node|node)(?:\s*\(?\s*dv\s*(\d+)\s*\)?)?$/i);
  if (m) {
    const w = m[1].toLowerCase();
    const node = w.startsWith("p") ? "password" : w.startsWith("f") ? "file" : "control";
    return { kind: "node", node, dv: m[2] ? Number(m[2]) : null };
  }
  m = s.match(/^(?:(\d+)\s*[x×]?\s*)?([a-z]+)(?:\s*[x×]\s*(\d+))?$/i);
  if (m) {
    const name = canonName(m[2]);
    const count = Number(m[3] ?? m[1] ?? 1);
    if (ICE[name]) return { kind: "ice", name, count: Math.max(1, count) };
    if (DEMONS[name]) return { kind: "demon", name };
  }
  throw new Error(`Unknown floor entry "${raw.trim()}". Use Password/File/Control Node [DVn], a Black ICE name [xN], or a Demon name.`);
}

/**
 * Parses the floors box. One floor per line; "Branch from N:" starts a branch
 * off main floor N. "#" begins a comment. Leading "3:" labels are ignored.
 * Returns { main: [{items}], branches: [{attach, floors: [{items}]}] }.
 */
function parseText(text) {
  const main = [];
  const branches = [];
  let cur = main;
  text.split(/\r?\n/).forEach((line, i) => {
    let s = line.replace(/#.*$/, "").trim();
    if (!s) return;
    const b = s.match(/^branch(?:\s+\w+)?\s*(?:from|off|at)?\s*(?:floor)?\s*(\d+)\s*:?$/i);
    if (b) {
      const branch = { attach: Number(b[1]), floors: [] };
      branches.push(branch);
      cur = branch.floors;
      return;
    }
    s = s.replace(/^(?:floor\s*)?\d+\s*[:.)\-]\s*/i, "");
    let items;
    try {
      items = s.split(/\s*[,+;]\s*|\s+and\s+/i).map(parseEntry).filter(Boolean);
    } catch (err) {
      throw new Error(`Line ${i + 1}: ${err.message}`);
    }
    if (items.length) cur.push({ items });
  });
  if (!main.length) throw new Error("No floors given.");
  for (const b of branches) {
    if (!b.floors.length) throw new Error(`Branch from floor ${b.attach} has no floors.`);
    if (b.attach < 2) throw new Error("An architecture cannot branch before its second floor.");
    if (b.attach > main.length) throw new Error(`Branch from floor ${b.attach}: the main path only has ${main.length} floors.`);
  }
  return { main, branches };
}

function entryText(it) {
  if (it.kind === "node") return NODE_LABEL[it.node] + (it.dv ? ` DV${it.dv}` : "");
  if (it.kind === "ice") return it.name + (it.count > 1 ? ` x${it.count}` : "");
  return it.name;
}
const floorText = (f) => f.items.map(entryText).join(", ");

/** Prints an architecture in the same syntax parseText reads. */
function toText(arch, header = []) {
  const out = header.map((h) => `# ${h}`);
  let n = 0;
  const line = (f) => `${++n}: ${floorText(f)}${f.note ? `   # ${f.note}` : ""}`;
  arch.main.forEach((f) => out.push(line(f)));
  arch.branches.forEach((b) => {
    out.push(`Branch from ${b.attach}:`);
    b.floors.forEach((f) => out.push(line(f)));
  });
  return out.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Rolling by the book                                                */
/* ------------------------------------------------------------------ */

function rollFloor(table, rng, seen, tier) {
  const isLobby = table === LOBBY;
  let last = null;
  const rolls = [];
  for (let attempt = 0; attempt < 30; attempt++) {
    const r = isLobby ? 1 + Math.floor(rng() * 6) : [0, 0, 0].reduce((s) => s + 1 + Math.floor(rng() * 6), 0);
    rolls.push(r);
    const items = table[isLobby ? r - 1 : r - 3].split(", ").map(parseEntry);
    const keys = items.map((it) => (it.kind === "node" ? (it.node === "password" ? "Password" : null) : it.name)).filter(Boolean);
    last = { items, rolls };
    if (!keys.some((k) => seen.has(k))) { keys.forEach((k) => seen.add(k)); return last; }
  }
  return last;
}

/**
 * Rolls a whole architecture: 3d6 floors; 1d10 per branch, 7+ branches and
 * roll again; Lobby table for floors 1 and 2; Body table by tier for the
 * rest; a Program or Password already rolled is rerolled.
 */
function rollArchitecture(tier, rng = Math.random) {
  if (!BODY[tier]) throw new Error(`Unknown difficulty "${tier}".`);
  const d6 = () => 1 + Math.floor(rng() * 6);
  const d10 = () => 1 + Math.floor(rng() * 10);
  const total = d6() + d6() + d6();
  const d10s = [];
  let branchCount = 0;
  for (;;) { const r = d10(); d10s.push(r); if (r >= 7) branchCount++; else break; }

  // Split the floors. Main keeps at least three (two lobby, one body) and stays the longest.
  const notes = [];
  const lengths = [];
  let mainLen = total;
  for (let i = 0; i < branchCount; i++) {
    const room = mainLen - 3 - lengths.reduce((a, b) => a + b, 0);
    if (room < 1) { notes.push(`A rolled branch was dropped: only ${total} floors to share.`); continue; }
    lengths.push(1 + Math.floor(rng() * Math.min(room, Math.floor(total / 3))));
  }
  mainLen = total - lengths.reduce((a, b) => a + b, 0);
  while (lengths.length && Math.max(...lengths) >= mainLen) {
    const i = lengths.indexOf(Math.max(...lengths));
    lengths[i]--; mainLen++;
    if (lengths[i] === 0) lengths.splice(i, 1);
  }

  const seen = new Set();
  const floor = (table) => {
    const f = rollFloor(table, rng, seen, tier);
    const note = (table === LOBBY ? "1d6=" : "3d6=") + f.rolls[f.rolls.length - 1] + (f.rolls.length > 1 ? `, rerolled ${f.rolls.slice(0, -1).join(", ")}` : "");
    return { items: f.items, note };
  };
  const main = [];
  for (let i = 0; i < mainLen; i++) main.push(floor(i < 2 ? LOBBY : BODY[tier]));
  const branches = lengths.map((len) => {
    const floors = [];
    for (let i = 0; i < len; i++) floors.push(floor(BODY[tier]));
    const attach = 2 + Math.floor(rng() * Math.max(1, mainLen - 2));   // floor 2 .. mainLen-1
    return { attach, floors };
  });
  const header = [
    `${tier}. 3d6 = ${total} floors. Branch rolls (d10, 7+ branches): ${d10s.join(", ")}.`,
    ...notes,
    "Edit freely. One floor per line; \"Branch from N:\" starts a branch off main floor N.",
  ];
  return { main, branches, tier, total, d10s, header };
}

/* ------------------------------------------------------------------ */
/*  Layout on the lattice                                              */
/* ------------------------------------------------------------------ */

const DIRS = { right: [1, 0], up: [0, -1], left: [-1, 0], down: [0, 1] };

/**
 * Places every floor in a 2x2 cell. The main path enters at the left of the
 * entry row and snakes: right along the row, then back along the row above.
 * Branches leave their attach floor into a free neighbouring cell and keep
 * going, preferring downwards. Depth-first with backtracking, so a branch
 * that cannot start where asked is tried from the nearest other floors.
 */
function layout(arch) {
  const { cols, rows, entryRow } = LAT;
  const used = new Set();
  const key = (c, r) => `${c},${r}`;
  const inb = (c, r) => c >= 0 && c < cols && r >= 0 && r < rows;
  let budget = 0;
  function extend(c, r, len, pref) {
    if (len === 0) return [];
    for (const d of pref) {
      const nc = c + DIRS[d][0], nr = r + DIRS[d][1];
      if (!inb(nc, nr) || used.has(key(nc, nr))) continue;
      if (--budget < 0) return null;
      used.add(key(nc, nr));
      const rest = extend(nc, nr, len - 1, pref);
      if (rest) return [[nc, nr], ...rest];
      used.delete(key(nc, nr));
    }
    return null;
  }
  budget = 200000;
  const main = extend(-1, entryRow, arch.main.length, ["right", "up", "left", "down"]);
  if (!main) throw new Error(`Cannot fit ${arch.main.length} main floors on the map (${cols * rows} rooms).`);
  const notes = [];
  const branches = [];
  for (const b of arch.branches) {
    const order = [];
    for (let d = 0; d < arch.main.length; d++) {
      for (const a of [b.attach - d, b.attach + d]) {
        if (a >= 2 && a <= arch.main.length && !order.includes(a)) order.push(a);
      }
    }
    let cells = null, attach = null;
    for (const a of order) {
      budget = 200000;
      cells = extend(main[a - 1][0], main[a - 1][1], b.floors.length, ["down", "right", "left", "up"]);
      if (cells) { attach = a; break; }
    }
    if (!cells) throw new Error(`Cannot fit a ${b.floors.length}-floor branch anywhere on the map.`);
    if (attach !== b.attach) notes.push(`The branch from floor ${b.attach} was moved to floor ${attach} to fit the map.`);
    branches.push({ attach, cells });
  }
  return { main, branches, notes };
}

/* ------------------------------------------------------------------ */
/*  Scene data                                                         */
/* ------------------------------------------------------------------ */

const px = (g) => g * G;

function wallDoc(c, { door = 0, ds = 0, sight = 20 } = {}) {
  return { c: c.map(px), move: 20, sight, light: sight, sound: sight, door, ds, dir: 0 };
}

function tokenDoc({ name, src, x, y, actorId = null, hostile = false, bar = null, w = 1, h = 1 }) {
  return {
    name, x: px(x), y: px(y), width: w, height: h,
    texture: { src, fit: "contain", anchorX: 0.5, anchorY: 0.5, scaleX: 1, scaleY: 1, alphaThreshold: 0.75 },
    actorId, actorLink: false, disposition: hostile ? -1 : 0,
    displayName: 30, displayBars: bar ? 20 : 0, bar1: { attribute: bar },
    sight: { enabled: false, range: 0 }, hidden: false,
  };
}

function tileDoc({ src, x, y, w, h, sort = 0 }) {
  return { x: px(x), y: px(y), width: px(w), height: px(h), texture: { src, fit: "contain", anchorX: 0.5, anchorY: 0.5 }, sort, alpha: 1, hidden: false, locked: false, elevation: 0 };
}

/** Grid coordinates of the room in cell (c, r). */
function roomAt([c, r]) {
  return { x: LAT.x0 + ROOM * c, y: LAT.y0 + ROOM * r };
}

function sharedEdge(a, b) {
  const A = roomAt(a);
  if (b[0] === a[0] + 1) return [A.x + ROOM, A.y, A.x + ROOM, A.y + ROOM];
  if (b[0] === a[0] - 1) return [A.x, A.y, A.x, A.y + ROOM];
  if (b[1] === a[1] + 1) return [A.x, A.y + ROOM, A.x + ROOM, A.y + ROOM];
  if (b[1] === a[1] - 1) return [A.x, A.y, A.x + ROOM, A.y];
  throw new Error(`Rooms ${a} and ${b} are not adjacent.`);
}

const edgeKey = (c) => {
  const a = c.join(","), b = [c[2], c[3], c[0], c[1]].join(",");
  return a < b ? a : b;
};

/**
 * Turns a parsed architecture plus its layout into Scene.create data.
 * ids maps an ICE or Demon name to the actor id its tokens should use.
 */
function buildSceneData(arch, placed, { name, backdrop, art, ids = {}, tierDv = null }) {
  const edges = new Map();
  const setEdge = (c, opts) => { const k = edgeKey(c); if (opts.door || !edges.has(k)) edges.set(k, wallDoc(c, opts)); };

  // A numbered floor list: main first, then each branch, in map order.
  const floors = [];
  let n = 0;
  arch.main.forEach((f, i) => floors.push({ n: ++n, path: "Main", cell: placed.main[i], items: f.items }));
  placed.branches.forEach((b, bi) => {
    const src = arch.branches[bi];
    src.floors.forEach((f, i) => floors.push({ n: ++n, path: `Branch ${String.fromCharCode(65 + bi)} (off floor ${b.attach})`, cell: b.cells[i], items: f.items }));
  });

  // Every room is walled on four sides.
  for (const f of floors) {
    const R = roomAt(f.cell);
    setEdge([R.x, R.y, R.x + ROOM, R.y], {});
    setEdge([R.x, R.y + ROOM, R.x + ROOM, R.y + ROOM], {});
    setEdge([R.x, R.y, R.x, R.y + ROOM], {});
    setEdge([R.x + ROOM, R.y, R.x + ROOM, R.y + ROOM], {});
  }
  // Consecutive floors share a closed door.
  const chain = (cells) => { for (let i = 1; i < cells.length; i++) setEdge(sharedEdge(cells[i - 1], cells[i]), { door: 1, ds: 0 }); };
  chain(placed.main);
  placed.branches.forEach((b) => chain([placed.main[b.attach - 1], ...b.cells]));

  // The entry corridor: see-through side walls, an open door into floor 1.
  const E = roomAt(placed.main[0]);
  const walls = [
    wallDoc([0, E.y, E.x, E.y], { sight: 0 }),
    wallDoc([0, E.y + ROOM, E.x, E.y + ROOM], { sight: 0 }),
    wallDoc([0, E.y, 0, E.y + ROOM], { sight: 0 }),
  ];
  setEdge([E.x, E.y, E.x, E.y + ROOM], { door: 1, ds: 1 });
  walls.push(...edges.values());

  // Tokens: contents sit in the right column, then bottom-left; the runner gets the top-left.
  const slots = [[1, 0], [1, 1], [0, 1], [0, 0]];
  const tokens = [];
  const dvOf = (it) => it.dv ?? tierDv;
  for (const f of floors) {
    const R = roomAt(f.cell);
    let s = 0;
    const place = (t) => { const [dx, dy] = slots[Math.min(s++, slots.length - 1)]; tokens.push({ ...t, x: px(R.x + dx), y: px(R.y + dy) }); };
    for (const it of f.items) {
      if (it.kind === "node") {
        const dv = dvOf(it);
        const file = NODE_ART[it.node] + ([6, 8, 10, 12].includes(dv) ? `DV${dv}` : "");
        place(tokenDoc({ name: NODE_LABEL[it.node] + (dv ? ` DV${dv}` : ""), src: `${art}/${file}.webm`, x: 0, y: 0 }));
      } else if (it.kind === "ice") {
        for (let k = 0; k < it.count; k++) place(tokenDoc({ name: it.name, src: `${art}/${it.name}.webm`, x: 0, y: 0, actorId: ids[it.name] ?? null, hostile: true, bar: "stats.rez" }));
      } else if (it.kind === "demon") {
        place(tokenDoc({ name: it.name, src: `${art}/${it.name}.webm`, x: 0, y: 0, actorId: ids[it.name] ?? null, hostile: true, bar: "stats.rez" }));
      }
    }
  }

  // Tiles: a floor number in each room's corner, and the Root under the deepest floor.
  const tiles = [];
  for (const f of floors) {
    const R = roomAt(f.cell);
    const label = f.n <= 30 ? String(f.n) : "INFINITE";
    tiles.push(tileDoc({ src: `${art}/NUMBERS/${label}.webm`, x: R.x + 0.05, y: R.y + 0.05, w: 0.55, h: 0.55, sort: 10 }));
  }
  let deepest = { depth: placed.main.length, cell: placed.main[placed.main.length - 1], n: placed.main.length };
  placed.branches.forEach((b, bi) => {
    const depth = b.attach + b.cells.length;
    if (depth > deepest.depth) {
      const first = floors.find((f) => f.path.startsWith(`Branch ${String.fromCharCode(65 + bi)}`));
      deepest = { depth, cell: b.cells[b.cells.length - 1], n: first.n + b.cells.length - 1 };
    }
  });
  { const R = roomAt(deepest.cell); tiles.push(tileDoc({ src: `${art}/Root.webm`, x: R.x, y: R.y, w: ROOM, h: ROOM, sort: 0 })); }

  const sceneData = {
    name, navigation: true,
    width: SCENE.width, height: SCENE.height, padding: 0.25,
    background: { src: backdrop, fit: "fill" }, backgroundColor: "#000000",
    grid: { type: 1, size: G, distance: 2, units: "m", alpha: 0.2, color: "#ffffff" },
    tokenVision: true, fog: { exploration: true },
    environment: { darknessLevel: 0, globalLight: { enabled: true, alpha: 0.5, bright: false } },
    initial: { x: SCENE.width / 2, y: SCENE.height / 2, scale: 0.5 },
    walls, tokens, tiles,
    flags: { [ID]: { floors: floors.map((f) => ({ n: f.n, path: f.path, cell: f.cell, text: floorText(f) })), bottom: deepest.n, notes: placed.notes } },
  };
  return { sceneData, floors, bottom: deepest.n };
}

/* ------------------------------------------------------------------ */
/*  Actor data                                                         */
/* ------------------------------------------------------------------ */

function iceActorData(name, art, folder = null, items = []) {
  const d = ICE[name];
  if (!d) throw new Error(`Unknown Black ICE "${name}".`);
  const src = `${art}/${name}.webm`;
  return {
    name, type: "blackIce", folder, items,
    system: {
      class: d.cls, cost: d.cost,
      stats: { per: d.per, spd: d.spd, atk: d.atk, def: d.def, rez: { value: d.rez, max: d.rez } },
      notes: `<p><strong>${d.cls === "antiprogram" ? "Anti-Program" : "Anti-Personnel"}.</strong> ${d.effect}</p>`,
    },
    prototypeToken: { name, texture: { src }, disposition: -1, displayName: 30, displayBars: 20, bar1: { attribute: "stats.rez" }, actorLink: false },
  };
}

function demonActorData(name, art, folder = null) {
  const d = DEMONS[name];
  if (!d) throw new Error(`Unknown Demon "${name}".`);
  const src = `${art}/${name}.webm`;
  return {
    name, type: "demon", folder,
    system: {
      stats: { rez: { value: d.rez, max: d.rez }, interface: d.interface, actions: d.actions, combatNumber: d.combatNumber },
      notes: `<p>Runs Control Nodes and Zaps. No SPD, PER or DEF: cannot be slid away from, gets no free hit, always knows a runner is present, ignores Passwords, defends with Interface plus 1d10.</p>`,
    },
    prototypeToken: { name, texture: { src }, disposition: -1, displayName: 30, displayBars: 20, bar1: { attribute: "stats.rez" }, actorLink: false },
  };
}

/* ------------------------------------------------------------------ */
/*  Foundry glue                                                       */
/* ------------------------------------------------------------------ */

function reportErr(err) {
  console.error(`${ID} |`, err);
  ui.notifications?.error(`NET Architecture: ${err?.message ?? err}. See the console (F12).`);
}
const guard = (fn) => async (...args) => { try { await fn(...args); } catch (err) { reportErr(err); } };

Hooks.once("init", () => {
  game.settings.register(ID, "backdrop", {
    name: "Backdrop",
    hint: "Path or URL of the Net Archive video every architecture is built on (3840x2160, 150px grid).",
    scope: "world", config: true, type: String,
    default: "https://assets.forge-vtt.com/6a7ca306f6a96908b438164c/NuNu/Maps/NetArch/S0L-TheNet-Archive-192px-VTT4K.webm",
  });
  game.settings.register(ID, "artBase", {
    name: "Node and ICE art folder",
    hint: "Folder holding Password/File/Controlnode(DVn).webm, each Black ICE and Demon .webm, Root.webm and NUMBERS/.",
    scope: "world", config: true, type: String,
    default: "https://assets.forge-vtt.com/6a7ca306f6a96908b438164c/NuNu/Tiles/NetArch",
  });
});

async function ensureFolder(name) {
  const found = game.folders.find((f) => f.type === "Actor" && f.name === name);
  return found ?? Folder.create({ name, type: "Actor" });
}

/** The matching Black ICE program item from any Item compendium, so the sheet can roll damage. */
async function findProgramItem(name) {
  try {
    for (const pack of game.packs) {
      if (pack.metadata.type !== "Item") continue;
      const idx = await pack.getIndex();
      const e = idx.find((i) => i.type === "program" && i.name?.toLowerCase() === name.toLowerCase());
      if (e) { const doc = await pack.getDocument(e._id); if (doc) return doc.toObject(); }
    }
  } catch (err) { console.warn(`${ID} | program lookup failed for ${name}`, err); }
  return null;
}

async function ensureActor(name, art) {
  const type = ICE[name] ? "blackIce" : "demon";
  const found = game.actors.find((a) => a.type === type && a.name.toLowerCase() === name.toLowerCase());
  if (found) return found;
  const folder = await ensureFolder(ACTOR_FOLDER);
  const data = type === "blackIce"
    ? iceActorData(name, art, folder.id, [await findProgramItem(name)].filter(Boolean))
    : demonActorData(name, art, folder.id);
  return Actor.create(data);
}

function summaryHtml(scene, floors, bottom, notes, arch) {
  const rows = floors.map((f) => `<tr><td>${f.n}</td><td>${f.path}</td><td>${floorText(f)}</td></tr>`).join("");
  const used = new Set();
  floors.forEach((f) => f.items.forEach((it) => { if (it.kind !== "node") used.add(it.name); }));
  const stats = [...used].map((nm) => {
    const d = ICE[nm];
    if (d) return `<li><b>${nm}</b> (${d.cls === "antiprogram" ? "Anti-Program" : "Anti-Personnel"}): PER ${d.per}, SPD ${d.spd}, ATK ${d.atk}, DEF ${d.def}, REZ ${d.rez}. ${d.effect}</li>`;
    const m = DEMONS[nm];
    return `<li><b>${nm}</b> (Demon): REZ ${m.rez}, Interface ${m.interface}, NET Actions ${m.actions}, Combat Number ${m.combatNumber}.</li>`;
  }).join("");
  const head = arch.header ? `<p>${arch.header[0]}</p>` : "";
  return `<div class="cpr-netarch-summary"><h3>${scene.name}</h3>${head}
    <table style="font-size:0.9em"><thead><tr><th>#</th><th>Path</th><th>Floor</th></tr></thead><tbody>${rows}</tbody></table>
    <p>Bottom floor (Virus): ${bottom}. Doors are closed; open the door out of a floor when its obstacle is beaten.</p>
    ${notes.length ? `<p>${notes.join("<br>")}</p>` : ""}
    ${stats ? `<ul style="font-size:0.85em">${stats}</ul>` : ""}</div>`;
}

/** Builds the scene from the floors text. tier sets the DV of nodes typed without one. */
async function build({ name, tier, text, arch: rolled = null }) {
  const arch = parseText(text);
  if (rolled?.header) arch.header = rolled.header;
  const placed = layout(arch);
  const art = String(game.settings.get(ID, "artBase")).replace(/\/+$/, "");
  const backdrop = game.settings.get(ID, "backdrop");
  const need = new Set();
  [...arch.main, ...arch.branches.flatMap((b) => b.floors)].forEach((f) => f.items.forEach((it) => { if (it.kind !== "node") need.add(it.name); }));
  const ids = {};
  for (const nm of need) ids[nm] = (await ensureActor(nm, art)).id;
  const { sceneData, floors, bottom } = buildSceneData(arch, placed, { name: name || "NET Architecture", backdrop, art, ids, tierDv: TIER_DV[tier] ?? null });
  const scene = await Scene.create(sceneData);
  try { const t = await scene.createThumbnail(); if (t?.thumb) await scene.update({ thumb: t.thumb }); } catch (err) { console.warn(`${ID} | thumbnail skipped`, err); }
  await ChatMessage.create({
    content: summaryHtml(scene, floors, bottom, placed.notes, arch),
    whisper: ChatMessage.getWhisperRecipients("GM").map((u) => u.id),
    speaker: { alias: "NET Architecture" },
  });
  ui.notifications.info(`${scene.name}: ${floors.length} floors, ${need.size} kinds of ICE or Demon.`);
  await scene.view();
  return scene;
}

function open() {
  if (!game.user.isGM) return ui.notifications.warn("Only the GM can build architectures.");
  const tierOpts = TIERS.map((t) => `<option value="${t}"${t === "Standard" ? " selected" : ""}>${t} (DV ${TIER_DV[t]})</option>`).join("");
  const content = `
  <style>
    .cpr-netarch label { display:block; font-weight:bold; margin-top:6px; }
    .cpr-netarch .row { display:flex; gap:8px; align-items:flex-end; }
    .cpr-netarch .row > div { flex:1; }
    .cpr-netarch textarea { width:100%; min-height:260px; font-family:monospace; font-size:12px; white-space:pre; }
    .cpr-netarch .hint { font-size:11px; opacity:0.8; margin:4px 0 0; }
  </style>
  <form class="cpr-netarch" autocomplete="off">
    <div class="row">
      <div><label>Scene name</label><input type="text" name="name" value="NET Architecture"></div>
      <div><label>Difficulty</label><select name="tier">${tierOpts}</select></div>
      <div style="flex:0"><button type="button" data-roll title="Roll it by the book: 3d6 floors, d10 branches, Lobby and Body tables"><i class="fas fa-dice"></i> Roll by the book</button></div>
    </div>
    <label>Floors</label>
    <textarea name="floors" placeholder="Click Roll by the book and this fills in. Or type your own floors, one per line, like:&#10;1: Password DV8&#10;2: File DV8&#10;3: Hellhound x2&#10;4: Control Node DV8, Efreet&#10;Branch from 3:&#10;5: Killer&#10;6: File DV8"></textarea>
    <p class="hint">One floor per line. <code>Password DV8</code> &middot; <code>Hellhound x2</code> &middot; <code>Control Node, Efreet</code> &middot; <code>Branch from 3:</code> starts a branch.</p>
  </form>`;
  let rolled = null;
  new Dialog({
    title: "NET Architecture Scene",
    content,
    buttons: {
      build: {
        icon: '<i class="fas fa-hammer"></i>', label: "Build scene",
        callback: guard(async (html) => {
          const name = html.find("[name=name]").val().trim();
          const tier = html.find("[name=tier]").val();
          const text = html.find("[name=floors]").val();
          if (!text.trim()) throw new Error("No floors. Roll, or type them in.");
          await build({ name, tier, text, arch: rolled });
        }),
      },
      cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" },
    },
    default: "build",
    render: (html) => {
      html.find("[data-roll]").on("click", guard(async (ev) => {
        ev.preventDefault();
        const tier = html.find("[name=tier]").val();
        rolled = rollArchitecture(tier);
        html.find("[name=floors]").val(toText(rolled, rolled.header));
      }));
      html.find("[name=floors]").on("input", () => { rolled = null; });
    },
  }, { width: 620, resizable: true }).render(true);
}

Hooks.once("ready", () => {
  const mod = game.modules.get(ID);
  if (mod) mod.api = { open, build, roll: rollArchitecture, parse: parseText, toText, layout, ICE, DEMONS };
});

Hooks.on("renderSceneDirectory", (app, html) => {
  if (!game.user.isGM) return;
  const root = html instanceof HTMLElement ? html : html[0];
  if (!root || root.querySelector(".cpr-netarch-btn")) return;
  const header = root.querySelector(".directory-header .action-buttons, .header-actions.action-buttons, .directory-header");
  if (!header) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cpr-netarch-btn";
  btn.innerHTML = '<i class="fas fa-network-wired"></i> NET Architecture';
  btn.addEventListener("click", guard(async () => open()));
  header.appendChild(btn);
});

globalThis.CPRNetArch = { ID, G, LAT, TIERS, TIER_DV, ICE, DEMONS, LOBBY, BODY, parseEntry, parseText, toText, rollArchitecture, layout, buildSceneData, iceActorData, demonActorData, summaryHtml };
