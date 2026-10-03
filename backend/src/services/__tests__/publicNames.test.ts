import { describe, it, expect } from "vitest";
import { initialLastName, nameKey, publicName, publicPhoto, publicScorers, shortName, type NameStyle, type PublicNamePolicy } from "../publicNames";

describe("public player names", () => {
  it("shortens to first name and surname initial", () => {
    expect(shortName("Alfie Smith")).toBe("Alfie S.");
    expect(shortName("Mary Jane Watson")).toBe("Mary W.");
    expect(shortName("Zoë O'Brien")).toBe("Zoë O.");
    expect(shortName("Alfie Smith 2")).toBe("Alfie S. 2");
    expect(shortName("Alfie Smith (pen)")).toBe("Alfie S. (pen)");
    expect(shortName("alfie smith pen")).toBe("alfie S. pen");
    expect(shortName("Smith")).toBe("Smith");
    expect(shortName("  ")).toBe("");
  });

  it("can show initial and surname instead", () => {
    expect(initialLastName("Sam Smith")).toBe("S. Smith");
    expect(initialLastName("Mary Jane Watson")).toBe("M. Watson");
    expect(initialLastName("Sam Smith 2")).toBe("S. Smith 2");
    expect(initialLastName("Smith")).toBe("Smith");
  });

  it("can show just the first name or just the surname", () => {
    const firstOnly = { style: "first" as const, photos: false };
    const lastOnly = { style: "last" as const, photos: false };
    expect(publicName(firstOnly, "Mary Jane Watson")).toBe("Mary");
    expect(publicName(lastOnly, "Mary Jane Watson")).toBe("Watson");
    expect(publicName(lastOnly, "Smith")).toBe("Smith");
    expect(publicScorers(firstOnly, ["Alfie Smith 2"])).toEqual(["Alfie 2"]);
    expect(publicScorers(lastOnly, ["Alfie Smith (pen)"])).toEqual(["Smith (pen)"]);
  });

  it("follows the club's choice of name style and photos", () => {
    const full = { style: "full" as const, photos: true };
    const first = { style: "first_initial" as const, photos: false };
    const last = { style: "initial_last" as const, photos: false };
    expect(publicName(full, "Ben Jones")).toBe("Ben Jones");
    expect(publicName(first, "Ben Jones")).toBe("Ben J.");
    expect(publicName(last, "Ben Jones")).toBe("B. Jones");
    expect(publicPhoto(first, "https://x/p.jpg")).toBeUndefined();
    expect(publicPhoto(full, "https://x/p.jpg")).toBe("https://x/p.jpg");
    expect(publicScorers(first, ["Alfie Smith 2", "Ben Jones"])).toEqual(["Alfie S. 2", "Ben J."]);
    expect(publicScorers(last, ["Alfie Smith 2"])).toEqual(["A. Smith 2"]);
    expect(publicScorers(full, ["Alfie Smith 2"])).toEqual(["Alfie Smith 2"]);
  });
});

describe("names staff split into first name and surname", () => {
  const names = new Map([
    [nameKey("Mary Jane Watson"), { first: "Mary Jane", last: "Watson" }],
    [nameKey("Virgil Van Dijk"), { first: "Virgil", last: "Van Dijk" }],
    [nameKey("Pele"), { first: "Pele", last: null }],
  ]);
  const policy = (style: NameStyle): PublicNamePolicy => ({ style, photos: false, names });

  it("uses the stored split for every style", () => {
    expect(publicName(policy("first_initial"), "Mary Jane Watson")).toBe("Mary Jane W.");
    expect(publicName(policy("initial_last"), "Virgil Van Dijk")).toBe("V. Van Dijk");
    expect(publicName(policy("last"), "Virgil Van Dijk")).toBe("Van Dijk");
    expect(publicName(policy("first"), "Mary Jane Watson")).toBe("Mary Jane");
    expect(publicName(policy("initial_last"), "Pele")).toBe("Pele");
  });

  it("keeps goal counts and notes after a known name, and ignores case and spacing", () => {
    expect(publicName(policy("initial_last"), "virgil  van dijk 2")).toBe("V. Van Dijk 2");
    expect(publicScorers(policy("first_initial"), ["Mary Jane Watson pen", "Sam Smith"])).toEqual(["Mary Jane W. pen", "Sam S."]);
  });

  it("falls back to first word and last word for names it doesn't know", () => {
    expect(publicName(policy("initial_last"), "Alfie James Smith")).toBe("A. Smith");
  });
});
