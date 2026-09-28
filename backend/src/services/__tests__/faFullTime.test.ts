import { describe, it, expect } from "vitest";
import { applySnippetUpdate, parseStoredSnippets, snippetCode } from "../faFullTime";

const PASTED = `<div id="lrep995652226" style="width: 350px;">Data loading....<a href="https://fulltime.thefa.com/index.html?divisionseason=259710776">click here</a></div>
<script language="javascript" type="text/javascript">
var lrcode = '995652226'
</script>
<script language="Javascript" type="text/javascript" src="https://fulltime.thefa.com/client/api/cs1.js"></script>`;

describe("FA Full-Time snippets", () => {
  it("finds the code in a pasted snippet or a bare number", () => {
    expect(snippetCode(PASTED)).toBe("995652226");
    expect(snippetCode(" 464806132 ")).toBe("464806132");
    expect(snippetCode('<div id="lrep287857454">')).toBe("287857454");
    expect(snippetCode("https://fulltime.thefa.com/index.html?league=8977038")).toBeNull();
    expect(snippetCode("<script>alert(1)</script>")).toBeNull();
    expect(snippetCode(42)).toBeNull();
  });

  it("updates only the kinds sent, and removes empty ones", () => {
    const current = { table: "995652226", results: "464806132" };
    const update = applySnippetUpdate(current, { fixtures: PASTED.replace(/995652226/g, "728979873"), results: "" });
    expect(update).toEqual({ snippets: { table: "995652226", fixtures: "728979873" } });
  });

  it("rejects something that isn't a snippet and says which box", () => {
    const update = applySnippetUpdate({}, { team: "not a snippet" });
    expect(update).toMatchObject({ error: { field: "team" } });
  });

  it("ignores bad stored data", () => {
    expect(parseStoredSnippets('{"table":"995652226","team":"<script>","other":"1234567"}')).toEqual({ table: "995652226" });
    expect(parseStoredSnippets("not json")).toEqual({});
    expect(parseStoredSnippets(null)).toEqual({});
  });
});
