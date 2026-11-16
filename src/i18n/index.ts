import { createSignal } from "solid-js";
import * as i18n from "@solid-primitives/i18n";
import { de } from "./de";
import { en } from "./en";

// Flattened once: { "empty.title": "...", ... }
const dictionaries = {
  en: i18n.flatten(en),
  de: i18n.flatten(de),
};

export type Locale = keyof typeof dictionaries;

/** System language if we have it, otherwise English. */
function systemLocale(): Locale {
  const lang = navigator.language.slice(0, 2);
  return lang in dictionaries ? (lang as Locale) : "en";
}

const [locale, setLocaleSignal] = createSignal<Locale>(systemLocale());
document.documentElement.lang = locale();

/** Switches the language. Every `t(...)` in the UI updates on its own. */
export function setLocale(next: Locale) {
  setLocaleSignal(next);
  document.documentElement.lang = next;
}

export { locale };

/** `t("empty.title")` → text in the current language. Keys are type-checked. */
export const t = i18n.translator(() => dictionaries[locale()]);
