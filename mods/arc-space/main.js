import { View, div, svg, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, panes, run, theme, home, appHome, openOverlay, nextCommand, checking, settings, shared, setShared, props, readTextFile, closeOverlay, exec, window as win } from "herdr";
import { Picker } from "./picker.js";
import { Tips } from "./tip.js";
import { snapshot, recordClosed, reopenLast } from "./reopen.js";
import { themeFor, palette, apply, backgrounds, find } from "./theme.js";

const C = {
  selected: "#ffffff24",
  selectedEdge: "#ffffff1f",
  split: "#ffffff0f",
  chip: "#ffffff0a",
  hover: "#ffffff0d",
  rule: "#ffffff14",
  text: "#e8e9eb",
  soft: "#c4c6ca",
  dim: "#8b8f95",
  dot: "#131619",
  pressed: "#00000033",
};

function folder(cwd) {
  if (!cwd) return "";
  const h = home();
  return cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
}

function lead(mine) {
  return mine.find((p) => p.focused) ?? mine.find((p) => p.program?.agent) ?? mine[0];
}

const clean = (s) => (s ?? "").replace(/^[^\p{L}\p{N}\p{Ps}\p{Pi}]+/u, "").replace(/^\[ [!.] \] /, "").trim();

function liveTitle(p) {
  if (!p?.program?.agent) return "";
  const live = clean(p.title);
  const path = /^[~/]|^[A-Za-z]:\\/.test((p.title ?? "").replace(/^[^\p{L}\p{N}~/]+/u, ""));
  const telling = live && live !== p.terminal && live !== p.program.name && !path && !live.includes("@") && live.toLowerCase() !== p.program.key;
  return telling ? live : "";
}

function label(tab, p) {
  const prog = p?.program?.name;
  const base = tab.named ? tab.name : prog ?? "Terminal";
  const live = liveTitle(p);
  return (tab.name === prog || !tab.named) && live ? live : base;
}

function paneLabel(p) {
  if (!p.terminal) return p.title;
  return liveTitle(p) || p.program?.name || folder(p.cwd).split("/").pop() || "Terminal";
}

function tile(t, p) {
  const g = p?.program;
  const dot = p?.status && p.status !== "idle" ? t[p.status] : null;
  return div()
    .relative()
    .flex_none()
    .w(20)
    .h(20)
    .rounded(5)
    .bg(g?.tile ?? C.chip)
    .flex()
    .items_center()
    .justify_center()
    .when(Boolean(g?.icon), (el) =>
      el.child(g.tint ? svg(g.icon).size(12).text_color(g.color ?? C.text) : image(g.icon).w(12).h(12)),
    )
    .when(Boolean(dot), (el) =>
      el.child(div().absolute().top(-3).right(-3).w(9).h(9).rounded_full().border_2().border_color(C.dot).bg(dot)),
    );
}

function badge(n) {
  return div()
    .flex_none()
    .px(5)
    .h(18)
    .rounded(5)
    .bg(C.rule)
    .flex()
    .items_center()
    .text_size(11)
    .text_color(C.text)
    .child(`⌘${n}`);
}

function own(el) {
  return el.on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_mouse_down("right", (_e, cx) => cx.stop_propagation());
}

function windowButton(id, icon, command) {
  return own(div())
    .id(id)
    .flex_none()
    .w(24)
    .h(24)
    .rounded_full()
    .flex()
    .items_center()
    .justify_center()
    .text_color(C.dim)
    .cursor_pointer()
    .hover((s) => s.bg(C.hover).text_color(C.text))
    .on_click(() => run(command))
    .child(svg(`mods/arc-space/${icon}.svg`).size(14));
}

function iconButton(id, icon, onClick) {
  return own(div())
    .id(id)
    .flex_none()
    .p(6)
    .rounded(7)
    .text_color(C.dim)
    .cursor_pointer()
    .hover((s) => s.bg(C.hover).text_color(C.text))
    .on_click(onClick)
    .child(svg(`mods/arc-space/${icon}.svg`).size(16));
}

function closeButton(id, command, args) {
  return own(div())
    .id(id)
    .flex_none()
    .p(3)
    .rounded(5)
    .text_color(C.dim)
    .cursor_pointer()
    .hover((s) => s.bg(C.hover).text_color(C.text))
    .on_click((_e, cx) => {
      cx.stop_propagation();
      if (command === "tab.close") closeTab(args.id, spaces().find((s) => s.tabs.some((t) => t.id === args.id))?.id);
      else run(command, args);
    })
    .child(svg("mods/arc-space/close.svg").size(13));
}

const PUSH_STEPS = 11;
const FAST = 130;
const STEP = 14;

function tabMenu(tab, space, pane) {
  const split = panes().filter((q) => q.tab === tab).length > 1;
  const rows = split ? (pane ? 3 : 2) : 3;
  openOverlay({ mod: "arc-space", kind: "popup", width: 230, height: 22 + rows * 35 + 9, frame: "none", props: { view: "tab-menu", tab, space, pane, split } });
}

function job(spec) {
  setShared("arc-space.job", spec);
  run("arc-space.job");
}

function menuPanel(items) {
  return v_flex().id("ctx-menu").w_full().p(6).gap(1).rounded(12).border_1().border_color("#3a3b40").bg("#2a2b2f").shadow_lg().children(items);
}

function menuItem(overlay, id, label, action, danger) {
  return div()
    .id(`mn-${id}`)
    .h(34)
    .px(12)
    .flex()
    .items_center()
    .rounded(8)
    .cursor_pointer()
    .text_size(13.5)
    .text_color(danger ? "#ff8a80" : "#ecedef")
    .hover((s) => s.bg("#41677b").text_color("#ffffff"))
    .on_click(() => {
      closeOverlay(overlay);
      action();
    })
    .child(label);
}

function rule() {
  return div().h(1).mx(8).my(4).bg("#3a3b40");
}

function tabMenuView() {
  const { tab, space, pane, split, overlay } = props();
  const items = split
    ? [menuItem(overlay, "separate", "Separate All Tabs", () => job({ kind: "separate", tab }))]
    : [
        menuItem(overlay, "add-split", "Add Split Terminal\u2026", () =>
          openOverlay({ mod: "arc-space", kind: "popup", width: 280, height: 360, frame: "none", props: { view: "tab-pick", tab, space } }),
        ),
        menuItem(overlay, "rename", "Rename Tab\u2026", () => run("tab.rename", { id: tab })),
      ];
  items.push(rule());
  if (split && pane) items.push(menuItem(overlay, "close-pane", "Close Pane", () => run("pane.close", { pane }), true));
  items.push(menuItem(overlay, "close-tab", "Close Tab", () => closeTab(tab, space), true));
  return menuPanel(items);
}

function tabPickView() {
  const { tab, space, overlay } = props();
  const t = theme();
  const all = panes();
  const others = (spaces().find((p) => p.id === space)?.tabs ?? []).filter((c) => c.id !== tab);
  const rows = others.map((c) => {
    const mine = all.filter((q) => q.tab === c.id);
    const p = lead(mine);
    return div()
      .id(`pick-${c.id}`)
      .h(38)
      .px(10)
      .flex()
      .gap(10)
      .items_center()
      .rounded(8)
      .cursor_pointer()
      .text_size(13.5)
      .text_color("#ecedef")
      .hover((s) => s.bg("#41677b").text_color("#ffffff"))
      .on_click(() => {
        closeOverlay(overlay);
        job({ kind: "merge", into: tab, from: c.id });
      })
      .child(tile(t, p))
      .child(div().flex_1().min_w(0).truncate().child(label(c, p)))
      .when(mine.length > 1, (el) => el.child(div().text_size(11.5).text_color("#8e9097").child(`${mine.length} panes`)));
  });
  return menuPanel([
    div().px(12).pt(6).pb(4).text_size(11).font_semibold().text_color("#8e9097").child("SPLIT WITH"),
    ...(rows.length ? rows : [div().px(12).py(8).text_size(13).text_color("#8e9097").child("No other tabs in this space")]),
  ]);
}

const pause = (later, ms) => new Promise((done) => later(ms, done));

function spaceMenu(spaceId) {
  openOverlay({ mod: "arc-space", kind: "popup", width: 230, height: 172, frame: "none", props: { view: "menu", space: spaceId } });
}

function menuView() {
  const { space, overlay } = props();
  const item = (id, label, action, danger) =>
    div()
      .id(`mn-${id}`)
      .h(34)
      .px(12)
      .flex()
      .items_center()
      .rounded(8)
      .cursor_pointer()
      .text_size(13.5)
      .text_color(danger ? "#ff8a80" : "#ecedef")
      .hover((s) => s.bg("#41677b").text_color("#ffffff"))
      .on_click(() => {
        closeOverlay(overlay);
        action();
      })
      .child(label);
  return v_flex()
    .id("space-menu")
    .w_full()
    .p(6)
    .gap(1)
    .rounded(12)
    .border_1()
    .border_color("#3a3b40")
    .bg("#2a2b2f")
    .shadow_lg()
    .child(item("theme", "Edit Theme Color\u2026", () => editTheme(space)))
    .child(item("rename", "Rename Space\u2026", () => run("space.rename", { id: space })))
    .child(item("tab", "New Tab", () => run("tab.new", { space })))
    .child(div().h(1).mx(8).my(4).bg("#3a3b40"))
    .child(item("close", "Close Space", () => confirmCloseSpace(space), true));
}

function confirm(title, detail, label, command) {
  openOverlay({ mod: "arc-space-confirm", kind: "dialog", frame: "none", width: 400, height: 170, props: { title, detail, confirm: label, command } });
}

function confirmCloseSpace(spaceId) {
  const s = spaces().find((p) => p.id === spaceId);
  const n = s?.tabs.length ?? 0;
  confirm(
    `Close “${s?.name ?? "this space"}”?`,
    `Its ${n === 1 ? "tab" : `${n} tabs`} and every terminal in ${n === 1 ? "it" : "them"} will end.`,
    "Close Space",
    { name: "space.close", args: { id: spaceId, confirmed: true } },
  );
}

function closeTab(tabId, spaceId) {
  const s = spaces().find((p) => p.id === spaceId);
  if (s && s.tabs.length <= 1) confirmCloseSpace(spaceId);
  else run("tab.close", { id: tabId, confirmed: true });
}

function editTheme(spaceId) {
  openOverlay({ mod: "arc-space", kind: "popup", width: 376, height: 600, frame: "none", props: { view: "theme", space: spaceId } });
}

function openPalette() {
  openOverlay({ mod: "terminals-palette", kind: "dialog", frame: "none", width: 640, height: 520 });
}

function launch() {
  const open = shared("terminals-launcher.open");
  if (open) {
    closeOverlay(open);
    setShared("terminals-launcher.open", null);
    return;
  }
  openOverlay({ mod: "terminals-launcher", kind: "dialog", frame: "none", width: 720, height: 500 });
}

function switchPanes() {
  const open = shared("terminals-launcher.open");
  if (open && shared("terminals-launcher.mode") === "panes") {
    setShared("terminals-launcher.step", (shared("terminals-launcher.step") ?? 0) + 1);
    return;
  }
  if (open) closeOverlay(open);
  openOverlay({ mod: "terminals-launcher", kind: "dialog", frame: "none", width: 720, height: 500, props: { mode: "panes" } });
}

function row(id) {
  return own(h_flex())
    .id(id)
    .flex_none()
    .w_full()
    .min_w(0)
    .h(38)
    .px(10)
    .gap(10)
    .items_center()
    .rounded(10)
    .cursor_pointer()
    .text_size(13)
    .active((s) => s.bg(C.pressed).shadow_none().pt(2));
}

export default class TerminalsSide extends View {
  init(_props, cx) {
    if (props()?.view === "theme") {
      this.picker = new Picker();
      return;
    }
    if (props()?.view === "menu") {
      this.menu = true;
      setShared("arc-space.menu-open", props().overlay);
      return;
    }
    if (props()?.view === "tab-menu" || props()?.view === "tab-pick") {
      this.view = props().view;
      setShared("arc-space.menu-open", props().overlay);
      return;
    }
    this.cmd = false;
    this.numbers = false;
    this.press = 0;
    this.hovered = null;
    this.anim = 0;
    this.shift = 0;
    this.shiftAt = 0;
    this.turn = 0;
    this.entering = new Set();
    this.enteringAt = 0;
    this.ghosts = [];
    this.jobs = [];
    this.tips = new Tips((ms, fn) => this.later(ms, fn), () => Boolean(shared("arc-space.menu-open")));
    this.out = Boolean(shared("arc-space.collapsed"));
    if (checking()) return;
    // Drain jobs immediately when any are pending, then wait. Dropping the
    // resolver before the loop re-arms keeps a `later()` that lands mid-drain
    // from calling a dead wake(): it would strand its job (and the render it
    // was meant to fix) forever.
    cx.spawn(async (cx) => {
      for (;;) {
        if (!this.jobs.length) await new Promise((wake) => (this.wake = wake));
        this.wake = null;
        for (const job of this.jobs.splice(0)) {
          cx.timer.after(job.ms, (cx) => {
            job.fn();
            cx.notify();
          });
        }
      }
    });
    cx.timer.every(1500, () => this.watchClosed());
    cx.spawn(async () => {
      for (;;) {
        await new Promise((wake) => (this.themeWake = wake));
        const th = this.pending;
        try {
          const tree = JSON.parse(await readTextFile(appHome() + "/layouts/arc-space.json"));
          if (!find(tree, "tint")) continue;
          run("layout.set", { layout: apply(tree, th, shared("arc-space.collapsed") ? 0 : this.full()) });
        } catch {}
      }
    });
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        if (c === "launch") launch();
        else if (c === "toggle") this.toggle(cx);
        else if (c === "palette") openPalette();
        else if (c === "panes") switchPanes();
        else if (c === "reopen") cx.spawn(async () => reopenLast());
        else if (c === "job") this.runJob(cx, shared("arc-space.job"));

        else if (c === "theme") editTheme(spaces().find((p) => p.active)?.id);
        else if (/^tab[1-9]$/.test(c)) this.selectTab(Number(c.slice(3)));
        else if (/^space[1-9]$/.test(c)) this.selectSpace(Number(c.slice(5)));
      }
    });
  }

  hover(id) {
    return (on, cx) => {
      if (on) this.hovered = id;
      else if (this.hovered === id) this.hovered = null;
      cx.notify();
    };
  }

  modifiers(e, cx) {
    const down = e.modifiers.platform && !e.modifiers.shift && !e.modifiers.alt && !e.modifiers.control;
    if (down === this.cmd) return;
    this.cmd = down;
    const press = ++this.press;
    if (down) {
      cx.timer.after(350, (cx) => {
        if (this.press !== press || !this.cmd) return;
        this.numbers = true;
        cx.notify();
      });
    } else if (this.numbers) {
      this.numbers = false;
      cx.notify();
    }
  }

  chip(t, c, q, compact) {
    const on = c.active && q.focused;
    const id = `pane-${q.pane}`;
    const hovered = this.hovered === id;
    const x = closeButton(`tm-x-${q.pane}`, "pane.close", { pane: q.pane });
    return this.tips.wrap(
      id,
      own(h_flex())
        .id(`tm-pane-${q.pane}`)
        .relative()
        .flex_1()
        .min_w(0)
        .h(32)
        .px(compact ? 0 : 8)
        .gap(8)
        .items_center()
        .when(compact, (el) => el.justify_center())
        .rounded(8)
        .border_1()
        .cursor_pointer()
        .when(on, (el) => el.bg(C.selected).border_color(C.selectedEdge).shadow_sm())
        .when(!on, (el) => el.bg(C.chip).border_color("#00000000").hover((s) => s.bg(C.hover)))
        .active((s) => s.bg(C.pressed).shadow_none().pt(2))
        .on_hover(this.hover(id))
        .on_mouse_down("right", (_e, cx) => {
          cx.stop_propagation();
          this.tips.hideAll();
          cx.notify();
          tabMenu(c.id, spaces().find((p) => p.active)?.id, q.pane);
        })
        .on_click(() => {
          run("tab.select", { id: c.id });
          run("pane.focus", { pane: q.pane });
        })
        .child(tile(t, q))
        .when(!compact, (el) => el.child(div().flex_1().min_w(0).truncate().text_color(on ? C.text : C.soft).child(paneLabel(q))))
        .when(!compact && (hovered || on), (el) => el.child(x))
        .when(compact && hovered, (el) =>
          el.child(div().absolute().top(-6).right(-6).rounded_full().bg(C.dot).border_1().border_color(C.selectedEdge).child(x)),
        ),
      paneLabel(q),
      null,
      "grow",
    );
  }


  tab(t, all, space, c, i) {
    const mine = all.filter((q) => q.tab === c.id);
    const split = mine.length > 1;
    const p = lead(mine);
    return row(`tm-${c.id}`)
      .when(split, (el) => el.h(42).px(4).gap(4).bg(c.active ? C.split : "#00000000").when(c.active, (e) => e.shadow_md()))
      .when(!split && c.active, (el) => el.bg(C.selected).border_1().border_color(C.selectedEdge).shadow_md())
      .when(!split && !c.active, (el) => el.hover((s) => s.bg(C.hover)))
      .on_click(() => run("tab.select", { id: c.id }))
      .on_mouse_down("right", (_e, cx) => {
        this.tips.hideAll();
        cx.notify();
        tabMenu(c.id, space.id);
      })
      .when(split, (el) => el.children(mine.map((q) => this.chip(t, c, q, mine.length > 2))))
      .on_hover(this.hover(c.id))
      .when(!split, (el) =>
        el.child(tile(t, p)).child(div().flex_1().min_w(0).truncate().text_color(c.active ? C.text : C.soft).child(label(c, p))),
      )
      .when(!split && !this.numbers && (c.active || this.hovered === c.id), (el) =>
        el.child(this.tips.wrap(`x-${c.id}`, closeButton(`tm-x-${c.id}`, "tab.close", { id: c.id }), "Close tab", "cmd-w")),
      )
      .when(this.numbers && i < 9, (el) => el.child(badge(i + 1)));
  }

  full() {
    return shared("arc-space.width") ?? 240;
  }

  toggle(cx) {
    const collapsed = Boolean(shared("arc-space.collapsed"));
    const full = this.full();
    const [from, to] = collapsed ? [0, full] : [full, 0];
    const anim = ++this.anim;
    if (collapsed) setShared("arc-space.collapsed", false);
    for (let i = 1; i <= PUSH_STEPS; i++) {
      cx.timer.after(i * 16, () => {
        if (this.anim !== anim) return;
        const k = i / PUSH_STEPS;
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        run("layout.resize", { id: "sidebar", px: Math.round(from + (to - from) * e) });
        if (i === PUSH_STEPS && !collapsed) setShared("arc-space.collapsed", true);
      });
    }
  }

  async keepUntil(terminal, place, done) {
    for (let i = 0; i < 20; i++) {
      await pause((ms, fn) => this.later(ms, fn), 150);
      if (done()) return true;
      try {
        await exec("herdr-app", ["do", "terminal.keep", JSON.stringify({ terminal, place })]);
      } catch {}
      await pause((ms, fn) => this.later(ms, fn), 300);
      if (done()) return true;
    }
    return false;
  }

  runJob(cx, spec) {
    if (!spec) return;
    setShared("arc-space.job", null);
    cx.spawn(async () => {
      if (spec.kind === "separate") {
        const rest = panes().filter((q) => q.tab === spec.tab && q.terminal).slice(1);
        for (const q of rest) {
          run("terminal.park", { terminal: q.terminal });
          await this.keepUntil(q.terminal, "tab", () => panes().some((p) => p.terminal === q.terminal && p.tab !== spec.tab));
        }
      } else if (spec.kind === "merge") {
        const target = lead(panes().filter((q) => q.tab === spec.into));
        const moving = panes().filter((q) => q.tab === spec.from && q.terminal);
        if (!target) return;
        run("tab.select", { id: spec.into });
        for (const q of moving) {
          run("pane.focus", { pane: target.pane });
          run("terminal.park", { terminal: q.terminal });
          await this.keepUntil(q.terminal, "right", () => panes().some((p) => p.terminal === q.terminal && p.tab === spec.into));
        }
        run("tab.select", { id: spec.into });
      }
    });
  }

  selectSpace(n) {
    const space = spaces()[n - 1];
    if (space && !space.active) run("space.select", { id: space.id });
  }

  carousel(space, cx) {
    // Safety net: if a transition's reset job is ever lost, the rows would sit
    // at opacity 0 (this.shift) or height 0 (this.entering) for good. Neither
    // may outlive a frame or two, whatever happens to the job queue.
    if (this.shift && Date.now() - (this.shiftAt ?? 0) > 250) this.shift = 0;
    if (this.entering.size && Date.now() - (this.enteringAt ?? 0) > 250) this.entering.clear();
    if (this.spaceId && this.spaceId !== space.id) {
      const ids = spaces().map((p) => p.id);
      const dir = ids.indexOf(space.id) > ids.indexOf(this.spaceId) ? 1 : -1;
      this.shift = dir * 28;
      this.shiftAt = Date.now();
      const at = ++this.turn;
      this.later(16, () => {
        if (this.turn === at) this.shift = 0;
      });
    }
    this.spaceId = space.id;
  }

  watchClosed() {
    const snap = snapshot();
    if (this.snap) recordClosed(this.snap, snap);
    this.snap = snap;
  }

  later(ms, fn) {
    this.jobs.push({ ms, fn });
    if (this.wake) this.wake();
  }

  track(space, cx) {
    const ids = space.tabs.map((c) => c.id);
    if (this.listSpace === space.id && this.listIds) {
      const added = ids.filter((id) => !this.listIds.includes(id));
      const gone = this.listIds.filter((id) => !ids.includes(id));
      if (added.length) {
        added.forEach((id) => this.entering.add(id));
        this.enteringAt = Date.now();
        this.later(16, () => added.forEach((id) => this.entering.delete(id)));
      }
      for (const id of gone) {
        const ghost = { id, at: this.listIds.indexOf(id), h: this.heights?.[id] ?? 38, closing: false, born: Date.now() };
        this.ghosts.push(ghost);
        this.later(16, () => (ghost.closing = true));
        this.later(FAST + 40, () => (this.ghosts = this.ghosts.filter((g) => g !== ghost)));
      }
    } else {
      this.ghosts = [];
    }
    this.listSpace = space.id;
    this.listIds = ids;
  }

  stagger(el, i, id, h) {
    const entering = this.entering.has(id);
    const delay = Math.min(i, 10) * STEP;
    return el
      .relative()
      .flex_none()
      .h(entering ? 0 : h)
      .left(this.shift)
      .opacity(entering || this.shift ? 0 : 1)
      .transition("height", { duration: FAST, easing: "ease-out" })
      .transition("left", { duration: FAST, delay, easing: "ease-out" })
      .transition("opacity", { duration: FAST, delay: entering ? 0 : delay, easing: "ease-out" });
  }

  list(t, all, space) {
    this.heights = {};
    const rows = space.tabs.map((c, i) => {
      const split = all.filter((q) => q.tab === c.id).length > 1;
      const h = split ? 42 : 38;
      this.heights[c.id] = h;
      return this.stagger(div().id(`tm-w-${c.id}`).overflow_hidden(), i + 1, c.id, h).child(this.tab(t, all, space, c, i));
    });
    this.ghosts = this.ghosts.filter((g) => Date.now() - g.born < FAST + 170);
    for (const g of [...this.ghosts].sort((a, b) => a.at - b.at)) {
      rows.splice(Math.min(g.at, rows.length), 0,
        div().id(`tm-g-${g.id}`).flex_none().h(g.closing ? 0 : g.h).transition("height", { duration: FAST, easing: "ease-out" }));
    }
    return rows;
  }

  selectTab(n) {
    const tabs = spaces().find((p) => p.active)?.tabs.filter((c) => !c.settled) ?? [];
    const tab = tabs[n - 1];
    if (tab) run("tab.select", { id: tab.id });
  }

  address(all, space) {
    const p = all.find((q) => q.focused && space.tabs.some((c) => c.active && c.id === q.tab));
    const path = folder(p?.cwd) || folder(space.folder);
    return row("tm-address")
      .flex_none()
      .h(42)
      .px(10)
      .bg(C.chip)
      .hover((s) => s.bg(C.hover))
      .on_click(launch)
      .on_mouse_down("right", () => spaceMenu(space.id))
      .child(
        div()
          .flex_none()
          .w(22)
          .h(22)
          .rounded_full()
          .bg(C.selected)
          .flex()
          .items_center()
          .justify_center()
          .text_size(11)
          .font_semibold()
          .text_color(C.text)
          .child(([...space.name][0] ?? "?").toUpperCase()),
      )
      .child(div().flex_none().max_w(110).truncate().font_semibold().text_color(C.text).child(space.name))
      .when(Boolean(path) && path !== space.name, (el) => el.child(div().flex_1().min_w(0).truncate().text_size(11).text_color(C.dim).child(path)));
  }

  spacesBar() {
    return h_flex()
      .flex_none()
      .h(40)
      .gap(2)
      .items_center()
      .child(this.tips.wrap("keys", iconButton("tm-keys", "command", openPalette), "Commands", "cmd-shift-p"))
      .child(div().flex_1())
      .children(
        spaces().map((p, i) =>
          this.tips.wrap(`s-${p.id}`, own(div())
            .id(`tm-s-${p.id}`)
            .flex_none()
            .w(26)
            .h(26)
            .rounded_full()
            .flex()
            .items_center()
            .justify_center()
            .text_size(11)
            .font_semibold()
            .cursor_pointer()
            .when(p.active, (el) => el.bg(C.selected).text_color(C.text))
            .when(!p.active, (el) => el.text_color(C.dim).hover((s) => s.bg(C.hover).text_color(C.text)))
            .on_click(() => run("space.select", { id: p.id }))
            .on_mouse_down("right", () => spaceMenu(p.id))
            .child(([...p.name][0] ?? "?").toUpperCase()), p.name, i < 9 ? `ctrl-${i + 1}` : null),
        ),
      )
      .child(div().flex_1())
      .child(this.tips.wrap("new-space", iconButton("tm-new-space", "plus", () => run("space.new")), "New space"));
  }

  applyTheme(th) {
    if (shared("layout") !== "arc-space" || !this.themeWake) return;
    const key = JSON.stringify(backgrounds(th));
    if (key === this.applied) return;
    this.applied = key;
    this.pending = th;
    this.themeWake();
  }

  async close() {
    this.picker?.close();
    if ((this.menu || this.view) && shared("arc-space.menu-open") === props()?.overlay) setShared("arc-space.menu-open", null);
  }

  render(cx) {
    if (this.picker) return this.picker.render();
    if (this.menu) return menuView();
    if (this.view === "tab-menu") return tabMenuView();
    if (this.view === "tab-pick") return tabPickView();
    const t = theme();
    const space = spaces().find((p) => p.active);
    if (!space) return div();
    const th = themeFor(space.id);
    const now = panes().find((q) => q.focused && space.tabs.some((c) => c.active && c.id === q.tab))?.pane;
    const recent = shared("arc-space.recent-panes") ?? [];
    if (now && recent[0] !== now) setShared("arc-space.recent-panes", [now, ...recent.filter((id) => id !== now)].slice(0, 50));
    Object.assign(C, palette(th));
    this.applyTheme(th);
    this.carousel(space, cx);
    this.track(space, cx);
    if (!checking()) this.watchClosed();
    const all = panes();
    const w = win() ?? {};
    const mac = w.platform === "macos" && w.titlebar === "none" && !w.fullscreen;

    const full = this.full();
    const fade = (el) => el;

    const top = fade(
      h_flex()
        .id("tm-top")
        .flex_none()
        .w(full)
        .h(34)
        .pr(10)
        .items_center()
        .when(mac, (el) => el.pl(68))
        .child(this.tips.wrap("toggle", iconButton("tm-toggle", "sidebar", (_e, cx) => this.toggle(cx)), "Toggle sidebar", "cmd-s"))
        .child(div().flex_1())
        .when(Boolean(w.buttons), (el) =>
          el.gap(6)
            .child(windowButton("tm-min", "win-min", "window.minimize"))
            .child(windowButton("tm-max", w.maximized ? "win-restore" : "win-max", "window.maximize"))
            .child(windowButton("tm-close", "win-close", "window.close")),
        ),
    );

    const body = v_flex()
      .id(`tm-body-${space.id}`)
      .absolute()
      .top(0)
      .bottom(0)
      .w(full)
      .pr(10)
      .gap(6)
      .right(0)
      .child(this.stagger(div().id(`tm-a-${space.id}`), 0, "address", 42).child(this.tips.wrap("address", this.address(all, space), "Search tabs and agents", "cmd-t", true)))
      .child(
        v_flex()
          .id("tm-list")
          .flex_1()
          .min_h(0)
          .pt(6)
          .gap(2)
          .overflow_y_scroll()
          .children(this.list(t, all, space))
          .child(div().flex_none().mx(10).my(6).h(1).bg(C.rule))
          .child(
            row("tm-new")
              .text_color(C.dim)
              .hover((s) => s.bg(C.hover).text_color(C.text))
              .on_click(() => run("tab.new", { space: space.id }))
              .child(svg("mods/arc-space/plus.svg").size(16))
              .child(div().child("New Tab")),
          ),
      );

    return v_flex()
      .id("tm-root")
      .size_full()
      .gap(6)
      .overflow_hidden()
      .on_modifiers_changed((e, cx) => this.modifiers(e, cx))
      .child(top)
      .child(div().id("tm-stage").on_mouse_down("right", () => spaceMenu(space.id)).relative().flex_1().min_h(0).w_full().overflow_hidden().child(body))
      .child(h_flex().id("tm-bottom").flex_none().w_full().justify_end().overflow_hidden().child(div().flex_none().w(full).pr(10).child(this.spacesBar())));
  }
}
