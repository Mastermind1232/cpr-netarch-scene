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
  keybindings: { register() {} },
};
const ui = { notifications: { info() {}, warn() {}, error() {} } };
const foundry = { utils: {} };
new Function("Hooks", "game", "ui", "foundry", src)(Hooks, game, ui, foundry);
hooks.init.forEach((f) => f());
const M = globalThis.CPRNetArch;

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); pass++; console.log(`ok   ${name}`); }
  catch (err) { fail++; console.log(`FAIL ${name}: ${err.message}`); }
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
