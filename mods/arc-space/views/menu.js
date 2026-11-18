// What arc-space opens over the sidebar: a tab's or a space's context menu,
// and the small picker that splits a tab with another one. Each takes the
// palette it was opened with, so a menu matches the space it belongs to.
import { div } from "gpui-kit";
import { v_flex } from "gpui-base";
import { spaces, panes, theme, run, openOverlay, props, closeOverlay, shared, setShared } from "herdr";
import { palette, themeFor } from "../theme.js";
import { lead, label as tabLabel, tile } from "./rows.js";
import { JOB } from "../lib/state.js";

function job(spec) {
  setShared(JOB, spec);
  run("arc-space.job");
}

function menuPanel(items, C) {
  return v_flex().id("ctx-menu").w_full().p(6).gap(1).rounded(12).border_1().border_color(C.edge).bg(C.panel).shadow_lg().children(items);
}

function menuItem(overlay, id, label, action, danger, C) {
  return div()
    .id(`mn-${id}`)
    .h(34)
    .px(12)
    .flex()
    .items_center()
    .rounded(8)
    .cursor_pointer()
    .text_size(13.5)
    .text_color(danger ? "#ff8a80" : C.text)
    .hover((s) => s.bg(C.hover).text_color(C.text))
    .on_click(() => {
      closeOverlay(overlay);
      action();
    })
    .child(label);
}

function rule(C) {
  return div().h(1).mx(8).my(4).bg(C.edge);
}

export function tabMenu(tab, space, pane) {
  const split = panes().filter((q) => q.tab === tab).length > 1;
  const rows = split ? (pane ? 3 : 2) : 3;
  openOverlay({ mod: "arc-space", kind: "popup", width: 230, height: 22 + rows * 35 + 9, frame: "none", props: { view: "tab-menu", tab, space, pane, split } });
}

export function tabMenuView() {
  const { tab, space, pane, split, overlay } = props();
  const C = palette(themeFor(space));
  const items = split
    ? [menuItem(overlay, "separate", "Separate All Tabs", () => job({ kind: "separate", tab }), false, C)]
    : [
        menuItem(overlay, "add-split", "Add Split Terminal\u2026", () =>
          openOverlay({ mod: "arc-space", kind: "popup", width: 280, height: 360, frame: "none", props: { view: "tab-pick", tab, space } }), false, C,
        ),
        menuItem(overlay, "rename", "Rename Tab\u2026", () => run("tab.rename", { id: tab }), false, C),
      ];
  items.push(rule(C));
  if (split && pane) items.push(menuItem(overlay, "close-pane", "Close Pane", () => run("pane.close", { pane }), true, C));
  items.push(menuItem(overlay, "close-tab", "Close Tab", () => closeTab(tab, space), true, C));
  return menuPanel(items, C);
}

export function tabPickView() {
  const { tab, space, overlay } = props();
  const t = theme();
  const C = palette(themeFor(space));
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
      .text_color(C.text)
      .hover((s) => s.bg(C.hover).text_color(C.text))
      .on_click(() => {
        closeOverlay(overlay);
        job({ kind: "merge", into: tab, from: c.id });
      })
      .child(tile(t, p, C))
      .child(div().flex_1().min_w(0).truncate().child(tabLabel(c, p)))
      .when(mine.length > 1, (el) => el.child(div().text_size(11.5).text_color(C.dim).child(`${mine.length} panes`)));
  });
  return menuPanel([
    div().px(12).pt(6).pb(4).text_size(11).font_semibold().text_color(C.dim).child("SPLIT WITH"),
    ...(rows.length ? rows : [div().px(12).py(8).text_size(13).text_color(C.dim).child("No other tabs in this space")]),
  ], C);
}

export function spaceMenu(spaceId) {
  openOverlay({ mod: "arc-space", kind: "popup", width: 230, height: 172, frame: "none", props: { view: "menu", space: spaceId } });
}

export function menuView() {
  const { space, overlay } = props();
  const C = palette(themeFor(space));
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
      .text_color(danger ? "#ff8a80" : C.text)
      .hover((s) => s.bg(C.hover).text_color(C.text))
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
    .border_color(C.edge)
    .bg(C.panel)
    .shadow_lg()
    .child(item("theme", "Edit Theme Color\u2026", () => editTheme(space)))
    .child(item("rename", "Rename Space\u2026", () => run("space.rename", { id: space })))
    .child(item("tab", "New Tab", () => run("tab.new", { space })))
    .child(div().h(1).mx(8).my(4).bg(C.edge))
    .child(item("close", "Close Space", () => confirmCloseSpace(space), true));
}

function confirm(title, detail, ok, command) {
  openOverlay({ mod: "arc-space-confirm", kind: "dialog", frame: "none", width: 400, height: 170, props: { title, detail, confirm: ok, command } });
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

export function closeTab(tabId, spaceId) {
  const s = spaces().find((p) => p.id === spaceId);
  if (s && s.tabs.length <= 1) confirmCloseSpace(spaceId);
  else run("tab.close", { id: tabId, confirmed: true });
}

export function editTheme(spaceId) {
  openOverlay({ mod: "arc-space", kind: "popup", width: 376, height: 600, frame: "none", props: { view: "theme", space: spaceId } });
}
