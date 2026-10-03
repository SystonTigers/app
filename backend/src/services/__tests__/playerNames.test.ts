import { describe, it, expect } from "vitest";
import { readPlayerName } from "../playerNames";

describe("player names", () => {
  it("takes first name and surname, tidying spaces", () => {
    expect(readPlayerName({ firstName: " Mary  Jane ", lastName: "Watson" })).toEqual({ first: "Mary Jane", last: "Watson", full: "Mary Jane Watson" });
    expect(readPlayerName({ first_name: "Virgil", last_name: "Van Dijk" })).toEqual({ first: "Virgil", last: "Van Dijk", full: "Virgil Van Dijk" });
    expect(readPlayerName({ firstName: "Pele", lastName: "" })).toEqual({ first: "Pele", last: null, full: "Pele" });
  });

  it("splits a single name field at the first space (older screens)", () => {
    expect(readPlayerName({ name: "Sam Smith" })).toEqual({ first: "Sam", last: "Smith", full: "Sam Smith" });
    expect(readPlayerName({ name: "Alfie James Smith", first_name: null, last_name: null })).toEqual({ first: "Alfie", last: "James Smith", full: "Alfie James Smith" });
  });

  it("leaves the name alone when none is sent, and explains problems", () => {
    expect(readPlayerName({ number: 9 })).toBeNull();
    expect(readPlayerName({ firstName: "", lastName: "Smith" })).toEqual({ error: "Enter the player's first name." });
    expect(readPlayerName({ name: "   " })).toEqual({ error: "Enter the player's first name." });
    expect(readPlayerName({ firstName: "x".repeat(41) })).toHaveProperty("error");
  });

});
