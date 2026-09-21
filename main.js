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
/**
 * Lattice of 2x2 rooms: 9 columns (x 4..22) by 4 rows (y 2..10), in grid
 * units measured from the backdrop's corner. The entry row, y 6..8, is
 * level with the gate on the hall's left wall and the dais on its right.
 */
const LAT = { cols: 9, rows: 4, x0: 4, y0: 2, entryRow: 2 };
const ROOM = 2;
const PADDING = 0.25;
/**
 * Foundry pads every scene, and document coordinates count from the padded
 * canvas corner, not the backdrop's. The pad is rounded up to whole squares.
 */
const PAD = { x: Math.ceil((PADDING * SCENE.width) / G), y: Math.ceil((PADDING * SCENE.height) / G) };

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
  try { return layoutWith(arch, true); }
  catch (err) {
    // A right-aligned main path can box its branches against the hall's end;
    // fall back to the gate-side layout, which has the whole hall to spread into.
    const alt = layoutWith(arch, false);
    alt.notes.push("The main path starts at the gate instead of ending by the dais, to make room for its branches.");
    return alt;
  }
}

function layoutWith(arch, rightAlign) {
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
  // A main path that fits in one row is pushed to the right, so its last
  // floor, the Root, is the far-right room beside the dais; the corridor from
  // the gate just runs longer. Longer paths snake from the left instead.
  let main;
  if (rightAlign && arch.main.length <= cols) {
    main = [];
    for (let c = cols - arch.main.length; c < cols; c++) { main.push([c, entryRow]); used.add(key(c, entryRow)); }
  } else {
    budget = 200000;
    main = extend(-1, entryRow, arch.main.length, ["right", "left", "up", "down"]);
  }
  if (!main) throw new Error(`Cannot fit ${arch.main.length} main floors on the map (${cols * rows} rooms).`);
  const notes = [];
  const branches = [];
  arch.branches.forEach((b, bi) => {
    // Where the branch may hang: the asked-for floor first, then the other
    // main floors after the lobby, then off an earlier branch, then floor 1.
    const options = [];
    for (let d = 0; d < arch.main.length; d++) {
      for (const a of [b.attach - d, b.attach + d]) {
        if (a >= 2 && a <= arch.main.length && !options.some((o) => o.label === `floor ${a}`)) options.push({ cell: main[a - 1], label: `floor ${a}`, attach: a });
      }
    }
    branches.forEach((prev, pi) => prev.cells.forEach((cell) => options.push({ cell, label: `Branch ${String.fromCharCode(65 + pi)}`, attach: prev.attach })));
    options.push({ cell: main[0], label: "floor 1", attach: 1 });
    let cells = null, chosen = null;
    for (const o of options) {
      budget = 200000;
      cells = extend(o.cell[0], o.cell[1], b.floors.length, ["down", "right", "left", "up"]);
      if (cells) { chosen = o; break; }
    }
    if (!cells) throw new Error(`Cannot fit a ${b.floors.length}-floor branch anywhere on the map.`);
    if (chosen.label !== `floor ${b.attach}`) notes.push(`Branch ${String.fromCharCode(65 + bi)} was moved from floor ${b.attach} to ${chosen.label} to fit the map.`);
    branches.push({ attach: chosen.attach, attachCell: chosen.cell, attachLabel: chosen.label, cells });
  });
  return { main, branches, notes };
}

/* ------------------------------------------------------------------ */
/*  Scene data                                                         */
/* ------------------------------------------------------------------ */

/**
 * Where the NET art sits on a canvas: the grid size and the padding offset
 * in squares. The default is the NET scene itself. Building under another
 * scene passes that scene's numbers, and the art scales to its grid.
 */
const NET_SPACE = { g: G, padX: PAD.x, padY: PAD.y };
/** The Levels band an embedded NET occupies, in scene distance units. */
const NET_LEVEL = { bottom: -12, top: -8, elev: -10 };

const X = (sp, x) => Math.round((sp.padX + x) * sp.g);
const Y = (sp, y) => Math.round((sp.padY + y) * sp.g);

function wallDoc(sp, c, { door = 0, ds = 0, sight = 20 } = {}) {
  return { c: [X(sp, c[0]), Y(sp, c[1]), X(sp, c[2]), Y(sp, c[3])], move: 20, sight, light: sight, sound: sight, door, ds, dir: 0 };
}

function tokenDoc(sp, { name, src, x, y, actorId = null, hostile = false, bar = null, w = 1, h = 1 }) {
  return {
    name, x: X(sp, x), y: Y(sp, y), width: w, height: h,
    texture: { src, fit: "contain", anchorX: 0.5, anchorY: 0.5, scaleX: 1, scaleY: 1, alphaThreshold: 0.75 },
    actorId, actorLink: false, disposition: hostile ? -1 : 0,
    displayName: 30, displayBars: bar ? 20 : 0, bar1: { attribute: bar },
    sight: { enabled: false, range: 0 }, hidden: false,
  };
}

function tileDoc(sp, { src, x, y, w, h, sort = 0 }) {
  return { x: X(sp, x), y: Y(sp, y), width: Math.round(w * sp.g), height: Math.round(h * sp.g), texture: { src, fit: "contain", anchorX: 0.5, anchorY: 0.5 }, sort, alpha: 1, hidden: false, locked: false, elevation: 0 };
}

/** Grid coordinates of the room in cell (c, r), measured from the backdrop's corner. */
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

/** Levels and Wall Height flags for a document that belongs to an embedded NET. */
function tagged(kind, doc, embed) {
  if (!embed) return doc;
  const { level, tag } = embed;
  const flags = { ...(doc.flags ?? {}), [ID]: { net: tag } };
  if (kind === "wall") flags["wall-height"] = { top: level.top, bottom: level.bottom };
  if (kind === "tile") { flags.levels = { rangeBottom: level.bottom, rangeTop: level.top, showIfAbove: false, noCollision: false }; doc.elevation = level.bottom; }
  if (kind === "token") doc.elevation = level.elev;
  return { ...doc, flags };
}

/**
 * Turns a parsed architecture plus its layout into Scene.create data, or,
 * with `embed`, into documents to lay under an existing scene. ids maps an
 * ICE or Demon name to the actor id its tokens should use.
 */
function buildSceneData(arch, placed, { name, backdrop, art, ids = {}, tierDv = null, sp = NET_SPACE, embed = null }) {
  const edges = new Map();
  const setEdge = (c, opts) => { const k = edgeKey(c); if (opts.door || !edges.has(k)) edges.set(k, wallDoc(sp, c, opts)); };

  // A numbered floor list: main first, then each branch, in map order.
  const floors = [];
  let n = 0;
  arch.main.forEach((f, i) => floors.push({ n: ++n, path: "Main", cell: placed.main[i], items: f.items }));
  placed.branches.forEach((b, bi) => {
    const src = arch.branches[bi];
    src.floors.forEach((f, i) => floors.push({ n: ++n, path: `Branch ${String.fromCharCode(65 + bi)} (off ${b.attachLabel ?? `floor ${b.attach}`})`, cell: b.cells[i], items: f.items }));
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
  placed.branches.forEach((b) => chain([b.attachCell ?? placed.main[b.attach - 1], ...b.cells]));

  // The entry corridor: see-through side walls, an open door into floor 1.
  const E = roomAt(placed.main[0]);
  const walls = [
    wallDoc(sp, [0, E.y, E.x, E.y], { sight: 0 }),
    wallDoc(sp, [0, E.y + ROOM, E.x, E.y + ROOM], { sight: 0 }),
    wallDoc(sp, [0, E.y, 0, E.y + ROOM], { sight: 0 }),
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
    const place = (t) => { const [dx, dy] = slots[Math.min(s++, slots.length - 1)]; tokens.push(tokenDoc(sp, { ...t, x: R.x + dx, y: R.y + dy })); };
    for (const it of f.items) {
      if (it.kind === "node") {
        const dv = dvOf(it);
        const file = NODE_ART[it.node] + ([6, 8, 10, 12].includes(dv) ? `DV${dv}` : "");
        place({ name: NODE_LABEL[it.node] + (dv ? ` DV${dv}` : ""), src: `${art}/${file}.webm` });
      } else if (it.kind === "ice") {
        for (let k = 0; k < it.count; k++) place({ name: it.name, src: `${art}/${it.name}.webm`, actorId: ids[it.name] ?? null, hostile: true, bar: "stats.rez" });
      } else if (it.kind === "demon") {
        place({ name: it.name, src: `${art}/${it.name}.webm`, actorId: ids[it.name] ?? null, hostile: true, bar: "stats.rez" });
      }
    }
  }

  // Tiles: the backdrop when embedded, a floor number in each room's corner, and the Root under the deepest floor.
  const tiles = [];
  if (embed) tiles.push(tileDoc(sp, { src: backdrop, x: 0, y: 0, w: SCENE.width / G, h: SCENE.height / G, sort: -100 }));
  for (const f of floors) {
    const R = roomAt(f.cell);
    const label = f.n <= 30 ? String(f.n) : "INFINITE";
    tiles.push(tileDoc(sp, { src: `${art}/NUMBERS/${label}.webm`, x: R.x + 0.05, y: R.y + 0.05, w: 0.55, h: 0.55, sort: 10 }));
  }
  let deepest = { depth: placed.main.length, cell: placed.main[placed.main.length - 1], n: placed.main.length };
  placed.branches.forEach((b, bi) => {
    const depth = b.attach + b.cells.length;
    if (depth > deepest.depth) {
      const first = floors.find((f) => f.path.startsWith(`Branch ${String.fromCharCode(65 + bi)}`));
      deepest = { depth, cell: b.cells[b.cells.length - 1], n: first.n + b.cells.length - 1 };
    }
  });
  { const R = roomAt(deepest.cell); tiles.push(tileDoc(sp, { src: `${art}/Root.webm`, x: R.x, y: R.y, w: ROOM, h: ROOM, sort: 0 })); }

  const record = { floors: floors.map((f) => ({ n: f.n, path: f.path, cell: f.cell, text: floorText(f) })), bottom: deepest.n, notes: placed.notes };
  const docs = {
    walls: walls.map((w) => tagged("wall", w, embed)),
    tokens: tokens.map((t) => tagged("token", t, embed)),
    tiles: tiles.map((t) => tagged("tile", t, embed)),
  };
  const sceneData = {
    name, navigation: true,
    width: SCENE.width, height: SCENE.height, padding: PADDING,
    background: { src: backdrop, fit: "fill" }, backgroundColor: "#000000",
    grid: { type: 1, size: G, distance: 2, units: "m", alpha: 0.2, color: "#ffffff" },
    tokenVision: true, fog: { exploration: true },
    environment: { darknessLevel: 0, globalLight: { enabled: true, alpha: 0.5, bright: false } },
    initial: { x: PAD.x * G + SCENE.width / 2, y: PAD.y * G + SCENE.height / 2, scale: 0.5 },
    walls: docs.walls, tokens: docs.tokens, tiles: docs.tiles,
    flags: { [ID]: record },
  };
  /** The corridor square where a jacked-in runner appears, in canvas pixels. */
  const entry = { x: X(sp, LAT.x0 - 2), y: Y(sp, LAT.y0 + ROOM * LAT.entryRow) };
  return { sceneData, docs, floors, bottom: deepest.n, record, entry };
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
  registerSense();
  Hooks.once("setup", registerSense);
  Hooks.once("ready", registerSense);
  Hooks.on("canvasReady", registerSense);
  Hooks.on("renderTokenConfig", registerSense);
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
  game.keybindings.register(ID, "toggle", {
    name: "Jack in, or switch between floor and NET",
    hint: "Not jacked in: jacks you in if a found access point is within 6 metres. Jacked in: jumps your view between your body and your NET token.",
    editable: [{ key: "KeyJ", modifiers: ["Shift"] }],
    onDown: () => { toggleView().catch(reportErr); return true; },
  });
  game.keybindings.register(ID, "scan", {
    name: "Scanner",
    hint: "The Scanner Meat Action: Interface + 1d10 against DV 6 (set per scene in the NET flag). A success reveals the nearest hidden access point.",
    editable: [{ key: "KeyS", modifiers: ["Shift"] }],
    onDown: () => { scanner().catch(reportErr); return true; },
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

/** Everything a build needs before any document is made: the parsed floors, their layout, the art, and the actors. */
async function prepare({ tier, text, arch: rolled = null }) {
  const arch = parseText(text);
  if (rolled?.header) arch.header = rolled.header;
  const placed = layout(arch);
  const art = String(game.settings.get(ID, "artBase")).replace(/\/+$/, "");
  const backdrop = game.settings.get(ID, "backdrop");
  const need = new Set();
  [...arch.main, ...arch.branches.flatMap((b) => b.floors)].forEach((f) => f.items.forEach((it) => { if (it.kind !== "node") need.add(it.name); }));
  const ids = {};
  for (const nm of need) ids[nm] = (await ensureActor(nm, art)).id;
  return { arch, placed, art, backdrop, ids, need, tierDv: TIER_DV[tier] ?? null };
}

async function whisperSummary(scene, floors, bottom, notes, arch) {
  await ChatMessage.create({
    content: summaryHtml(scene, floors, bottom, notes, arch),
    whisper: ChatMessage.getWhisperRecipients("GM").map((u) => u.id),
    speaker: { alias: "NET Architecture" },
  });
}

/** Builds a new scene from the floors text. tier sets the DV of nodes typed without one. */
async function build({ name, tier, text, arch: rolled = null }) {
  const { arch, placed, art, backdrop, ids, need, tierDv } = await prepare({ tier, text, arch: rolled });
  const { sceneData, floors, bottom } = buildSceneData(arch, placed, { name: name || "NET Architecture", backdrop, art, ids, tierDv });
  const scene = await Scene.create(sceneData);
  try { const t = await scene.createThumbnail(); if (t?.thumb) await scene.update({ thumb: t.thumb }); } catch (err) { console.warn(`${ID} | thumbnail skipped`, err); }
  await whisperSummary(scene, floors, bottom, placed.notes, arch);
  ui.notifications.info(`${scene.name}: ${floors.length} floors, ${need.size} kinds of ICE or Demon.`);
  await scene.view();
  return scene;
}

/* ------------------------------------------------------------------ */
/*  The NET under a scene (Levels)                                     */
/* ------------------------------------------------------------------ */

function levelsReady() {
  return game.modules.get("levels")?.active && game.modules.get("wall-height")?.active;
}

/**
 * Lays the architecture under the scene currently on the canvas: the
 * backdrop as a Levels tile, walls with Wall Height ranges, tokens at the
 * NET elevation, and a hidden access-point marker at the centre of the view.
 */
async function buildUnder({ tier, text, arch: rolled = null }) {
  const scene = canvas?.scene;
  if (!scene) throw new Error("Open the scene you want the NET under first.");
  if (!levelsReady()) throw new Error("Building under a scene needs the Levels and Wall Height modules active.");
  if (scene.getFlag(ID, "net")) throw new Error(`${scene.name} already has a NET under it. Remove it first.`);
  const { arch, placed, art, backdrop, ids, need, tierDv } = await prepare({ tier, text, arch: rolled });

  const g = scene.grid.size;
  const sp = { g, padX: Math.ceil((scene.padding * scene.width) / g), padY: Math.ceil((scene.padding * scene.height) / g) };
  const tag = foundry.utils.randomID();
  const { docs, floors, bottom, record, entry } = buildSceneData(arch, placed, { name: scene.name, backdrop, art, ids, tierDv, sp, embed: { level: NET_LEVEL, tag } });

  // The access point: hidden, at the middle of whatever the GM is looking at, dragged into place afterwards.
  const pivot = canvas.stage.pivot;
  const ap = tagged("token", {
    name: "Access Point", x: Math.floor(pivot.x / g) * g, y: Math.floor(pivot.y / g) * g, width: 1, height: 1,
    texture: { src: "icons/svg/net.svg", fit: "contain", anchorX: 0.5, anchorY: 0.5, scaleX: 1, scaleY: 1, tint: "#66ffcc" },
    actorId: null, actorLink: false, disposition: 0, displayName: 30, displayBars: 0, hidden: true, sight: { enabled: false },
  }, { level: { elev: 0 }, tag });
  ap.flags[ID].accessPoint = true;

  await scene.createEmbeddedDocuments("Tile", docs.tiles);
  await scene.createEmbeddedDocuments("Wall", docs.walls);
  await scene.createEmbeddedDocuments("Token", [...docs.tokens, ap]);
  await scene.setFlag(ID, "net", { tag, sp, entry, level: NET_LEVEL, scanDv: 6, ...record });
  // Put the NET on Levels' floor picker so the GM can look down without selecting a token.
  const levels = (scene.getFlag("levels", "sceneLevels") ?? []).filter((l) => l?.[2] !== "NET");
  if (!levels.some((l) => Number(l[0]) <= 0 && Number(l[1]) >= 0)) levels.push(["0", "8", "Floor"]);
  levels.push([String(NET_LEVEL.bottom), String(NET_LEVEL.top), "NET"]);
  await scene.setFlag("levels", "sceneLevels", levels);
  await whisperSummary(scene, floors, bottom, placed.notes, arch);
  ui.notifications.info(`NET laid under ${scene.name}: ${floors.length} floors at elevation ${NET_LEVEL.elev}. The access point is hidden at the centre of your view; drag it where it belongs.`);
}

/** Removes everything a build placed under the current scene, avatars included. */
async function removeUnder() {
  const scene = canvas?.scene;
  const net = scene?.getFlag(ID, "net");
  if (!net) throw new Error("This scene has no NET under it.");
  const mine = (c) => c.filter((d) => d.getFlag(ID, "net") === net.tag).map((d) => d.id);
  const tokens = scene.tokens.filter((t) => t.getFlag(ID, "net") === net.tag || t.getFlag(ID, "avatarOf")).map((t) => t.id);
  if (tokens.length) await scene.deleteEmbeddedDocuments("Token", tokens);
  const walls = mine(scene.walls); if (walls.length) await scene.deleteEmbeddedDocuments("Wall", walls);
  const tiles = mine(scene.tiles); if (tiles.length) await scene.deleteEmbeddedDocuments("Tile", tiles);
  const pins = scene.notes.filter((n) => n.getFlag(ID, "accessPin")).map((n) => n.id); if (pins.length) await scene.deleteEmbeddedDocuments("Note", pins);
  await scene.unsetFlag(ID, "net");
  const levels = (scene.getFlag("levels", "sceneLevels") ?? []).filter((l) => l?.[2] !== "NET");
  await scene.setFlag("levels", "sceneLevels", levels);
  ui.notifications.info(`NET removed from ${scene.name}.`);
}

/* ------------------------------------------------------------------ */
/*  Jacking in and out                                                 */
/* ------------------------------------------------------------------ */

const SOCKET = `module.${ID}`;

/** The jacked-in copy of a body token, if there is one. */
const avatarOf = (scene, bodyId) => scene.tokens.find((t) => t.getFlag(ID, "avatarOf") === bodyId) ?? null;

/** True when a revealed access point is within the book's six metres of the token. */
function nearAccessPoint(token) {
  const scene = token.parent;
  const g = scene.grid.size;
  const perSquare = scene.grid.distance || 2;
  const reach = (6 / perSquare) * g + g / 2;
  return scene.tokens.some((t) => t.getFlag(ID, "accessPoint") && t.getFlag(ID, "scanned") && !t.hidden && Math.hypot(t.x - token.x, t.y - token.y) <= reach);
}

async function jackIn(scene, bodyId) {
  const body = scene.tokens.get(bodyId);
  const net = scene.getFlag(ID, "net");
  if (!body || !net || avatarOf(scene, bodyId)) return;
  const data = body.toObject();
  delete data._id;
  data.name = `${body.name} (NET)`;
  data.x = net.entry.x; data.y = net.entry.y;
  data.elevation = net.level.elev;
  data.hidden = false;
  data.sight = { ...(data.sight ?? {}), enabled: true };
  data.flags = { ...(data.flags ?? {}), [ID]: { avatarOf: bodyId, net: net.tag } };
  await scene.createEmbeddedDocuments("Token", [data]);
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: body.actor, token: body }), content: `<b>${body.name} jacks in.</b>` });
}

async function jackOut(scene, bodyId) {
  const avatar = avatarOf(scene, bodyId);
  const body = scene.tokens.get(bodyId);
  avatar?.object?.release?.();
  if (avatar && body) await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: body.actor, token: body }), content: `<b>${body.name} jacks out.</b>` });
  if (avatar) await scene.deleteEmbeddedDocuments("Token", [avatar.id]);
}

/** Players cannot create or delete tokens, so the GM's client does it for them. */
async function handleSocket(msg) {
  const scene = game.scenes.get(msg.sceneId);
  if (!scene) return;
  if (msg.action === "jackIn") await jackIn(scene, msg.bodyId);
  if (msg.action === "jackOut") await jackOut(scene, msg.bodyId);
  if (msg.action === "reveal") await revealAccessPoint(scene, scene.tokens.get(msg.tokenId));
}

async function requestJack(action, scene, bodyId) {
  const msg = { action, sceneId: scene.id, bodyId };
  if (game.user.isGM) return handleSocket(msg);
  if (!game.users.activeGM) return ui.notifications.warn("No GM is online to jack you in.");
  game.socket.emit(SOCKET, msg);
}

/** The body of a token, whether it is the body itself or its avatar. */
const bodyIdOf = (token) => token.getFlag(ID, "avatarOf") ?? token.id;

/* Found access points are seen through walls by way of a detection mode: a "sense" that only ever detects a found
   access point on the viewer's own level. Scanner gives the location, not a view, and the NET below never sees it. */
const SENSE = "cprNetarchAccess";
function registerSense() {
  try {
    if (CONFIG.Canvas.detectionModes[SENSE]) return;
    // Foundry declares its client classes as top-level bindings, not window properties: reach it by name, not through globalThis.
    const DM = (typeof DetectionMode !== "undefined" ? DetectionMode : null) ?? foundry.canvas?.perception?.DetectionMode ?? globalThis.DetectionMode;
    if (!DM) throw new Error("DetectionMode class not found");
    class AccessPointSense extends DM {
      static getDetectionFilter() {
        // Same call core makes for its own "See All" mode; anything fancier risks a shader error that blacks out the canvas.
        try {
          const F = typeof OutlineOverlayFilter !== "undefined" ? OutlineOverlayFilter : foundry.canvas?.rendering?.filters?.OutlineOverlayFilter;
          return F ? (this._detectionFilter ??= F.create({ knockout: false, wave: false })) : undefined;
        } catch (err) { console.warn(`${ID} | detection filter unavailable`, err); return undefined; }
      }
      _canDetect(visionSource, target) {
        const d = target?.document;
        if (!d?.getFlag?.(ID, "accessPoint") || !d.getFlag(ID, "scanned") || d.hidden) return false;
        const src = visionSource?.elevation ?? visionSource?.object?.document?.elevation ?? 0;
        return Math.abs(src - (d.elevation ?? 0)) < 2;
      }
    }
    CONFIG.Canvas.detectionModes[SENSE] = new AccessPointSense({ id: SENSE, label: "NET access point", type: DM.DETECTION_TYPES.OTHER, walls: false, angle: false, tokenConfig: true });
    console.log(`${ID} | registered detection mode ${SENSE}`);
  } catch (err) {
    console.error(`${ID} | could not register the access point sense; found points will only show in line of sight`, err);
    ui.notifications?.error?.(`NET builder: could not register the access point sense (${err.message}).`);
  }
}
/** Gives every player-owned character token on the scene the sense, so the crew sees what their runner found. */
async function grantSense(scene) {
  registerSense();
  const updates = [];
  for (const t of scene.tokens) {
    if (t.getFlag(ID, "accessPoint") || t.getFlag(ID, "avatarOf")) continue;
    if (!game.users.some((u) => !u.isGM && t.testUserPermission(u, "OWNER"))) continue;
    const modes = (t.detectionModes ?? []).filter((m) => m.id !== SENSE);
    updates.push({ _id: t.id, detectionModes: [...modes, { id: SENSE, enabled: true, range: 9999 }] });
  }
  if (updates.length) await scene.updateEmbeddedDocuments("Token", updates, { cprNetarch: true });
}
async function revealAccessPoint(scene, t) {
  if (!t?.getFlag(ID, "accessPoint")) return;
  await t.update({ hidden: false, [`flags.${ID}.scanned`]: true }, { cprNetarch: true });
  await grantSense(scene);
}
async function concealAccessPoint(scene, t) {
  if (!t?.getFlag(ID, "accessPoint")) return;
  await t.update({ hidden: true, [`flags.${ID}.scanned`]: false }, { cprNetarch: true });
}
/* The GM's eye toggle on an access point flips it between found and not found. The token itself never shows. */
/* Every client re-runs vision when a point is found or a token gains the sense, so the reveal shows without a nudge. */
Hooks.on("updateToken", (doc, changes) => {
  if (!canvas?.ready || doc.parent?.id !== canvas.scene?.id) return;
  if ("detectionModes" in changes || (doc.getFlag(ID, "accessPoint") && ("hidden" in changes || foundry.utils.hasProperty(changes, `flags.${ID}.scanned`)))) {
    canvas.perception.update({ refreshVision: true, refreshOcclusion: true });
  }
});
Hooks.on("updateToken", (doc, changes, options, userId) => {
  if (!game.user.isGM || userId !== game.user.id || !doc.getFlag(ID, "accessPoint") || options?.cprNetarch) return;
  if (changes.hidden === false) revealAccessPoint(doc.parent, doc).catch(reportErr);
  else if (changes.hidden === true) concealAccessPoint(doc.parent, doc).catch(reportErr);
});

/** The DV a Scanner check needs here: the architecture's tier DV, read from the build record. */
function scanDv(scene) {
  const net = scene.getFlag(ID, "net");
  if (!net) return null;
  return Number.isInteger(net.scanDv) ? net.scanDv : 6;
}

/** A Cyberpunk RED check die: d10, exploding on a 10, imploding on a 1. */
async function checkDie() {
  const first = await new Roll("1d10").evaluate();
  let total = first.total, note = "";
  if (first.total === 10) { const r = await new Roll("1d10").evaluate(); total += r.total; note = ` (10, +${r.total})`; }
  else if (first.total === 1) { const r = await new Roll("1d10").evaluate(); total -= r.total; note = ` (1, −${r.total})`; }
  return { total, note };
}

/** Runs the system's own Interface check for a role item: the CPR roll dialog, 3D dice, LUCK spend and the CPR roll card.
 *  Falls back to a bare d10 if the system's roll pipeline is not where we expect it. Returns the total, or null if cancelled. */
async function interfaceCheck(actor, token, role) {
  try {
    const cprRoll = role.createRoll("roleAbility", actor, { rollSubType: "mainRoleAbility" });
    const keep = await cprRoll.handleRollDialog({ type: "keydown", ctrlKey: false, metaKey: false }, actor, role);
    if (!keep) return null;
    await cprRoll.roll();
    if (Number.isInteger(cprRoll.luck) && cprRoll.luck > 0) {
      const luck = actor.system.stats.luck.value;
      await actor.update({ "system.stats.luck.value": luck - Math.min(luck, cprRoll.luck) });
    }
    cprRoll.entityData = { actor: actor.id, token: token.id, tokens: [], item: role.id };
    cprRoll.criticalCard = cprRoll.wasCritical();
    const content = await renderTemplate(cprRoll.rollCard, cprRoll);
    const rollMode = game.settings.get("core", "rollMode");
    const chatData = { user: game.user.id, rollMode, content, sound: CONFIG.sounds.dice, speaker: ChatMessage.getSpeaker({ actor, token }) };
    if (["gmroll", "blindroll"].includes(rollMode)) chatData.whisper = ChatMessage.getWhisperRecipients("GM").map((u) => u.id);
    if (rollMode === "blindroll") chatData.blind = true; else if (rollMode === "selfroll") chatData.whisper = [game.user.id];
    await ChatMessage.create(chatData);
    return Number(cprRoll.resultTotal);
  } catch (err) {
    console.warn(`${ID} | system roll pipeline unavailable, rolling a plain d10`, err);
    const die = await checkDie();
    const rank = Number(role?.system?.rank) || 0;
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor, token }), content: `<b>Interface</b> ${rank} + d10 ${die.total}${die.note} = <b>${rank + die.total}</b>` });
    return rank + die.total;
  }
}

/** The Scanner Meat Action: an Interface check against the scene's Scanner DV. Success reveals the nearest hidden access point. */
async function scanner() {
  const scene = canvas?.scene;
  if (!scene?.getFlag(ID, "net")) return ui.notifications.warn("There is no NET architecture under this scene.");
  const token = canvas.tokens.controlled[0]?.document ?? scene.tokens.find((t) => t.isOwner && !t.getFlag(ID, "avatarOf") && !t.getFlag(ID, "accessPoint"));
  if (!token) return ui.notifications.warn("Select your token first.");
  if (token.getFlag(ID, "avatarOf")) return ui.notifications.warn("Scanner is a Meat Action. Do it from your body, not the NET.");
  const actor = token.actor;
  const role = actor?.items?.find((i) => i.type === "role" && (String(i.system?.mainRoleAbility ?? "").toLowerCase() === "interface" || /netrunner/i.test(i.name)));
  if (!role) return ui.notifications.warn(`${actor?.name ?? "This token"} has no Netrunner role to Scan with.`);
  const dv = scanDv(scene);
  const hidden = scene.tokens.filter((t) => t.getFlag(ID, "accessPoint") && !t.getFlag(ID, "scanned"))
    .sort((a, b) => Math.hypot(a.x - token.x, a.y - token.y) - Math.hypot(b.x - token.x, b.y - token.y));
  const total = await interfaceCheck(actor, token, role);
  if (total === null) return;
  const ok = total > dv;
  const found = ok && hidden.length ? hidden[0] : null;
  const g = scene.grid.size, per = scene.grid.distance || 2;
  const dist = found ? Math.max(per, Math.ceil((Math.hypot(found.x - token.x, found.y - token.y) / g)) * per) : 0;
  const name = actor?.name ?? token.name;
  const result = ok ? (found ? `There is an access point within ${dist} metres.` : `Nothing here they have not already found.`) : `Unable to identify nearby access points.`;
  const line = `<b>${name} uses their Scanner.</b> ${result}`;
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor, token }), content: `<div class="cpr-netarch-scan">${line}</div>` });
  if (!found) return;
  const msg = { action: "reveal", sceneId: scene.id, tokenId: found.id };
  if (game.user.isGM) return handleSocket(msg);
  if (!game.users.activeGM) return ui.notifications.warn("No GM is online to reveal what you found.");
  game.socket.emit(SOCKET, msg);
}

/** Switches the viewer between their body and their NET avatar. */
async function toggleView() {
  const scene = canvas?.scene;
  if (!scene) return;
  const current = canvas.tokens.controlled[0]?.document
    ?? scene.tokens.find((t) => t.isOwner && !t.getFlag(ID, "avatarOf") && avatarOf(scene, t.id))
    ?? scene.tokens.find((t) => t.isOwner && !t.getFlag(ID, "avatarOf"));
  if (!current) return ui.notifications.warn("You have no token on this scene.");
  const bodyId = bodyIdOf(current);
  const target = current.id === bodyId ? avatarOf(scene, bodyId) : scene.tokens.get(bodyId);
  if (!target && current.id === bodyId) {
    if (!scene.getFlag(ID, "net")) return ui.notifications.warn("There is no NET architecture here.");
    if (!nearAccessPoint(current)) return ui.notifications.warn("There is no revealed NET access point within 6 metres.");
    return requestJack("jackIn", scene, bodyId);
  }
  if (!target) return ui.notifications.warn("Your body is not on this scene.");
  target.object?.control({ releaseOthers: true });
  const g = scene.grid.size;
  await canvas.animatePan({ x: target.x + (target.width * g) / 2, y: target.y + (target.height * g) / 2, duration: 250 });
}

/* Double-clicking a found access point jacks you in, if your body is within 6 metres. Replaces the "no actor" warning. */
Hooks.once("ready", () => {
  const proto = CONFIG.Token.objectClass.prototype;
  const handler = function (wrapped, ...args) {
    const d = this.document;
    if (!d?.getFlag(ID, "accessPoint")) return wrapped(...args);
    const scene = d.parent;
    if (!d.getFlag(ID, "scanned") || d.hidden) { ui.notifications.warn("This access point has not been revealed."); return; }
    const body = scene.tokens.find((t) => t.isOwner && !t.getFlag(ID, "avatarOf") && !t.getFlag(ID, "accessPoint") && nearAccessPoint(t))
      ?? null;
    if (!body) { ui.notifications.warn("Your body is not within 6 metres of this access point."); return; }
    if (avatarOf(scene, body.id)) { toggleView().catch(reportErr); return; }
    requestJack("jackIn", scene, body.id);
  };
  if (globalThis.libWrapper) libWrapper.register(ID, "CONFIG.Token.objectClass.prototype._onClickLeft2", handler, "MIXED");
  else { const orig = proto._onClickLeft2; proto._onClickLeft2 = function (...args) { return handler.call(this, orig.bind(this), ...args); }; }
});

Hooks.on("renderTokenHUD", (hud, html) => {
  try {
    const root = html instanceof HTMLElement ? html : html[0];
    const token = hud.object?.document;
    if (!root || !token || !token.isOwner) return;
    const scene = token.parent;
    if (!scene.getFlag(ID, "net")) return;
    const bodyId = bodyIdOf(token);
    const body = scene.tokens.get(bodyId);
    if (!body || token.getFlag(ID, "accessPoint")) return;
    const jacked = !!avatarOf(scene, bodyId);
    const runner = token.actor?.items?.some((i) => i.type === "role" && (String(i.system?.mainRoleAbility ?? "").toLowerCase() === "interface" || /netrunner/i.test(i.name)));
    if (!jacked && token.id === bodyId && runner) {
      const sb = document.createElement("div");
      sb.className = "control-icon cpr-netarch-scan";
      sb.title = "Scanner (Shift+S)";
      sb.innerHTML = `<i class="fas fa-satellite-dish"></i>`;
      sb.addEventListener("click", guard(async () => { await scanner(); hud.clear(); }));
      (root.querySelector(".col.left") ?? root).appendChild(sb);
    }
    if (!jacked && !nearAccessPoint(body)) return;
    const btn = document.createElement("div");
    btn.className = "control-icon cpr-netarch-jack";
    btn.title = jacked ? "Jack Out" : "Jack In";
    btn.innerHTML = `<i class="fas ${jacked ? "fa-plug-circle-xmark" : "fa-plug"}"></i>`;
    btn.addEventListener("click", guard(async () => {
      await requestJack(jacked ? "jackOut" : "jackIn", scene, bodyId);
      hud.clear();
    }));
    (root.querySelector(".col.left") ?? root).appendChild(btn);
  } catch (err) { console.error(`${ID} | token HUD`, err); }
});

/* ------------------------------------------------------------------ */
/*  Dialog and hooks                                                   */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  The floors editor                                                  */
/* ------------------------------------------------------------------ */

const KIND_OPTIONS = [
  ["password", "Password"], ["file", "File"], ["control", "Control Node"],
  ...Object.keys(ICE).map((n) => [`ice:${n}`, `${n} (ICE)`]),
  ...Object.keys(DEMONS).map((n) => [`demon:${n}`, `${n} (Demon)`]),
];
const itemKey = (it) => (it.kind === "node" ? it.node : `${it.kind}:${it.name}`);
function itemFromKey(key, old = {}) {
  if (key.startsWith("ice:")) return { kind: "ice", name: key.slice(4), count: old.count ?? 1 };
  if (key.startsWith("demon:")) return { kind: "demon", name: key.slice(6) };
  return { kind: "node", node: key, dv: old.dv ?? null };
}
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** One floor row: its items as dropdowns, and the buttons that shape it. */
function floorRow(n, floor, path) {
  const items = floor.items.map((it, ii) => {
    const key = itemKey(it);
    const opts = KIND_OPTIONS.map(([k, l]) => `<option value="${k}"${k === key ? " selected" : ""}>${l}</option>`).join("");
    const dv = it.kind === "node"
      ? `<select data-dv data-path="${path}" data-item="${ii}" title="DV; blank uses the difficulty's">${["", 6, 8, 10, 12].map((d) => `<option value="${d}"${String(it.dv ?? "") === String(d) ? " selected" : ""}>${d === "" ? "DV (tier)" : `DV ${d}`}</option>`).join("")}</select>`
      : "";
    const count = it.kind === "ice"
      ? `<input type="number" min="1" max="9" data-count data-path="${path}" data-item="${ii}" value="${it.count ?? 1}" title="How many" style="width:44px">`
      : "";
    return `<span class="item"><select data-kind data-path="${path}" data-item="${ii}">${opts}</select>${dv}${count}<a data-del-item data-path="${path}" data-item="${ii}" title="Remove this piece"><i class="fas fa-times"></i></a></span>`;
  }).join("");
  return `<div class="floor"><span class="num">${n}</span>${items}
    <a data-add-item data-path="${path}" title="Add another piece to this floor"><i class="fas fa-plus"></i></a>
    <span class="tools"><a data-up data-path="${path}" title="Move up"><i class="fas fa-arrow-up"></i></a><a data-down data-path="${path}" title="Move down"><i class="fas fa-arrow-down"></i></a><a data-del-floor data-path="${path}" title="Remove floor"><i class="fas fa-trash"></i></a></span></div>`;
}

function renderRows(state) {
  let n = 0;
  const main = state.main.map((f, i) => floorRow(++n, f, `m.${i}`)).join("");
  const branches = state.branches.map((b, bi) => {
    const rows = b.floors.map((f, i) => floorRow(++n, f, `b${bi}.${i}`)).join("");
    return `<div class="branch"><div class="bhead">Branch ${String.fromCharCode(65 + bi)} from floor
      <input type="number" min="2" data-attach data-branch="${bi}" value="${b.attach}" style="width:48px">
      <a data-add-floor data-branch="${bi}" title="Add a floor to this branch"><i class="fas fa-plus"></i> floor</a>
      <a data-del-branch data-branch="${bi}" title="Remove this branch"><i class="fas fa-trash"></i></a></div>${rows}</div>`;
  }).join("");
  return `${main}<div class="bhead"><a data-add-floor data-branch="-1"><i class="fas fa-plus"></i> floor</a> <a data-add-branch><i class="fas fa-code-branch"></i> branch</a></div>${branches}`;
}

/** Resolves a data-path like "m.2" or "b0.1" to the floor list and index it names. */
function floorAt(state, path) {
  const [g, i] = path.split(".");
  const list = g === "m" ? state.main : state.branches[Number(g.slice(1))].floors;
  return { list, i: Number(i) };
}

function open() {
  if (!game.user.isGM) return ui.notifications.warn("Only the GM can build architectures.");
  const tierOpts = TIERS.map((t) => `<option value="${t}"${t === "Standard" ? " selected" : ""}>${t} (DV ${TIER_DV[t]})</option>`).join("");
  const here = canvas?.scene?.name ?? "the current scene";
  const content = `
  <style>
    .cpr-netarch label { display:block; font-weight:bold; margin-top:6px; }
    .cpr-netarch .row { display:flex; gap:8px; align-items:flex-end; }
    .cpr-netarch .row > div { flex:1; }
    .cpr-netarch .floors { border:1px solid #999; border-radius:4px; padding:6px; min-height:120px; max-height:340px; overflow:auto; background:rgba(0,0,0,0.04); }
    .cpr-netarch .floor { display:flex; flex-wrap:wrap; align-items:center; gap:4px; padding:3px 2px; border-bottom:1px solid rgba(0,0,0,0.1); }
    .cpr-netarch .floor .num { display:inline-block; min-width:22px; font-weight:bold; text-align:right; margin-right:4px; }
    .cpr-netarch .item { display:inline-flex; align-items:center; gap:2px; background:rgba(0,0,0,0.06); border-radius:3px; padding:1px 3px; }
    .cpr-netarch .item select { width:auto; height:24px; font-size:12px; }
    .cpr-netarch .floor a, .cpr-netarch .bhead a { cursor:pointer; padding:0 4px; opacity:0.7; }
    .cpr-netarch .floor a:hover, .cpr-netarch .bhead a:hover { opacity:1; }
    .cpr-netarch .tools { margin-left:auto; white-space:nowrap; }
    .cpr-netarch .branch { margin-top:6px; border-left:3px solid #888; padding-left:6px; }
    .cpr-netarch .bhead { font-weight:bold; padding:4px 2px; }
    .cpr-netarch textarea { width:100%; min-height:120px; font-family:monospace; font-size:12px; white-space:pre; }
    .cpr-netarch .hint { font-size:11px; opacity:0.8; margin:4px 0 0; }
  </style>
  <form class="cpr-netarch" autocomplete="off">
    <div class="row">
      <div><label>Scene name (new scene only)</label><input type="text" name="name" value="NET Architecture"></div>
      <div><label>Difficulty</label><select name="tier">${tierOpts}</select></div>
      <div style="flex:0 0 auto"><button type="button" data-roll style="width:auto;white-space:nowrap;padding:0 12px;height:28px;line-height:26px" title="Roll it by the book: 3d6 floors, d10 branches, Lobby and Body tables"><i class="fas fa-dice"></i> Roll by the book</button></div>
    </div>
    <label>Floors <span style="font-weight:normal;font-size:11px;margin-left:8px"><input type="checkbox" name="astext" style="vertical-align:middle"> edit as text</span></label>
    <div class="floors"></div>
    <textarea name="floors" style="display:none"></textarea>

  </form>`;

  const state = { main: [], branches: [], header: null };
  const toStateText = () => toText({ main: state.main, branches: state.branches }, state.header ?? []);

  const read = (html) => {
    const asText = html.find("[name=astext]").prop("checked");
    const text = asText ? html.find("[name=floors]").val() : toStateText();
    if (!text.trim()) throw new Error("No floors. Roll, or add some.");
    return { name: html.find("[name=name]").val().trim(), tier: html.find("[name=tier]").val(), text, arch: state.header ? { header: state.header } : null };
  };

  new Dialog({
    title: "NET Architecture",
    content,
    buttons: {
      build: { icon: '<i class="fas fa-hammer"></i>', label: "Build scene", callback: guard(async (html) => build(read(html))) },
      under: { icon: '<i class="fas fa-layer-group"></i>', label: "Build under this scene", callback: guard(async (html) => buildUnder(read(html))) },
      remove: { icon: '<i class="fas fa-trash"></i>', label: "Remove NET here", callback: guard(async () => removeUnder()) },
      cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" },
    },
    default: "build",
    render: (html) => {
      const box = html.find(".floors");
      const ta = html.find("[name=floors]");
      const draw = () => { box.html(renderRows(state)); ta.val(toStateText()); };
      draw();

      html.find("[data-roll]").on("click", guard(async (ev) => {
        ev.preventDefault();
        const rolled = rollArchitecture(html.find("[name=tier]").val());
        state.main = rolled.main; state.branches = rolled.branches; state.header = rolled.header;
        html.find("[name=astext]").prop("checked", false); box.show(); ta.hide();
        draw();
      }));

      html.find("[name=astext]").on("change", guard(async (ev) => {
        if (ev.currentTarget.checked) { ta.val(toStateText()); box.hide(); ta.show(); return; }
        const parsed = parseText(ta.val() || "");
        state.main = parsed.main; state.branches = parsed.branches; state.header = null;
        box.show(); ta.hide(); draw();
      }));

      const touch = () => { state.header = null; draw(); };
      box.on("change", "[data-kind]", (ev) => {
        const el = ev.currentTarget; const { list, i } = floorAt(state, el.dataset.path);
        list[i].items[Number(el.dataset.item)] = itemFromKey(el.value, list[i].items[Number(el.dataset.item)]); touch();
      });
      box.on("change", "[data-dv]", (ev) => {
        const el = ev.currentTarget; const { list, i } = floorAt(state, el.dataset.path);
        list[i].items[Number(el.dataset.item)].dv = el.value ? Number(el.value) : null; touch();
      });
      box.on("change", "[data-count]", (ev) => {
        const el = ev.currentTarget; const { list, i } = floorAt(state, el.dataset.path);
        list[i].items[Number(el.dataset.item)].count = Math.max(1, Number(el.value) || 1); touch();
      });
      box.on("change", "[data-attach]", (ev) => {
        const el = ev.currentTarget; state.branches[Number(el.dataset.branch)].attach = Math.max(2, Number(el.value) || 2); touch();
      });
      box.on("click", "[data-add-item]", (ev) => {
        const { list, i } = floorAt(state, ev.currentTarget.dataset.path); list[i].items.push({ kind: "ice", name: "Wisp", count: 1 }); touch();
      });
      box.on("click", "[data-del-item]", (ev) => {
        const el = ev.currentTarget; const { list, i } = floorAt(state, el.dataset.path);
        list[i].items.splice(Number(el.dataset.item), 1); if (!list[i].items.length) list.splice(i, 1); touch();
      });
      box.on("click", "[data-del-floor]", (ev) => { const { list, i } = floorAt(state, ev.currentTarget.dataset.path); list.splice(i, 1); touch(); });
      box.on("click", "[data-up]", (ev) => { const { list, i } = floorAt(state, ev.currentTarget.dataset.path); if (i > 0) { [list[i - 1], list[i]] = [list[i], list[i - 1]]; touch(); } });
      box.on("click", "[data-down]", (ev) => { const { list, i } = floorAt(state, ev.currentTarget.dataset.path); if (i < list.length - 1) { [list[i + 1], list[i]] = [list[i], list[i + 1]]; touch(); } });
      box.on("click", "[data-add-floor]", (ev) => {
        const bi = Number(ev.currentTarget.dataset.branch);
        const list = bi < 0 ? state.main : state.branches[bi].floors;
        list.push({ items: [{ kind: "node", node: "password", dv: null }] }); touch();
      });
      box.on("click", "[data-add-branch]", () => { state.branches.push({ attach: Math.max(2, Math.min(state.main.length, 2)), floors: [{ items: [{ kind: "ice", name: "Wisp", count: 1 }] }] }); touch(); });
      box.on("click", "[data-del-branch]", (ev) => { state.branches.splice(Number(ev.currentTarget.dataset.branch), 1); touch(); });
    },
  }, { width: 720, height: "auto", resizable: true }).render(true);
}

/* Leftovers from earlier builds: pins from the map-pin experiment, and points marked found while still hidden. Cleared once, on the GM's load. */
Hooks.once("ready", async () => {
  if (!game.user.isGM) return;
  for (const scene of game.scenes) {
    if (!scene.getFlag(ID, "net")) continue;
    const pins = scene.notes.filter((n) => n.getFlag(ID, "accessPin")).map((n) => n.id);
    if (pins.length) await scene.deleteEmbeddedDocuments("Note", pins).catch(reportErr);
    const stuck = scene.tokens.filter((t) => t.getFlag(ID, "accessPoint") && t.hidden && t.getFlag(ID, "scanned")).map((t) => ({ _id: t.id, [`flags.${ID}.scanned`]: false }));
    if (stuck.length) await scene.updateEmbeddedDocuments("Token", stuck, { cprNetarch: true }).catch(reportErr);
  }
});
Hooks.once("ready", () => {
  const mod = game.modules.get(ID);
  if (mod) mod.api = { open, build, buildUnder, removeUnder, toggle: toggleView, roll: rollArchitecture, parse: parseText, toText, layout, ICE, DEMONS };
  game.socket.on(SOCKET, (msg) => {
    if (game.user !== game.users.activeGM) return;
    handleSocket(msg).catch(reportErr);
  });
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

globalThis.CPRNetArch = { ID, G, LAT, PAD, NET_SPACE, NET_LEVEL, TIERS, TIER_DV, ICE, DEMONS, LOBBY, BODY, parseEntry, parseText, toText, rollArchitecture, layout, buildSceneData, iceActorData, demonActorData, summaryHtml };
