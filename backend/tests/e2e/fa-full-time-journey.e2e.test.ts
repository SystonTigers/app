/**
 * Journey: a club admin pastes the FA Full-Time code snippets into settings;
 * the club's public pages get the codes to show the FA's table, fixtures and
 * results. Members can't change them.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

const snippet = (code: string) => `<div id="lrep${code}" style="width: 350px;">Data loading....</div>
<script language="javascript" type="text/javascript">
var lrcode = '${code}'
</script>
<script language="Javascript" type="text/javascript" src="https://fulltime.thefa.com/client/api/cs1.js"></script>`;

describe("FA Full-Time snippets", () => {
  it("saves pasted snippets and serves the codes on the club's public pages", async () => {
    const admin = await registerAdmin("fa-admin");
    const member = await registerMember("fa-member");

    expect((await call("/api/v1/club/fa-full-time", { method: "PUT", body: { table: "995652226" } })).status).toBe(401);
    expect((await call("/api/v1/club/fa-full-time", { method: "PUT", token: member.token, body: { table: "995652226" } })).status).toBe(403);

    const bad = await call("/api/v1/club/fa-full-time", { method: "PUT", token: admin.token, body: { table: "https://fulltime.thefa.com/table.html" } });
    expect(bad.status).toBe(400);
    expect(bad.data.error.field).toBe("table");

    const saved = await call("/api/v1/club/fa-full-time", {
      method: "PUT", token: admin.token,
      body: { table: snippet("995652226"), results: snippet("464806132"), fixtures: "728979873", team: snippet("238564734") },
    });
    expect(saved.status).toBe(200);
    expect(saved.data.data).toEqual({ table: "995652226", results: "464806132", fixtures: "728979873", team: "238564734" });

    // The FA's fixture lists show times and grounds: signed out, only the table and results
    const pub = await call("/public/syston/fa-full-time");
    expect(pub.data.data).toEqual({ table: "995652226", results: "464806132" });
    const signedIn = await call("/public/syston/fa-full-time", { token: admin.token });
    expect(signedIn.data.data).toEqual({ table: "995652226", results: "464806132", fixtures: "728979873", team: "238564734" });

    // Clearing one box removes just that one
    await call("/api/v1/club/fa-full-time", { method: "PUT", token: admin.token, body: { team: "" } });
    const after = await call("/api/v1/club/fa-full-time", { token: admin.token });
    expect(after.data.data).toEqual({ table: "995652226", results: "464806132", fixtures: "728979873" });

    await call("/api/v1/club/fa-full-time", { method: "PUT", token: admin.token, body: { table: "", results: "", fixtures: "" } });
    expect((await call("/public/syston/fa-full-time")).data.data).toEqual({});
  });
});
