/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Color from "color";
import { describe, expect, it } from "vitest";
import { builtInThemes, defaultTheme } from "../../../features/theme/files/common/builtin-theme";
import { getAvailableVariants, resolveThemeVariant } from "../../../features/theme/files/common/resolve";
import { getContrastRatio } from "../../themes/accent-colors";

import type { ColorInstance } from "color";

import type { LensTheme } from "../../themes/lens-theme";

// The text of the overview cards has to reach WCAG AA on the card in every built-in theme and
// variant, and on the hover background of a card that is a button, with the custom properties the
// hover sets. The test reads every `color` of the stylesheets of the cards, so a new text color is
// checked as soon as it is written, and resolves it against the colors of each theme.

const componentsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Each stylesheet with the class of its badge, the warning or error label drawn on a tint of its
// color, if it has one, and whether the card can be a button with a hover. The panel and the
// background of the hover are the ones of `.Card`; a card may add custom properties of its own to the
// hover. The status chart has no panel of its own, and the overviews draw it on a panel in
// contentColor.
//
// `below` lists the text colors known to miss AA, each with the themes it misses it in: the title of
// a status chart that is a button is a link in the color of the info statuses, as the rings of the
// workloads overview have always drawn it. The list may only shrink: an entry that reaches AA fails
// the test until it is removed.
const stylesheets: {
  file: string;
  badge?: string;
  hasHover: boolean;
  below?: Record<string, readonly string[]>;
}[] = [
  { file: "overview-cards/capacity-card.scss", badge: "CapacityCard-overcommit", hasHover: false },
  { file: "overview-cards/status-card.scss", badge: "StatusCard-failing", hasHover: true },
  {
    file: "overview-cards/status-chart.scss",
    hasHover: false,
    below: { "var(--colorInfo)": ["ayu light", "ayu-mirage light"] },
  },
];

// The cards, and the panels of the charts, are drawn in contentColor.
const cardBackground = "var(--contentColor)";
const cardStylesheet = "card/card.scss";
const minimumContrast = 4.5;

const readStylesheet = (file: string) => readFileSync(path.join(componentsDirectory, file), "utf8");

const getCustomProperties = (source: string) =>
  new Map(Array.from(source.matchAll(/(--[\w-]+):\s*([^;]+);/g), ([, name, value]) => [name, value.trim()]));

// The declarations of the first `:hover` block, up to the first rule nested in it.
const getHoverDeclarations = (source: string) => /:hover\s*\{([^{}]*)/.exec(source)?.[1];

const getDeclaration = (body: string, property: string) =>
  new RegExp(`(?<![\\w-])${property}:\\s*([^;]+);`).exec(body)?.[1].trim();

const getRule = (source: string, className: string) => {
  const body = new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? "";

  return { color: getDeclaration(body, "color"), background: getDeclaration(body, "background") };
};

const getTextColors = (source: string) =>
  new Set(
    Array.from(source.matchAll(/(?<![\w-])color:\s*([^;]+);/g), ([, value]) => value.trim()).filter(
      (value) => value !== "inherit",
    ),
  );

/**
 * Resolves the subset of CSS the stylesheets use for colors, `var()` and `color-mix(in srgb, …)`,
 * to an RGBA color, composited over `background` when given.
 */
const resolveColor = (
  value: string,
  theme: LensTheme,
  customProperties: Map<string, string>,
  background?: ColorInstance,
): ColorInstance => {
  const resolve = (expression: string): ColorInstance => {
    const trimmed = expression.trim();
    const variable = /^var\((--[\w-]+)\)$/.exec(trimmed);

    if (variable) {
      const name = variable[1];
      const local = customProperties.get(name);

      if (local !== undefined) {
        return resolve(local);
      }

      const themeColor = theme.colors[name.slice(2) as keyof LensTheme["colors"]];

      if (themeColor === undefined) {
        throw new Error(`Unknown color ${name}`);
      }

      return Color(themeColor);
    }

    const mix = /^color-mix\(in srgb,\s*(.+?)\s+(\d+(?:\.\d+)?)%,\s*(.+)\)$/.exec(trimmed);

    if (mix) {
      const [, first, percent, second] = mix;
      const weight = Number(percent) / 100;
      const firstColor = resolve(first);
      const secondColor = resolve(second);

      // color-mix() in srgb interpolates premultiplied channels and the alpha.
      const alpha = firstColor.alpha() * weight + secondColor.alpha() * (1 - weight);
      const channel = (index: number) => {
        if (alpha === 0) {
          return 0;
        }

        const premultiplied =
          firstColor.rgb().array()[index] * firstColor.alpha() * weight +
          secondColor.rgb().array()[index] * secondColor.alpha() * (1 - weight);

        return premultiplied / alpha;
      };

      return Color.rgb(channel(0), channel(1), channel(2)).alpha(alpha);
    }

    if (trimmed === "transparent") {
      return Color.rgb(0, 0, 0).alpha(0);
    }

    throw new Error(`Cannot resolve the color ${trimmed}`);
  };

  const color = resolve(value);

  if (!background || color.alpha() === 1) {
    return color;
  }

  return background.mix(color.alpha(1), color.alpha());
};

const themeVariants = builtInThemes.flatMap(({ theme }) =>
  getAvailableVariants(theme).map((variant) => ({
    name: `${theme.metadata.name} ${variant}`,
    theme: resolveThemeVariant(theme, variant, defaultTheme),
  })),
);

const cardHoverBackground = getDeclaration(getHoverDeclarations(readStylesheet(cardStylesheet)) ?? "", "background");

describe("contrast of the text of the overview cards", () => {
  it("shows the hover of a card that is a button with a background", () => {
    expect(cardHoverBackground).toEqual(expect.stringContaining("var(--contentColor)"));
  });

  describe.each(stylesheets)("$file", ({ file, badge, hasHover, below = {} }) => {
    const source = readStylesheet(file);
    const hoverDeclarations = getHoverDeclarations(source);
    // The custom properties of the card at rest, without the ones the hover sets.
    const customProperties = getCustomProperties(
      hoverDeclarations === undefined ? source : source.replace(hoverDeclarations, ""),
    );
    const textColors = [...getTextColors(source)];
    const badgeRule = badge === undefined ? undefined : getRule(source, badge);
    // The backgrounds the text is drawn on, each with the custom properties in effect on it.
    const backgrounds = [
      { name: "card", background: cardBackground, properties: customProperties },
      ...(hoverDeclarations === undefined
        ? []
        : [
            {
              name: "hover background",
              background: cardHoverBackground ?? "",
              properties: new Map([...customProperties, ...getCustomProperties(hoverDeclarations)]),
            },
          ]),
    ];

    it(badge === undefined ? "has text colors to check" : "has text colors and a badge to check", () => {
      expect(textColors.length).toBeGreaterThan(0);

      if (badgeRule) {
        expect(badgeRule.color).toBeDefined();
        expect(badgeRule.background).toBeDefined();
      }
    });

    it(hasHover ? "sets the colors of its text on the hover" : "has no hover", () => {
      expect(hoverDeclarations !== undefined).toBe(hasHover);
    });

    describe.each(backgrounds)("on the $name", ({ background, properties }) => {
      const contrastOn = (theme: LensTheme, textColor: string, behind: ColorInstance) => {
        const foreground = resolveColor(textColor, theme, properties, behind);

        return getContrastRatio(foreground.hex(), behind.hex()) ?? 0;
      };

      it.each(themeVariants)("reaches WCAG AA in $name", ({ name, theme }) => {
        const card = resolveColor(background, theme, properties);
        const results = textColors.map((textColor) => ({
          textColor,
          ratio: contrastOn(theme, textColor, card),
          known: below[textColor]?.includes(name) ?? false,
        }));
        const failures = results
          .filter(({ ratio, known }) => ratio < minimumContrast && !known)
          .map(({ textColor, ratio }) => `${textColor}: ${ratio.toFixed(2)}`);
        const reached = results
          .filter(({ ratio, known }) => ratio >= minimumContrast && known)
          .map(({ textColor, ratio }) => `${textColor}: ${ratio.toFixed(2)}`);

        expect(failures).toEqual([]);
        expect(reached, "a known miss that reaches AA is to be removed from the list").toEqual([]);
      });

      it.runIf(badgeRule).each(themeVariants)("reaches WCAG AA on the badge in $name", ({ theme }) => {
        const card = resolveColor(background, theme, properties);
        const badgeBackground = resolveColor(badgeRule?.background ?? "", theme, properties, card);

        expect(contrastOn(theme, badgeRule?.color ?? "", badgeBackground)).toBeGreaterThanOrEqual(minimumContrast);
      });
    });
  });
});
