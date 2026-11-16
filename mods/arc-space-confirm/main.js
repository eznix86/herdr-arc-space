import { View, div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { run, props, closeOverlay } from "herdr";

const C = { panel: "#2a2b2f", edge: "#3a3b40", text: "#ecedef", dim: "#8e9097", chip: "#ffffff14", danger: "#e5534b", dangerHover: "#f0675f" };

export default class Confirm extends View {
  init(_props, cx) {
    this.handle = cx.focus_handle();
    this.handle.focus();
  }

  yes() {
    const p = props();
    closeOverlay(p.overlay);
    run(p.command.name, p.command.args ?? {});
  }

  render() {
    const p = props() ?? {};
    const button = (id, label, bg, hover, fg, onClick) =>
      h_flex()
        .id(id)
        .h(34)
        .px(16)
        .items_center()
        .rounded(9)
        .bg(bg)
        .text_size(13.5)
        .font_semibold()
        .text_color(fg)
        .cursor_pointer()
        .hover((s) => s.bg(hover))
        .on_click(onClick)
        .child(label);
    return v_flex()
      .id("confirm")
      .track_focus(this.handle)
      .on_key_down((e, cx) => {
        if (e.key === "enter") this.yes();
        else if (e.key === "escape") closeOverlay(props().overlay);
        else return;
        cx.stop_propagation();
      })
      .size_full()
      .min_h(0)
      .p(20)
      .gap(10)
      .rounded(16)
      .border_1()
      .border_color(C.edge)
      .bg(C.panel)
      .shadow_lg()
      .child(div().text_size(17).font_semibold().text_color(C.text).child(p.title ?? "Are you sure?"))
      .child(div().flex_1().min_h(0).text_size(13.5).text_color(C.dim).child(p.detail ?? ""))
      .child(
        h_flex()
          .justify_end()
          .gap(8)
          .child(button("no", "Cancel", C.chip, "#ffffff22", C.text, () => closeOverlay(props().overlay)))
          .child(button("yes", p.confirm ?? "Close", C.danger, C.dangerHover, "#ffffff", () => this.yes())),
      );
  }
}
