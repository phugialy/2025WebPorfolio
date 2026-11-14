import { describe, expect, it } from "vitest";
import { findNearDuplicate, isNearDuplicate, nameTokens } from "./product-names";

const SONICARE_WHITE = "Philips Sonicare 5900 Rechargeable Electric Toothbrush, 2 Brush Head, White";
const SONICARE_BLACK = "Philips Sonicare 5900 Rechargeable Electric Toothbrush, 2 Brush Head, Black";
const SONICARE_PINK = "Philips Sonicare 5900 Rechargeable Electric Toothbrush, 2 Brush Heads, Pink";

describe("telling colour variants of one product from different products", () => {
  it("the three Sonicare listings that reached the Deals pages are one product", () => {
    expect(isNearDuplicate(SONICARE_WHITE, SONICARE_BLACK)).toBe(true);
    expect(isNearDuplicate(SONICARE_WHITE, SONICARE_PINK)).toBe(true);
    expect(isNearDuplicate(SONICARE_BLACK, SONICARE_PINK)).toBe(true);
  });

  it("keeps different models of one brand apart", () => {
    expect(isNearDuplicate("eufy C28 Robot Vacuum Cleaner and Mop for pet hair, 15,000 Pa", "eufy C20 Robot Vacuum Cleaner and Mop for pet hair, 15,000 Pa")).toBe(false);
    expect(isNearDuplicate("Oral-B iO9 Rechargeable Electric Toothbrush", "Oral-B iO7 Rechargeable Electric Toothbrush")).toBe(false);
    expect(isNearDuplicate(SONICARE_WHITE, "Philips Sonicare 4100 Rechargeable Electric Toothbrush, 1 Brush Head, White")).toBe(false);
  });

  it("keeps different brands apart, even for the same kind of product", () => {
    expect(isNearDuplicate("Samsonite Ascella 4 Carry-On Luggage - Cerulean Blue", "LEVEL8 Hard Shell 20 Inch Carry on Luggage Airline Approved")).toBe(false);
    expect(isNearDuplicate(SONICARE_WHITE, "Oral-B Rechargeable Electric Toothbrush, iO9 Limited Ultimate Clean")).toBe(false);
  });

  it("keeps two different products of one brand apart when no model number tells them", () => {
    expect(isNearDuplicate("De'Longhi Magnifica Duo Automatic Espresso Machine, Milk Frother, Silver", "De'Longhi Dedica Slim Pump Espresso Machine")).toBe(false);
  });

  it("is not fooled by a small count, casing or punctuation", () => {
    expect(isNearDuplicate("Anker USB-C Cable (2-Pack) 60W", "ANKER usb c cable 2 pack 60w - Black")).toBe(true);
    expect(isNearDuplicate("Brand Alpha Widget 2 Pack", "Brand Beta Gadget 2 Pack")).toBe(false);
  });

  it("never calls a name that is too short to judge a duplicate", () => {
    expect(isNearDuplicate("Anker", "Anker")).toBe(false);
    expect(isNearDuplicate("", "")).toBe(false);
  });

  it("strips colours, filler and plurals from the identifying words", () => {
    expect(nameTokens("The Black Brush Heads, 2 Pack")).toEqual(["brush", "head", "2"]);
  });

  it("finds the duplicated name in a list", () => {
    expect(findNearDuplicate(SONICARE_PINK, ["Something Else Entirely", SONICARE_WHITE])).toBe(SONICARE_WHITE);
    expect(findNearDuplicate(SONICARE_PINK, ["Something Else Entirely"])).toBeUndefined();
    expect(findNearDuplicate(SONICARE_PINK, [])).toBeUndefined();
  });
});
