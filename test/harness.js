/* Runs the module's pure logic outside Foundry. `node test/harness.js` */
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");

const hooks = {};
const Hooks = { once: (k, f) => (hooks[k] ??= []).push(f), on: (k, f) => (hooks[k] ??= []).push(f) };
const settings = new Map();
const game = {
  settings: { register(m, k, c) { settings.set(`${m}.${k}`, c.default); }, get(m, k) { return settings.get(`${m}.${k}`); } },
  user: { isGM: true }, modules: { get: () => ({}) }, actors: [], folders: [], packs: [],
  system: { id: "cyberpunk-red-core" },
  keybindings: { register() {} },
};
const ui = { notifications: { info() {}, warn() {}, error() {} } };
const foundry = { utils: {} };
new Function("Hooks", "game", "ui", "foundry", src)(Hooks, game, ui, foundry);
hooks.init.forEach((f) => f());
const M = globalThis.CPRNetArch;

let pass = 0, fail = 0;
/* Async tests run one after another rather than all at once: several of them stub the same
   globals, and overlapping them would have each pulling the others' dice out of the queue. */
let queue = Promise.resolve();
function check(name, fn) {
  const won = () => { pass++; console.log(`ok   ${name}`); };
  const lost = (err) => { fail++; console.log(`FAIL ${name}: ${err.message}`); };
  queue = queue.then(() => Promise.resolve().then(fn).then(won, lost));
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };
const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); };

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const ART = "https://x/Tiles/NetArch";
const BACK = "https://x/Maps/NetArch/back.webm";
const localArt = path.join(__dirname, "..", "..", "..", "Assets", "Tiles", "NetArch");
const haveLocalArt = fs.existsSync(localArt);
const strip = (a) => ({ main: a.main.map((f) => f.items), branches: a.branches.map((b) => ({ attach: b.attach, floors: b.floors.map((f) => f.items) })) });

check("T1 parse: nodes, ICE counts, demons, labels, comments, branches", () => {
  const a = M.parseText(`# comment
1: Password DV8
2. File
3) Hellhound x2, Killer   # trailing
4 - Control Node (DV10) + Efreet
Branch from 3:
5: 2 Ravens
6: wisp ×3
Branch B off floor 4
Sabertooth and Skunk`);
  eq(a.main.length, 4, "main floors");
  eq(a.main[0].items, [{ kind: "node", node: "password", dv: 8 }], "password");
  eq(a.main[1].items, [{ kind: "node", node: "file", dv: null }], "file no dv");
  eq(a.main[2].items, [{ kind: "ice", name: "Hellhound", count: 2 }, { kind: "ice", name: "Killer", count: 1 }], "ice pair");
  eq(a.main[3].items, [{ kind: "node", node: "control", dv: 10 }, { kind: "demon", name: "Efreet" }], "node + demon");
  eq(a.branches.length, 2, "branches");
  eq(a.branches[0].attach, 3, "attach 3");
  eq(a.branches[0].floors[0].items, [{ kind: "ice", name: "Raven", count: 2 }], "2 Ravens");
  eq(a.branches[0].floors[1].items, [{ kind: "ice", name: "Wisp", count: 3 }], "wisp x3");
  eq(a.branches[1].attach, 4, "attach 4");
  eq(a.branches[1].floors[0].items, [{ kind: "ice", name: "Sabertooth", count: 1 }, { kind: "ice", name: "Skunk", count: 1 }], "and");
});

check("T2 parse: errors are named", () => {
  let e = null; try { M.parseText("1: Foo"); } catch (err) { e = err.message; }
  assert(/Line 1/.test(e) && /Foo/.test(e), `unknown entry: ${e}`);
  e = null; try { M.parseText("1: Password\nBranch from 1:\nKiller"); } catch (err) { e = err.message; }
  assert(/second floor/.test(e), `branch before 2: ${e}`);
  e = null; try { M.parseText("1: Password\n2: File\nBranch from 5:\nKiller"); } catch (err) { e = err.message; }
  assert(/only has 2/.test(e), `branch past end: ${e}`);
  e = null; try { M.parseText("# nothing"); } catch (err) { e = err.message; }
  assert(/No floors/.test(e), `empty: ${e}`);
  e = null; try { M.parseText("1: Password\n2: File\nBranch from 2:"); } catch (err) { e = err.message; }
  assert(/no floors/.test(e), `empty branch: ${e}`);
});

check("T3 tables: every Lobby and Body entry parses, ICE names have art", () => {
  M.LOBBY.forEach((s) => s.split(", ").map(M.parseEntry));
  for (const t of M.TIERS) { eq(M.BODY[t].length, 16, `${t} rows`); M.BODY[t].forEach((s) => s.split(", ").map(M.parseEntry)); }
  eq(Object.keys(M.ICE).length, 12, "12 Black ICE");
  if (haveLocalArt) {
    const files = new Set(fs.readdirSync(localArt));
    for (const n of [...Object.keys(M.ICE), ...Object.keys(M.DEMONS), "Root"]) assert(files.has(`${n}.webm`), `art missing: ${n}.webm`);
    for (const n of ["Password", "File", "Controlnode"]) for (const dv of ["", "DV6", "DV8", "DV10", "DV12"]) assert(files.has(`${n}${dv}.webm`), `art missing: ${n}${dv}.webm`);
    const nums = new Set(fs.readdirSync(path.join(localArt, "NUMBERS")));
    for (let i = 1; i <= 30; i++) assert(nums.has(`${i}.webm`), `number art missing: ${i}`);
  }
});

const rolled = [];
check("T4 roll: 3000 architectures obey the builder rules", () => {
  for (let seed = 1; seed <= 3000; seed++) {
    const rng = mulberry32(seed);
    const tier = M.TIERS[seed % 4];
    const a = M.rollArchitecture(tier, rng);
    rolled.push(a);
    const total = a.main.length + a.branches.reduce((s, b) => s + b.floors.length, 0);
    assert(total === a.total && total >= 3 && total <= 18, `seed ${seed}: total ${total} vs ${a.total}`);
    assert(a.main.length >= 3, `seed ${seed}: main ${a.main.length}`);
    for (const b of a.branches) {
      assert(b.floors.length >= 1 && b.floors.length < a.main.length, `seed ${seed}: branch len ${b.floors.length} main ${a.main.length}`);
      assert(b.attach >= 2 && b.attach <= a.main.length - 1, `seed ${seed}: attach ${b.attach}`);
    }
    const d10Branches = a.d10s.filter((r) => r >= 7).length;
    assert(a.branches.length <= d10Branches, `seed ${seed}: more branches than d10 hits`);
    const lobby = new Set(M.LOBBY);
    const body = new Set(M.BODY[tier]);
    a.main.forEach((f, i) => {
      const txt = f.items.map((it) => it.kind === "node" ? `${{ password: "Password", file: "File", control: "Control Node" }[it.node]} DV${it.dv}` : it.name + (it.count > 1 ? ` x${it.count}` : "")).join(", ");
      assert((i < 2 ? lobby : body).has(txt), `seed ${seed}: floor ${i + 1} "${txt}" not on its table`);
    });
    // Reroll rule: no Program or Password repeats unless the reroll cap was hit.
    const seen = new Map();
    [...a.main, ...a.branches.flatMap((b) => b.floors)].forEach((f) => f.items.forEach((it) => {
      const k = it.kind === "node" ? (it.node === "password" ? "Password" : null) : it.name;
      if (k) seen.set(k, (seen.get(k) ?? 0) + 1);
    }));
    const capped = [...a.main, ...a.branches.flatMap((b) => b.floors)].some((f) => (f.note.match(/,/g) || []).length >= 29);
    if (!capped) for (const [k, v] of seen) assert(v === 1, `seed ${seed}: ${k} appears ${v} times`);
  }
  const branchy = rolled.filter((a) => a.branches.length).length;
  assert(branchy > 900 && branchy < 1500, `branch rate off: ${branchy}/3000`);
});

const adjacent = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
check("T5 layout: every rolled architecture fits, rooms unique and chained", () => {
  for (const a of rolled) {
    const p = M.layout(a);
    const cells = [p.main, ...p.branches.map((b) => b.cells)].flat();
    const keys = new Set(cells.map((c) => c.join(",")));
    assert(keys.size === cells.length, "rooms overlap");
    cells.forEach(([c, r]) => assert(c >= 0 && c < M.LAT.cols && r >= 0 && r < M.LAT.rows, `off lattice ${c},${r}`));
    const fellBack = p.notes.some((n) => /starts at the gate/.test(n));
    eq(p.main[0], [a.main.length === 1 && !fellBack ? M.LAT.cols - 1 : 0, M.LAT.entryRow], "paths start at the gate (a lone Root sits by the dais)");
    if (a.main.length <= M.LAT.cols && !fellBack) {
      eq(p.main[p.main.length - 1], [M.LAT.cols - 1, M.LAT.entryRow], "short paths end in the far-right room");
      for (let i = 1; i < p.main.length - 1; i++) assert(adjacent(p.main[i - 1], p.main[i]), "main chain broken");
      const last = p.main[p.main.length - 1], prev = p.main[p.main.length - 2];
      if (prev) assert(prev[1] === last[1] && last[0] > prev[0], "the Root is reached along the entry row");
      const row = p.branches.flatMap((b) => b.cells).filter(([c, r]) => r === M.LAT.entryRow && prev && c > prev[0] && c < last[0]);
      eq(row.length, 0, "no branch room sits in the corridor to the Root");
    } else for (let i = 1; i < p.main.length; i++) assert(adjacent(p.main[i - 1], p.main[i]), "main chain broken");
    p.branches.forEach((b, i) => {
      assert(adjacent(b.attachCell ?? p.main[b.attach - 1], b.cells[0]), "branch not attached");
      for (let k = 1; k < b.cells.length; k++) assert(adjacent(b.cells[k - 1], b.cells[k]), "branch chain broken");
      eq(b.cells.length, a.branches[i].floors.length, "branch length");
    });
  }
});

check("T6 layout: an 18-floor main snakes along the entry row and back on the row above", () => {
  const a = M.parseText(Array.from({ length: 18 }, (_, i) => `${i + 1}: File`).join("\n"));
  const p = M.layout(a);
  const e = M.LAT.entryRow;
  eq(p.main.slice(0, 9).map((c) => c[1]), Array(9).fill(e), "first 9 in entry row");
  eq(p.main.slice(9).map((c) => c[1]), Array(9).fill(e - 1), "next 9 in row above");
  eq(p.main[8], [8, e], "turns at the right end");
  eq(p.main[9], [8, e - 1], "goes up");
});

check("T6b layout: a 5-floor main starts at the gate and its Root sits by the dais", () => {
  const a = M.parseText(Array.from({ length: 5 }, (_, i) => `${i + 1}: File`).join("\n"));
  const p = M.layout(a);
  eq(p.main, [[0, 2], [1, 2], [2, 2], [3, 2], [8, 2]], "columns 0..3, then the far-right room");
});

check("T7 layout: crowded branches fit, a blocked attach point moves and says so", () => {
  const text = ["1: Password", "2: File", "3: Wisp", "4: File", "5: File", "6: File", "7: File", "8: File", "9: File",
    "Branch from 2:", "Killer", "File", "File", "Branch from 2:", "Asp", "File", "File", "Branch from 2:", "Raven", "File", "File"].join("\n");
  const p = M.layout(M.parseText(text));
  eq(p.branches.length, 3, "three branches");
  assert(p.notes.length >= 1, "expected a moved-branch note");
  const cells = [p.main, ...p.branches.map((b) => b.cells)].flat();
  assert(new Set(cells.map((c) => c.join(","))).size === cells.length, "overlap");
  // 27 main floors still fit (three rows), 40 cannot and fails cleanly.
  M.layout(M.parseText(Array.from({ length: 27 }, (_, i) => `${i + 1}: File`).join("\n")));
  let e = null; try { M.layout(M.parseText(Array.from({ length: 40 }, (_, i) => `${i + 1}: File`).join("\n"))); } catch (err) { e = err.message; }
  assert(/Cannot fit/.test(e), `40 floors: ${e}`);
});

check("T8 scene data: walls, doors, tokens, tiles, root", () => {
  const text = ["1: Password DV8", "2: File", "3: Hellhound x2, Killer", "4: Control Node DV10, Efreet", "5: File DV8",
    "Branch from 3:", "Asp", "Password", "Branch from 4:", "Wisp x3", "File", "File", "File"].join("\n");
  const arch = M.parseText(text);
  const placed = M.layout(arch);
  const ids = { Hellhound: "H1", Killer: "K1", Efreet: "E1", Asp: "A1", Wisp: "W1" };
  const { sceneData: s, floors, bottom } = M.buildSceneData(arch, placed, { name: "Test", backdrop: BACK, art: ART, ids, tierDv: 8 });
  eq(floors.length, 11, "11 floors");
  eq(s.grid.size, 150, "grid"); eq([s.width, s.height], [3840, 2160], "size"); eq(s.background.src, BACK, "backdrop");
  const doors = s.walls.filter((w) => w.door === 1);
  eq(doors.length, (5 - 1) + 2 + 4 + 1 + 1, "doors: main links + branch links + entry + the open passage into the Root");
  eq(doors.filter((w) => w.ds === 1).length, 2, "only the entry door and the Root passage are open");
  const keys = s.walls.map((w) => w.c.join(","));
  assert(new Set(keys).size === keys.length, "duplicate walls");
  s.walls.forEach((w) => assert(w.c.every((v) => v % 150 === 0), "wall off grid"));
  // Every room has four walled sides (wall or door), each edge of the lattice shared once.
  const G = 150;
  const edgeSet = new Set(s.walls.map((w) => { const a = w.c.slice(0, 2).join(","), b = w.c.slice(2).join(","); return a < b ? `${a}|${b}` : `${b}|${a}`; }));
  for (const f of floors) {
    const x = (M.PAD.x + M.LAT.x0 + 2 * f.cell[0]) * G, y = (M.PAD.y + M.LAT.y0 + 2 * f.cell[1]) * G;
    const need = [[x, y, x + 2 * G, y], [x, y + 2 * G, x + 2 * G, y + 2 * G], [x, y, x, y + 2 * G], [x + 2 * G, y, x + 2 * G, y + 2 * G]];
    need.forEach((c) => { const a = c.slice(0, 2).join(","), b = c.slice(2).join(","); assert(edgeSet.has(a < b ? `${a}|${b}` : `${b}|${a}`), `room ${f.n} missing a side`); });
  }
  // Tokens
  eq(s.tokens.length, 1 + 1 + 3 + 2 + 1 + 1 + 1 + 3 + 1 + 1 + 1, "token count");
  const byName = (n) => s.tokens.filter((t) => t.name === n);
  eq(byName("Hellhound").length, 2, "two hellhounds"); byName("Hellhound").forEach((t) => { eq(t.actorId, "H1", "hellhound actor"); eq(t.disposition, -1, "hostile"); eq(t.bar1.attribute, "stats.rez", "rez bar"); });
  eq(byName("Wisp").length, 3, "three wisps");
  eq(byName("File DV8").length, 5, "files take the tier DV"); eq(byName("File DV8")[0].texture.src, `${ART}/FileDV8.webm`, "file art");
  eq(byName("Password DV8").length, 2, "passwords"); eq(byName("Control Node DV10")[0].texture.src, `${ART}/ControlnodeDV10.webm`, "node art");
  eq(byName("Efreet")[0].actorId, "E1", "demon actor"); eq(byName("Efreet")[0].texture.src, `${ART}/Efreet.webm`, "demon art");
  s.tokens.forEach((t) => assert(t.actorId !== null || t.disposition === 0, `token ${t.name} hostile without actor`));
  for (const f of floors) {
    const x = (M.PAD.x + M.LAT.x0 + 2 * f.cell[0]) * G, y = (M.PAD.y + M.LAT.y0 + 2 * f.cell[1]) * G;
    const mine = s.tokens.filter((t) => t.x >= x && t.x < x + 2 * G && t.y >= y && t.y < y + 2 * G);
    const want = f.items.reduce((n, it) => n + (it.kind === "ice" ? it.count : 1), 0);
    eq(mine.length, want, `floor ${f.n} token count`);
  }
  // Tiles: one number per floor plus the root on the deepest floor (branch B: 4 + 4 = 8 > main 5).
  eq(s.tiles.length, 12, "tiles");
  eq(bottom, 11, "bottom is the last floor of branch B");
  const root = s.tiles.find((t) => t.texture.src.endsWith("Root.webm"));
  const last = floors[10];
  eq([root.x, root.y], [(M.PAD.x + M.LAT.x0 + 2 * last.cell[0]) * G, (M.PAD.y + M.LAT.y0 + 2 * last.cell[1]) * G], "root under the deepest floor");
  eq(s.tiles.filter((t) => /NUMBERS\/\d+\.webm$/.test(t.texture.src)).length, 11, "number tiles");
  eq(s.flags[M.ID].bottom, 11, "flag bottom");
});

check("T8b every room sits inside the backdrop once padding is accounted for", () => {
  eq([M.PAD.x, M.PAD.y], [7, 4], "pad in squares");
  const text = Array.from({ length: 18 }, (_, i) => `${i + 1}: File`).join("\n") + "\nBranch from 3:\nWisp\nFile\nFile\nFile\nFile\nBranch from 6:\nWisp\nFile\nFile\nFile\nFile";
  const arch = M.parseText(text);
  const { sceneData: s } = M.buildSceneData(arch, M.layout(arch), { name: "T", backdrop: BACK, art: ART });
  const left = M.PAD.x * 150, top = M.PAD.y * 150, right = left + 3840, bottom = top + 2160;
  s.tokens.forEach((t) => assert(t.x >= left && t.x + 150 <= right && t.y >= top && t.y + 150 <= bottom, `token off backdrop at ${t.x},${t.y}`));
  s.walls.forEach((w) => assert(w.c[0] >= left && w.c[2] <= right && w.c[1] >= top && w.c[3] <= bottom, `wall off backdrop ${w.c}`));
});

check("T8c built under another scene: art scaled to the host grid, Levels flags on everything, entry in the corridor", () => {
  const text = ["1: Password DV8", "2: Wisp", "3: Control Node DV8"].join("\n");
  const arch = M.parseText(text);
  const sp = { g: 128, padX: 8, padY: 5 };
  const level = { bottom: -12, top: -8, elev: -10 };
  const { docs, entry } = M.buildSceneData(arch, M.layout(arch), { name: "Floor", backdrop: BACK, art: ART, ids: { Wisp: "W1" }, sp, embed: { level, tag: "t1" } });
  const bd = docs.tiles[0];
  eq(bd.texture.src, BACK, "backdrop tile first");
  eq([bd.x, bd.y, bd.width, bd.height], [8 * 128, 5 * 128, Math.round(25.6 * 128), Math.round(14.4 * 128)], "backdrop scaled to the host grid at the padded corner");
  eq(bd.flags.levels, { rangeBottom: -12, rangeTop: -8, showIfAbove: false, noCollision: false }, "levels range on the backdrop");
  eq(bd.elevation, -12, "tile elevation at the band's bottom");
  docs.tiles.forEach((t) => eq(t.flags[M.ID].net, "t1", "tile tagged"));
  docs.walls.forEach((w) => { eq(w.flags["wall-height"], { top: -8, bottom: -12 }, "wall height"); eq(w.flags[M.ID].net, "t1", "wall tagged"); });
  docs.tokens.forEach((tk) => { eq(tk.elevation, -10, "token elevation"); eq(tk.flags[M.ID].net, "t1", "token tagged"); });
  const right = bd.x + bd.width, bottom = bd.y + bd.height;
  docs.tokens.forEach((tk) => assert(tk.x >= bd.x && tk.x + 128 <= right && tk.y >= bd.y && tk.y + 128 <= bottom, `token off the art at ${tk.x},${tk.y}`));
  docs.walls.forEach((w) => assert(w.c[0] >= bd.x && w.c[2] <= right && w.c[1] >= bd.y && w.c[3] <= bottom, `wall off the art ${w.c}`));
  eq(entry, { x: (8 + M.LAT.x0 - 2) * 128, y: (5 + M.LAT.y0 + 2 * M.LAT.entryRow) * 128 }, "corridor entry square");
  // A wall built in NET space and one in host space describe the same room, only scaled.
  const home = M.buildSceneData(arch, M.layout(arch), { name: "N", backdrop: BACK, art: ART, ids: { Wisp: "W1" } });
  eq(home.docs.walls.length, docs.walls.length, "same wall count in both spaces");
  eq(home.docs.tiles.length + 1, docs.tiles.length, "embed adds only the backdrop tile");
  assert(!("levels" in (home.docs.tiles[0].flags ?? {})), "no Levels flags on a plain scene");
});

check("T9 roll -> text -> parse round trip keeps every floor", () => {
  for (const a of rolled.slice(0, 500)) {
    const back = M.parseText(M.toText(a, a.header));
    eq(strip(back), strip(a), "round trip");
  }
});

check("T10 actor data matches the system's Black ICE and Demon fields", () => {
  for (const n of Object.keys(M.ICE)) {
    const d = M.iceActorData(n, ART, "F1");
    eq(d.type, "blackIce", "type"); eq(d.folder, "F1", "folder");
    assert(["antipersonnel", "antiprogram"].includes(d.system.class), `class ${d.system.class}`);
    for (const k of ["per", "spd", "atk", "def"]) assert(Number.isInteger(d.system.stats[k]) && d.system.stats[k] > 0, `${n} ${k}`);
    eq(d.system.stats.rez.value, d.system.stats.rez.max, "rez full");
    eq(d.prototypeToken.texture.src, `${ART}/${n}.webm`, "token art");
    eq(d.prototypeToken.bar1.attribute, "stats.rez", "bar");
    assert(!("img" in d), "actor img must not be a video");
  }
  eq(M.iceActorData("Killer", ART).system.stats, { per: 4, spd: 8, atk: 6, def: 2, rez: { value: 20, max: 20 } }, "Killer stats");
  eq(M.iceActorData("Kraken", ART).system.class, "antipersonnel", "Kraken class");
  for (const n of Object.keys(M.DEMONS)) {
    const d = M.demonActorData(n, ART, "F2");
    eq(d.type, "demon", "type");
    eq(Object.keys(d.system.stats).sort(), ["actions", "combatNumber", "interface", "rez"], "demon stats keys");
  }
  eq(M.demonActorData("Efreet", ART).system.stats, { rez: { value: 25, max: 25 }, interface: 4, actions: 3, combatNumber: 14 }, "Efreet stats");
});

check("T11 summary html lists every floor and each ICE's stats once", () => {
  const a = M.parseText("1: Password DV6\n2: Killer\n3: Killer, Hellhound\nBranch from 2:\nImp");
  const p = M.layout(a);
  const { floors, bottom } = M.buildSceneData(a, p, { name: "S", backdrop: BACK, art: ART, tierDv: 6 });
  const html = M.summaryHtml({ name: "S" }, floors, bottom, p.notes, a);
  assert((html.match(/<tr><td>/g) || []).length === 4, "four floor rows");
  assert((html.match(/<b>Killer<\/b>/g) || []).length === 1, "Killer stats once");
  assert(/<b>Imp<\/b> \(Demon\)/.test(html), "Imp stats");
  assert(/Bottom floor \(Virus\): 3/.test(html), "bottom");
});

// T15: scanDv reads the stored tier DV, else the first DV in the floor text, else 8.
{
  const scanDv = (net) => (!net ? null : Number.isInteger(net.scanDv) ? net.scanDv : 6);
  check("T15 scanDv", () => {
    assert(scanDv({ scanDv: 6 }) === 6, "stored");
    assert(scanDv({ floors: [{ text: "File DV10" }] }) === 6, "default 6");
  });
}

check("T16 one floor rerolls on its own table and honours what is already standing", () => {
  // Same rendering the whole-architecture test uses, so "on the table" means the same thing here.
  const lineOf = (f) => f.items.map((it) => it.kind === "node"
    ? `${{ password: "Password", file: "File", control: "Control Node" }[it.node]} DV${it.dv}`
    : it.name + (it.count > 1 ? ` x${it.count}` : "")).join(", ");
  const keysOf = (f) => f.items.map((it) => (it.kind === "node" ? (it.node === "password" ? "Password" : null) : it.name)).filter(Boolean);

  // The table is chosen by position: the first two of the main path are Lobby, the rest Body.
  assert(M.tableForPath("m.0", "Standard") === M.LOBBY, "m.0 should be the Lobby table");
  assert(M.tableForPath("m.1", "Standard") === M.LOBBY, "m.1 should be the Lobby table");
  assert(M.tableForPath("m.2", "Standard") === M.BODY.Standard, "m.2 should be the Body table");
  assert(M.tableForPath("b0.0", "Standard") === M.BODY.Standard, "branch floors should be the Body table");
  assert(M.tableForPath("b3.9", "Standard") === M.BODY.Standard, "deep branch floors should be the Body table");
  assert(M.tableForPath("m.5", "Nonsense") === undefined, "an unknown difficulty must resolve no table");

  const state = M.rollArchitecture("Standard", mulberry32(7));
  const all = (s) => [...s.main, ...s.branches.flatMap((b) => b.floors)];

  // seenExcept holds everything standing elsewhere and nothing from the floor being replaced,
  // or that floor would block its own result and reroll thirty times for nothing.
  const seen = M.seenExcept(state, "m.2");
  const elsewhere = new Set(all(state).filter((f) => f !== state.main[2]).flatMap(keysOf));
  assert(seen.size === elsewhere.size, `seenExcept size ${seen.size} vs ${elsewhere.size}`);
  for (const k of elsewhere) assert(seen.has(k), `seenExcept missing ${k}`);
  for (const k of keysOf(state.main[2])) {
    if (!elsewhere.has(k)) assert(!seen.has(k), `seenExcept should not hold ${k} from the replaced floor`);
  }

  // Reroll the same body floor repeatedly: always on the Body table, never duplicating
  // a Program or Password that stands elsewhere unless the thirty-attempt cap was hit.
  const body = new Set(M.BODY.Standard);
  const rng = mulberry32(99);
  for (let n = 0; n < 500; n++) {
    const s2 = M.seenExcept(state, "m.2");
    const before = new Set(s2);   // rollFloor adds its own result to the set it is handed
    const f = M.rollFloor(M.BODY.Standard, rng, s2, "Standard");
    assert(body.has(lineOf(f)), `reroll ${n} landed off the Body table: "${lineOf(f)}"`);
    if (f.rolls.length < 30) for (const k of keysOf(f)) assert(!before.has(k), `reroll ${n} duplicated ${k}`);
    state.main[2] = { items: f.items };   // keep it in place so the next pass sees the new one
  }

  // A Lobby floor rerolls onto the Lobby table.
  const lobby = new Set(M.LOBBY);
  const lf = M.rollFloor(M.LOBBY, mulberry32(3), new Set(), "Standard");
  assert(lobby.has(lineOf(lf)), `lobby reroll landed off the Lobby table: "${lineOf(lf)}"`);
});

check("T17 branch paths resolve the same floor for both the row and the seen set", () => {
  // floorRow, floorAt and seenExcept each build or read a data-path independently. If those
  // ever disagree, a reroll silently replaces the wrong floor, so pin them against each other.
  let state = null;
  for (let seed = 1; seed < 400 && !state; seed++) {
    const a = M.rollArchitecture("Standard", mulberry32(seed));
    if (a.branches.length && a.branches[0].floors.length > 1) state = a;
  }
  assert(state, "no seeded architecture with a multi-floor branch");

  const paths = [
    ...state.main.map((_, i) => `m.${i}`),
    ...state.branches.flatMap((b, bi) => b.floors.map((_, i) => `b${bi}.${i}`)),
  ];
  const keysOf = (f) => f.items.map((it) => (it.kind === "node" ? (it.node === "password" ? "Password" : null) : it.name)).filter(Boolean);
  const all = [...state.main, ...state.branches.flatMap((b) => b.floors)];
  assert(paths.length === all.length, `path count ${paths.length} vs floor count ${all.length}`);

  for (const path of paths) {
    const { list, i } = M.floorAt(state, path);
    const floor = list[i];
    assert(all.includes(floor), `${path} resolved to a floor outside the architecture`);

    // seenExcept(path) must omit exactly the keys that only this floor holds.
    const seen = M.seenExcept(state, path);
    const others = new Set(all.filter((f) => f !== floor).flatMap(keysOf));
    assert(seen.size === others.size, `${path}: seenExcept ${seen.size} vs ${others.size}`);
    for (const k of others) assert(seen.has(k), `${path}: seenExcept missing ${k}`);
    for (const k of keysOf(floor)) if (!others.has(k)) assert(!seen.has(k), `${path}: seenExcept held ${k} from its own floor`);

    // Branch floors are never Lobby floors, however deep the branch goes.
    if (path.startsWith("b")) assert(M.tableForPath(path, "Standard") === M.BODY.Standard, `${path} resolved to the Lobby table`);
  }

  // Rerolling a branch floor replaces that floor and nothing else.
  const before = all.map((f) => f.items);
  const target = M.floorAt(state, "b0.0");
  const f = M.rollFloor(M.BODY.Standard, mulberry32(42), M.seenExcept(state, "b0.0"), "Standard");
  target.list[target.i] = { items: f.items, note: "x" };
  const after = [...state.main, ...state.branches.flatMap((b) => b.floors)].map((x) => x.items);
  let changed = 0;
  for (let i = 0; i < before.length; i++) if (before[i] !== after[i]) changed++;
  assert(changed === 1, `a branch reroll changed ${changed} floors`);
  assert(state.branches[0].floors[0].items === f.items, "the reroll did not land on b0.0");
});


check("T18 the brief reads the right figures for ICE, Demons and nodes", () => {
  const brief = globalThis.__netarchTest?.itemBrief;
  assert(typeof brief === "function", "itemBrief was not exposed to the harness");
  const wisp = brief({ kind: "ice", name: "Wisp", count: 1 });
  assert(wisp.includes("Anti-Personnel"), "wisp class");
  assert(wisp.includes("PER 4 SPD 4 ATK 4 DEF 2 REZ 15"), "wisp stat line");
  assert(wisp.includes("NET Actions next turn are reduced by 1"), "wisp effect");
  assert(brief({ kind: "ice", name: "Killer" }).includes("Anti-Program"), "killer class");
  assert(brief({ kind: "ice", name: "Killer" }).includes("REZ 20"), "killer rez");
  assert(brief({ kind: "demon", name: "Balron" }).includes("REZ 30"), "balron rez");
  assert(brief({ kind: "demon", name: "Balron" }).includes("NET Actions 4"), "balron actions");
  eq(brief({ kind: "node", node: "File" }), "", "a node has no brief");
  eq(brief({ kind: "ice", name: "Nonsense" }), "", "an unknown name is silent");
});


check("T19 a built record carries each floor's contents and the space it was laid in", () => {
  const arch = M.parseText("1: Password DV10\n2: Wisp x2\n3: File");
  const placed = M.layout(arch);
  const { record } = M.buildSceneData(arch, placed, { name: "t", backdrop: "b", art: "a", tierDv: 8 });
  eq(record.sp, M.NET_SPACE, "a NET of its own is laid out in NET_SPACE");
  eq(record.floors[0].items, [{ kind: "node", node: "password", dv: 10 }], "an explicit DV survives");
  eq(record.floors[2].items, [{ kind: "node", node: "file", dv: 8 }], "a bare node takes the tier's DV");
  eq(record.floors[1].items, [{ kind: "ice", name: "Wisp", count: 2 }], "ice keeps its count");
});

check("T20 a point resolves to the floor whose room holds it", () => {
  const arch = M.parseText("1: Password DV10\n2: Wisp\n3: File");
  const placed = M.layout(arch);
  const { record } = M.buildSceneData(arch, placed, { name: "t", backdrop: "b", art: "a", tierDv: 8 });
  const scene = { flags: { [M.ID]: record }, grid: { size: M.G } };
  const sp = record.sp;
  const at = (cell, dx, dy) => {
    const R = M.roomAt(cell);
    return M.floorOfPoint(scene, (sp.padX + R.x + dx) * sp.g, (sp.padY + R.y + dy) * sp.g);
  };
  for (const f of record.floors) {
    eq(at(f.cell, 0.5, 0.5)?.n, f.n, `the middle of floor ${f.n} reads as floor ${f.n}`);
    eq(at(f.cell, M.ROOM - 0.01, M.ROOM - 0.01)?.n, f.n, `the far corner of floor ${f.n} still reads as it`);
  }
  // the corridor to the left of floor 1 belongs to no floor
  eq(at(record.floors[0].cell, -1.5, 0.5), null, "the entry corridor is not a floor");
  eq(M.floorOfPoint({ flags: {} }, 0, 0), null, "a scene with no NET has no floors");
});

check("T21 a floor is read from a token's centre, not its corner", () => {
  const arch = M.parseText("1: Wisp\n2: File");
  const placed = M.layout(arch);
  const { record } = M.buildSceneData(arch, placed, { name: "t", backdrop: "b", art: "a", tierDv: 8 });
  const sp = record.sp;
  const scene = { flags: { [M.ID]: record }, grid: { size: sp.g } };
  const R = M.roomAt(record.floors[1].cell);
  // a 1x1 token whose corner sits one square left of floor 2 still has its centre outside it
  const corner = { parent: scene, x: (sp.padX + R.x - 1) * sp.g, y: (sp.padY + R.y) * sp.g, width: 1, height: 1 };
  eq(M.floorOfToken(corner)?.n ?? null, null, "a token left of the room is not in it");
  const inside = { parent: scene, x: (sp.padX + R.x) * sp.g, y: (sp.padY + R.y) * sp.g, width: 1, height: 1 };
  eq(M.floorOfToken(inside)?.n, record.floors[1].n, "a token in the room is in it");
  eq(M.floorOfToken(null), null, "no token, no floor");

  /* The hook fires with the document still holding where the token came from, so the floor
     has to be read from the update's own coordinates or every move resolves one move late. */
  const stale = { parent: scene, x: corner.x, y: corner.y, width: 1, height: 1 };
  eq(M.floorOfToken(stale)?.n ?? null, null, "the document alone still reads the old square");
  eq(M.floorOfToken(stale, { x: inside.x, y: inside.y })?.n, record.floors[1].n, "the update's coordinates find the room");
  eq(M.floorOfToken(inside, { x: corner.x, y: corner.y }), null, "and moving out of a room reads as out of it");
});

check("T22 a NET laid under a map reads from its own offset", () => {
  const arch = M.parseText("1: Wisp\n2: File");
  const placed = M.layout(arch);
  const sp = { g: 100, padX: 7, padY: 40 };          // as buildUnder computes it
  const { record } = M.buildSceneData(arch, placed, { name: "t", backdrop: "b", art: "a", tierDv: 8, sp });
  eq(record.sp, sp, "the record keeps the space it was laid in");
  const scene = { flags: {}, getFlag: (m, k) => (k === "net" ? record : undefined), grid: { size: sp.g } };
  const R = M.roomAt(record.floors[0].cell);
  eq(M.floorOfPoint(scene, (sp.padX + R.x + 0.5) * sp.g, (sp.padY + R.y + 0.5) * sp.g)?.n, 1, "floor 1 found at the map's offset");
  // the same pixel read against NET_SPACE would be the wrong room, or none
  const wrong = { flags: { [M.ID]: { ...record, sp: M.NET_SPACE } }, grid: { size: sp.g } };
  assert(M.floorOfPoint(wrong, (sp.padX + R.x + 0.5) * sp.g, (sp.padY + R.y + 0.5) * sp.g)?.n !== 1,
    "ignoring the stored offset must not land on floor 1 by accident");
});

/* A fake actor built the way CPR builds one: a role item for the rank, and Active Effects
   whose changes carry the Interface-ability bonuses. */
function fakeRunner({ rank = 0, effects = [], hp = 30, programs = [], flags = {}, wound = 0 } = {}) {
  const a = {
    name: "Cipher",
    getWoundStateMods: () => wound,
    items: [
      { type: "role", name: "Netrunner", system: { mainRoleAbility: "Interface", rank } },
      ...programs.map((name) => ({ type: "program", name })),
    ],
    system: { derivedStats: { hp: { value: hp, max: hp } } },
    allApplicableEffects: () => effects,
    flags,
    getFlag: (m, k) => flags[k],
    setFlag: async (m, k, v) => { flags[k] = v; return a; },
    update: async (data) => {
      if ("system.derivedStats.hp.value" in data) a.system.derivedStats.hp.value = data["system.derivedStats.hp.value"];
      return a;
    },
  };
  return a;
}
// a queue-fed stand-in for Foundry's Roll, so every die in a test is known in advance
function stubRoll(queue) {
  globalThis.Roll = class {
    constructor(formula) { this.formula = formula; }
    async evaluate() { this.total = queue.shift(); return this; }
  };
}
const effect = (key, value, extra = {}) => ({
  disabled: false, system: { isSuppressed: false },
  changes: [{ key, value, mode: 2 }],
  flags: { "cyberpunk-red-core": { changes: { cats: ["role"], situational: [extra.situational ?? { isSituational: false, onByDefault: false }] } } },
  ...(extra.effect ?? {}),
});

check("T23 a runner's Interface is the role rank plus whatever Active Effects add", () => {
  eq(M.interfaceOf(fakeRunner({ rank: 5 })), 5, "a plain rank");
  eq(M.interfaceOf(fakeRunner({ rank: 5, effects: [effect("bonuses.interface", 2)] })), 7, "a flat bonus counts");
  eq(M.interfaceOf(fakeRunner({ rank: 5, effects: [effect("bonuses.speed", 2)] })), 5, "a Speed bonus is not an Interface bonus");
  eq(M.interfaceOf(null), 0, "no actor, no Interface");
  const off = effect("bonuses.interface", 3); off.disabled = true;
  eq(M.interfaceOf(fakeRunner({ rank: 5, effects: [off] })), 5, "a disabled effect is ignored");
  const sup = effect("bonuses.interface", 3); sup.system.isSuppressed = true;
  eq(M.interfaceOf(fakeRunner({ rank: 5, effects: [sup] })), 5, "a suppressed effect is ignored");
  const sit = effect("bonuses.interface", 3, { situational: { isSituational: true, onByDefault: false } });
  eq(M.interfaceOf(fakeRunner({ rank: 5, effects: [sit] })), 5, "a situational effect that is off stays off");
  const on = effect("bonuses.interface", 3, { situational: { isSituational: true, onByDefault: true } });
  eq(M.interfaceOf(fakeRunner({ rank: 5, effects: [on] })), 8, "a situational effect that is on by default counts");
  eq(M.netBonus(fakeRunner({ effects: [effect("bonuses.speed", 2)] }), "speed"), 2, "the Speed bonus is readable on its own");
});

check("T24 ICE figures are read from the actor's name, so a renamed token still works", () => {
  eq(M.iceData({ name: "TEST Wisp (ICE)", actor: { name: "Wisp" } })?.spd, 4, "the actor's name wins");
  eq(M.iceData({ name: "Raven", actor: null })?.spd, 4, "a token with no actor falls back to its own name");
  eq(M.iceData({ name: "Nonsense", actor: { name: "Nonsense" } }), null, "an unknown name has no figures");
  eq(M.iceData({ name: "TEST Wisp (ICE)", actor: { name: "TEST Wisp (ICE)" } })?.spd, 4, "a name written around the ICE's still finds it");
  eq(M.iceData({ name: "Wispish", actor: { name: "Wispish" } }), null, "but a longer word is not a match");
});

check("T25 only sleeping ICE on this floor is woken", () => {
  const arch = M.parseText("1: Wisp\n2: Raven");
  const { record } = M.buildSceneData(arch, M.layout(arch), { name: "t", backdrop: "b", art: "a", tierDv: 8 });
  const sp = record.sp;
  const tok = (cell, name, type, flags = {}) => {
    const R = M.roomAt(cell);
    return {
      name, width: 1, height: 1, actor: { name, type },
      x: (sp.padX + R.x) * sp.g, y: (sp.padY + R.y) * sp.g,
      getFlag: (m, k) => flags[k],
    };
  };
  const [f1, f2] = record.floors;
  const all = [
    tok(f1.cell, "Wisp", "blackIce"),
    tok(f1.cell, "Awake One", "blackIce", { asleep: false }),
    tok(f1.cell, "Cipher", "character", { avatarOf: "x" }),
    tok(f2.cell, "Raven", "blackIce"),
  ];
  const scene = { flags: { [M.ID]: record }, grid: { size: sp.g }, tokens: { filter: (fn) => all.filter(fn) } };
  all.forEach((t) => { t.parent = scene; });
  eq(M.sleepersOn(scene, f1).map((t) => t.name), ["Wisp"], "only the sleeping ICE on floor 1");
  eq(M.sleepersOn(scene, f2).map((t) => t.name), ["Raven"], "floor 2 has its own");
  eq(M.sleepersOn(scene, null), [], "nowhere is nothing");
});

check("T26 the Speed contest is opposed, and only a win lands the effect", async () => {
  const queue = [];
  stubRoll(queue);
  const ice = { name: "Wisp", actor: { name: "Wisp", type: "blackIce", system: { stats: { spd: 4 } } } };
  // runner Interface 5 + 2 = 7 against the Wisp's SPD 4 + 9 = 13
  queue.push(2, 9);
  let r = await M.speedContest(fakeRunner({ rank: 5 }), ice);
  eq([r.mine, r.yours, r.beatenBy], [7, 13, true], "the ICE wins and lands its effect");
  // the same rolls, but a Speedy Gonzalvez giving +2 Speed, and a tie goes to the runner
  queue.push(6, 7);
  r = await M.speedContest(fakeRunner({ rank: 5, effects: [effect("bonuses.speed", 2)] }), ice);
  eq([r.mine, r.yours, r.beatenBy], [13, 11, false], "the Speed bonus is added to the runner's side");
  assert(r.line.includes("Speed 2"), "and it is shown in the result");
  queue.push(6, 7);
  r = await M.speedContest(fakeRunner({ rank: 5 }), ice);
  eq([r.mine, r.yours, r.beatenBy], [11, 11, false], "a tie is not a win for the ICE");
  delete globalThis.Roll;
});

check("T27 the NET Action table is read off the Interface rank", () => {
  const at = (rank) => M.baseNetActions(fakeRunner({ rank }));
  eq([at(1), at(2), at(3)], [2, 2, 2], "rank 1 to 3 gives 2");
  eq([at(4), at(5), at(6)], [3, 3, 3], "rank 4 to 6 gives 3");
  eq([at(7), at(8), at(9)], [4, 4, 4], "rank 7 to 9 gives 4");
  eq(at(10), 5, "rank 10 gives 5");
  eq(at(12), 5, "nothing above the table reads past it");
  eq(at(0), 0, "no Interface, no NET Actions");
  // a bonus to the Interface check does not widen the table
  eq(M.baseNetActions(fakeRunner({ rank: 3, effects: [effect("bonuses.interface", 4)] })), 2, "bonuses raise checks, not the pool");
});

check("T28 the pool spends down, refills on a Turn, and pays off what it owes", async () => {
  const cipher = fakeRunner({ rank: 5 });
  eq(M.netPool(cipher), { max: 3, left: 3, penalty: 0 }, "an untouched runner starts full");
  await M.spendNetAction(cipher);
  eq(M.netPool(cipher).left, 2, "a spent action is gone");
  await M.spendNetAction(cipher);
  await M.spendNetAction(cipher);
  eq(M.netPool(cipher).left, 0, "the pool empties");
  const over = await M.spendNetAction(cipher);
  eq([over.left, over.short], [0, true], "spending past empty is flagged but not blocked");
  await M.refillNetActions(cipher);
  eq(M.netPool(cipher), { max: 3, left: 3, penalty: 0 }, "a new Turn refills it");

  await M.chargeNetActions(cipher, 1);
  eq(M.netPool(cipher).penalty, 1, "a Wisp leaves a debt on the current Turn");
  eq(M.netPool(cipher).left, 3, "but this Turn is untouched");
  eq((await M.refillNetActions(cipher)), { max: 2, penalty: 1 }, "the next Turn is one short");
  eq(M.netPool(cipher), { max: 2, left: 2, penalty: 0 }, "and the debt is paid off");
  await M.refillNetActions(cipher);
  eq(M.netPool(cipher).max, 3, "the Turn after that is whole again");

  // the floor is on the pool, not on the size of the reduction: three Wisps on a rank 5 runner
  await M.chargeNetActions(cipher, 3);
  eq((await M.refillNetActions(cipher)).max, 2, "a pool never drops below 2");
  // and a rank 9 runner takes the full hit
  const big = fakeRunner({ rank: 9 });
  await M.chargeNetActions(big, 3);
  eq((await M.refillNetActions(big)).max, 2, "4 less 3 is 1, floored to 2");
  const mid = fakeRunner({ rank: 9 });
  await M.chargeNetActions(mid, 1);
  eq((await M.refillNetActions(mid)).max, 3, "4 less 1 is 3, above the floor");
});

const fakeCombat = ({ started = true, active = true, scene = "sceneA", holds = [], ours = false } = {}) => ({
  started, active, scene: { id: scene }, getFlag: (m, k) => (k === "ours" ? ours : undefined),
  combatants: holds.map((t) => ({ tokenId: t.id, sceneId: t.parent.id })),
});

check("T31 jacking only costs a NET Action while a Turn is actually running", async () => {
  const cipher = fakeRunner({ rank: 5 });
  const body = { id: "body1", parent: { id: "sceneA" }, actor: cipher };
  const was = game.combats;

  game.combats = [];
  assert(!M.turnRunning(body), "no combat at all means no Turn");
  eq(await M.netActionCost(body), "", "and jacking says nothing");
  eq(M.netPool(cipher).left, 3, "and costs nothing");

  // a combat that exists but has not been started yet is still not a Turn
  game.combats = [fakeCombat({ started: false, holds: [body] })];
  assert(!M.turnRunning(body), "an unstarted combat is not a Turn");
  eq(await M.netActionCost(body), "", "so jacking is still silent");
  eq(M.netPool(cipher).left, 3, "and the pool is untouched");

  // a running fight the runner is not part of gives them no Turn to spend out of
  game.combats = [fakeCombat({ holds: [{ id: "someone-else", parent: { id: "sceneA" } }] })];
  assert(!M.turnRunning(body), "someone else's fight is not the runner's Turn");
  eq(M.netPool(cipher).left, 3, "so still nothing spent");

  /* A fight that opens inside the Architecture holds the avatar and never the body, so asking
     only about the body would make every NET Action free for the whole run. */
  const avatar = { id: "av1", getFlag: (m, k) => (k === "avatarOf" ? "body1" : undefined) };
  const sceneA = { id: "sceneA", tokens: [avatar] };
  avatar.parent = sceneA;
  game.combats = [fakeCombat({ holds: [avatar] })];
  assert(M.turnRunning({ id: "body1", parent: sceneA, actor: cipher }),
    "the runner's own avatar in a started fight is a Turn");
  assert(!M.turnRunning({ id: "body2", parent: sceneA, actor: cipher }),
    "but another runner's body borrows nothing from it");

  game.combats = [fakeCombat({ holds: [body] })];
  assert(M.turnRunning(body), "a started fight holding the runner's token is a Turn");
  assert((await M.netActionCost(body)).includes("2 left"), "now jacking costs one and says so");
  eq(M.netPool(cipher).left, 2, "and the pool drops");

  game.combats = was;
});

check("T32 the fight is found by the token in it, never by scanning for an active combat", () => {
  const was = game.combats;
  const body = { id: "body1", parent: { id: "sceneA" } };

  /* The bug this guards: Combat#activate only clears the active flag on combats for the scene in
     view, so last session's fight on another scene is still flagged active, and it is older, so
     any `find(c => c.active)` reaches it first. */
  const stale = fakeCombat({ scene: "sceneB", holds: [{ id: "old-token", parent: { id: "sceneB" } }] });
  const real = fakeCombat({ scene: "sceneA", holds: [body] });
  game.combats = [stale, real];
  assert(M.combatOf(body) === real, "the fight holding this token wins over an older active one");
  assert(game.combats.find((c) => c.active) === stale, "and the old way really would have picked the stale one");

  // same token id on a different scene is a different token, and not this runner's fight
  game.combats = [fakeCombat({ scene: "sceneB", holds: [{ id: "body1", parent: { id: "sceneB" } }] })];
  eq(M.combatOf(body), null, "a matching id on another scene is not a match");

  // a started fight is preferred over one merely flagged active
  const idle = fakeCombat({ started: false, active: true, holds: [body] });
  const live = fakeCombat({ started: true, active: false, holds: [body] });
  game.combats = [idle, live];
  assert(M.combatOf(body) === live, "a started fight beats an unstarted one that is flagged active");

  eq(M.combatOf(null), null, "no token, no fight");
  game.combats = was;
});

/* An Active Effect as CPR stores one, so netBonus reads it the way the system would. */
const fx = (key, value) => ({ disabled: false, system: {}, changes: [{ key, value: String(value) }] });

check("T33 the Armor program comes off brain damage, and HP never goes below zero", async () => {
  const wisp = { name: "Wisp", actor: { name: "Wisp", type: "blackIce", system: { stats: { spd: 4 } } } };

  // Armor lowers all brain damage received by 4
  const armored = fakeRunner({ rank: 5, hp: 30, effects: [fx("bonuses.brainDamageReduction", 4)] });
  stubRoll([6]);
  const said = await M.landEffect(armored, wisp);
  eq(armored.system.derivedStats.hp.value, 28, "6 less 4 is 2");
  assert(said.includes("less 4 brain damage reduction"), "and the card shows the reduction");
  assert(!/Armor does not reduce/.test(said), "and no longer claims Armor does not apply");

  // reduction bigger than the hit does not heal anybody
  const tanky = fakeRunner({ rank: 5, hp: 30, effects: [fx("bonuses.brainDamageReduction", 9)] });
  stubRoll([3]);
  await M.landEffect(tanky, wisp);
  eq(tanky.system.derivedStats.hp.value, 30, "a soaked hit does nothing");

  // hp.value is a NumberField with min 0, so the card must not promise a negative
  const dying = fakeRunner({ rank: 5, hp: 4 });
  stubRoll([6]);
  const card = await M.landEffect(dying, wisp);
  eq(dying.system.derivedStats.hp.value, 0, "HP bottoms out at zero");
  assert(card.includes("HP 4 to 0"), `the card reports what the sheet will hold: ${card}`);

  // and with no reduction at all nothing changes about the old behaviour
  const bare = fakeRunner({ rank: 5, hp: 30 });
  stubRoll([5]);
  await M.landEffect(bare, wisp);
  eq(bare.system.derivedStats.hp.value, 25, "a plain hit still lands in full");
});

check("T36 a new access point waits in the middle of the map, not in the margin below it", () => {
  /* The live test scene: 100px grid, a 3840x2160 casino map laid at the scene origin. That is 38.4
     by 21.6 squares, so whole squares are counted and the middle ones are 19 across and 10 down. */
  eq(M.accessPointSpot(1000, 400, 3840, 2160, 100), { x: 2900, y: 1400 }, "the middle square of the map");

  // squares are counted from the scene origin, so padding that is not a multiple of the grid stays aligned to it
  eq(M.accessPointSpot(1050, 450, 3840, 2160, 100), { x: 2950, y: 1450 }, "off-grid padding keeps its own alignment");

  // a map smaller than one square still leaves the token on it
  eq(M.accessPointSpot(0, 0, 40, 40, 100), { x: 0, y: 0 }, "a tiny map keeps it at the origin");

  // whatever the map's size, the token lands inside it rather than over an edge
  for (const [w, h] of [[3840, 2160], [2000, 2000], [1999, 1999], [100, 100], [101, 101], [4000, 300]]) {
    const spot = M.accessPointSpot(1000, 400, w, h, 100);
    assert(spot.x >= 1000 && spot.x + 100 <= 1000 + Math.max(100, w), `a ${w}-wide map keeps the token on it`);
    assert(spot.y >= 400 && spot.y + 100 <= 400 + Math.max(100, h), `a ${h}-high map keeps the token on it`);
  }
});

check("T35 a rezzed Armor program supplies the 4 that CPR never attaches to it", () => {
  const prog = (name, isRezzed) => ({ type: "program", name, system: { isRezzed } });
  const withDeck = (programs) => {
    const a = fakeRunner({ rank: 5 });
    a.items = [...a.items, ...programs];
    a.getEquippedCyberdeck = () => ({ getInstalledItems: () => programs });
    return a;
  };

  eq(M.brainSoak(withDeck([prog("Armor", true)])), 4, "rezzed Armor lowers brain damage by 4");
  eq(M.brainSoak(withDeck([prog("Armor", false)])), 0, "an unrezzed Armor does nothing");
  eq(M.brainSoak(withDeck([prog("Sword", true)])), 0, "another program does nothing");
  eq(M.brainSoak(withDeck([])), 0, "an empty deck does nothing");

  // a world that has wired up its own Active Effect is not counted twice
  const wired = withDeck([prog("Armor", true)]);
  wired.allApplicableEffects = () => [fx("bonuses.brainDamageReduction", 4)];
  eq(M.brainSoak(wired), 4, "an Active Effect takes over rather than stacking with the fallback");

  // universal damage reduction rides along, as CPR's own brain branch adds it
  const both = withDeck([prog("Armor", true)]);
  both.allApplicableEffects = () => [fx("bonuses.universalDamageReduction", 2)];
  eq(M.brainSoak(both), 6, "universal reduction adds to the program's 4");
});

check("T34 the wound penalty is on the Speed Contest, because its own damage causes it", async () => {
  const wisp = { name: "Wisp", actor: { name: "Wisp", type: "blackIce", system: { stats: { spd: 4 } } } };

  stubRoll([5, 5]);
  const well = await M.speedContest(fakeRunner({ rank: 5 }), wisp);
  eq(well.mine, 10, "Interface 5 plus a 5");

  stubRoll([5, 5]);
  const hurt = await M.speedContest(fakeRunner({ rank: 5, wound: -2 }), wisp);
  eq(hurt.mine, 8, "Seriously Wounded takes 2 off");
  assert(hurt.line.includes("2 wounded"), `and the card says so: ${hurt.line}`);

  stubRoll([5, 5]);
  const dying = await M.speedContest(fakeRunner({ rank: 5, wound: -4 }), wisp);
  eq(dying.mine, 6, "Mortally Wounded takes 4 off");

  // allActions rides along the same way CPR applies it
  stubRoll([5, 5]);
  const helped = await M.speedContest(fakeRunner({ rank: 5, effects: [fx("bonuses.allActions", 1)] }), wisp);
  eq(helped.mine, 11, "an allActions bonus counts too");
});

check("T29 only the eight NET Actions cost one", () => {
  for (const a of ["backdoor", "cloak", "control", "eyedee", "pathfinder", "slide", "virus", "zap"])
    assert(M.NET_ABILITIES.has(a), `${a} is a NET Action`);
  for (const a of ["scanner", "defense", "speed"])
    assert(!M.NET_ABILITIES.has(a), `${a} is not a NET Action`);
});

check("T30 every piece of ICE has an effect, and a Wisp's lands on HP and the pool", async () => {
  for (const name of Object.keys(M.ICE)) assert(M.ICE_EFFECT[name], `${name} has no effect written`);

  const queue = [];
  stubRoll(queue);
  const cipher = fakeRunner({ rank: 5, hp: 30 });
  const wisp = { name: "Wisp", actor: { name: "Wisp", type: "blackIce" } };
  queue.push(4);
  const text = await M.landEffect(cipher, wisp);
  eq(M.iceName({ name: "TEST Wisp (ICE)", actor: { name: "TEST Wisp (ICE)" } }), "Wisp", "a renamed token still lands the right effect");
  eq(cipher.system.derivedStats.hp.value, 26, "4 brain damage comes straight off HP");
  eq(M.netPool(cipher).penalty, 1, "and the next Turn owes one NET Action");
  assert(text.includes("Applied:"), "the card says what it did");
  assert(text.includes("HP 30 to 26"), "and names the HP it took");
  assert(text.includes("pool 2 instead of 3"), "and the pool the next Turn gets");

  // a Giant hits HP but hands the jack out back to the GM
  queue.push(11);
  const giant = { name: "Giant", actor: { name: "Giant", type: "blackIce" } };
  const g = await M.landEffect(fakeRunner({ rank: 5, hp: 30 }), giant);
  assert(g.includes("unsafely jacked out"), "the Giant's jack out is announced");
  assert(!g.includes("pool"), "a Giant costs no NET Actions");

  // an Asp names a Program on the deck rather than deleting it
  const armed = fakeRunner({ rank: 5, programs: ["Armor"] });
  const asp = await M.landEffect(armed, { name: "Asp", actor: { name: "Asp", type: "blackIce" } });
  assert(asp.includes("Armor"), "the Asp names the Program it destroys");
  assert(!asp.includes("Applied:"), "but does not delete it");
  const bare = await M.landEffect(fakeRunner({ rank: 5 }), { name: "Asp", actor: { name: "Asp", type: "blackIce" } });
  assert(bare.includes("has none"), "a runner with no Programs is said to have none");

  // anti-program ICE rolls its number and leaves the target to the GM
  queue.push(17);
  const dragon = await M.landEffect(fakeRunner({ rank: 5 }), { name: "Dragon", actor: { name: "Dragon", type: "blackIce" } });
  assert(dragon.includes("<b>17</b>"), "the Dragon's 6d6 is rolled");
  assert(dragon.includes("one Program"), "but no Program is picked");

  // a Liche rolls all three stats
  queue.push(2, 5, 6);
  const liche = await M.landEffect(fakeRunner({ rank: 5 }), { name: "Liche", actor: { name: "Liche", type: "blackIce" } });
  assert(/INT &minus;2, REF &minus;5, DEX &minus;6/.test(liche), `the Liche rolls each stat: ${liche}`);
  delete globalThis.Roll;
});

check("T37 jacking in wakes every Demon in the build, and nothing else", () => {
  const ID = "cpr-netarch-scene";
  const tok = (name, type, asleep, floor) => ({
    name, actor: { type },
    getFlag: (m, k) => (m === ID && k === "asleep" ? asleep : undefined),
    floor,
  });
  const floorOf = (t) => (t.floor == null ? null : { n: t.floor });
  const tokens = [
    tok("Imp", "demon", undefined, 4),          // never touched, still lying in wait
    tok("Efreet", "demon", true, 12),           // explicitly asleep, at the far end
    tok("Balron", "demon", false, 7),           // already awake from an earlier run
    tok("Hellhound", "blackIce", undefined, 3), // ICE waits for its own room
    tok("Cipher (NET)", "character", undefined, 1),
    tok("Imp", "demon", undefined, null),       // a Demon token dragged off the map
  ];
  const woken = M.demonsToWake(tokens, floorOf).map((t) => t.name);
  eq(woken.join(","), "Imp,Efreet", "only the sleeping Demons standing on a floor wake");
});

check("T38 Pathfinder reads as deep as the check and stops at the first thing it cannot read", () => {
  const F = (n, items, path = "Main") => ({ n, path, items });
  const node = (kind, dv) => ({ kind: "node", node: kind, dv });
  const ice = (name, count = 1) => ({ kind: "ice", name, count });
  const floors = [
    F(1, [node("password", 8)]),
    F(2, [ice("Wisp")]),
    F(3, [node("control", 10)]),
    F(4, [ice("Hellhound")]),
    F(5, [node("control", 12)]),
    F(6, [ice("Kraken")]),
    F(7, [ice("Raven", 2)], "Vault"),
  ];

  // the count is the cap, on a path with nothing locked on it
  const open = [F(1, [ice("Wisp")]), F(2, [ice("Raven", 2)]), F(3, [ice("Hellhound")]), F(4, [ice("Kraken")])];
  const two = M.pathfinderReach(open, 1, "Main", 2);
  eq(two.seen.map((f) => f.n).join(","), "1,2", "a check of 2 reads two floors");
  eq(two.blocked, null, "and is stopped by range, not by a lock");
  assert(two.short, "which it says");

  // an imploded roll does not even clear the lobby, and the floor underfoot is all he gets
  const bad = M.pathfinderReach(floors, 1, "Main", 2);
  eq(bad.seen.map((f) => f.n).join(","), "1", "a check of 2 is stopped by the DV8 lobby");
  eq(bad.blocked, 1, "on floor 1 itself");

  // a DV above the check stops it, and the floor holding it is still seen
  const ten = M.pathfinderReach(floors, 1, "Main", 10);
  eq(ten.seen.map((f) => f.n).join(","), "1,2,3,4,5", "it reads down to the DV12 node");
  eq(ten.blocked, 5, "and names the floor that stopped it");

  // beat every DV and the whole path resolves
  const twelve = M.pathfinderReach(floors, 1, "Main", 12);
  eq(twelve.seen.map((f) => f.n).join(","), "1,2,3,4,5,6", "a check of 12 reads the whole path");
  eq(twelve.blocked, null, "with nothing left sealed");
  assert(!twelve.short, "and nothing left over");

  // it reads on from where the runner stands, not from the top
  eq(M.pathfinderReach(floors, 4, "Main", 2).seen.map((f) => f.n).join(","), "4,5",
    "the count starts at the runner's own floor");

  // a branch is a different way down, never more of this one
  assert(!M.pathfinderReach(floors, 1, "Main", 20).seen.some((f) => f.path === "Vault"),
    "the other path is never walked");
});

check("T39 Pathfinder never prints a DV", () => {
  const floor = { n: 1, items: [
    { kind: "node", node: "password", dv: 8 },
    { kind: "node", node: "control", dv: 12 },
    { kind: "ice", name: "Raven", count: 2 },
    { kind: "demon", name: "Efreet" },
  ] };
  const text = M.floorPlain(floor);
  eq(text, "Password, Control Node, Raven x2, Efreet", "it names what is there");
  assert(!/dv|\b8\b|\b12\b/i.test(text), `and no DV survives: ${text}`);
  eq(M.floorPlain({ n: 2, items: [] }), "an empty room", "an empty floor still reads as something");
});

queue.then(() => {
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
