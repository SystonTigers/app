import { describe, it, expect } from "vitest";
import { publicName, publicPhoto, publicScorers, shortName } from "../publicNames";

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

  it("keeps full names and photos only when the club chooses", () => {
    expect(publicName({ fullNames: false }, "Ben Jones")).toBe("Ben J.");
    expect(publicName({ fullNames: true }, "Ben Jones")).toBe("Ben Jones");
    expect(publicPhoto({ fullNames: false }, "https://x/p.jpg")).toBeUndefined();
    expect(publicPhoto({ fullNames: true }, "https://x/p.jpg")).toBe("https://x/p.jpg");
    expect(publicScorers({ fullNames: false }, ["Alfie Smith 2", "Ben Jones"])).toEqual(["Alfie S. 2", "Ben J."]);
    expect(publicScorers({ fullNames: true }, ["Alfie Smith 2"])).toEqual(["Alfie Smith 2"]);
  });
});
