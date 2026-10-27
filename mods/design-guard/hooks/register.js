import { DESIGN_RULES_TEXT, shouldDropPrompt, appendContext } from "./policy.js";

export function register(on, options) {
  on("prompt.submit", async ($, e, next) => {
    if (shouldDropPrompt(e.text)) {
      return { drop: "Prompt dropped: it asks to ignore or bypass security rules." };
    }
    return next({ ...e, context: appendContext(e.context, DESIGN_RULES_TEXT) });
  }).catch(async ($, e, next) => {
    if (!next.called) {
      return { drop: "Design guard unavailable: refusing this prompt." };
    }
    return next(e);
  });

  on("command.run", { command: "design-rules" }, async ($, e, next) => {
    return { text: DESIGN_RULES_TEXT };
  }).catch(async ($, e, next) => {
    return { text: "Design rules unavailable." };
  });
}
