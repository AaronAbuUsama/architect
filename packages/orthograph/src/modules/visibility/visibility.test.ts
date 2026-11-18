import { describe, expect, it } from "vitest";
import { Roles } from "#modules/roles/service.js";
import { Things } from "#modules/things/service.js";
import { Values } from "#modules/values/service.js";
import { Visibilities } from "./service.ts";

const { visibility } = Visibilities;

describe("visibility", () => {
  it("is public unless a blueprint says otherwise", () => {
    expect(Values.text().visibility).toBe("public");
    expect(Values.id("alw").visibility).toBe("public");
    const t = Things.thing({ description: "x", fields: { id: Values.id("x"), name: Values.text() } });
    expect(t.fields.name.visibility).toBe("public");
  });

  it("marks a value secret, as a copy that is still the same value", () => {
    const plain = Values.text({ max: 128 });
    const password = visibility.secret(plain);
    expect(password.visibility).toBe("secret");
    expect(password.kind).toBe("value");
    expect(password.schema).toBe(plain.schema);
    expect(plain.visibility).toBe("public");
    // A thing's field made of it, and a field taken from that field, are secret too.
    const t = Things.thing({ description: "x", fields: { id: Values.id("x"), pin: password } });
    expect(t.fields.pin.visibility).toBe("secret");
    const u = Things.thing({ description: "y", fields: { id: Values.id("y"), pin: t.fields.pin } });
    expect(u.fields.pin.visibility).toBe("secret");
  });

  it("marks one field secret without touching the thing's own", () => {
    const t = Things.thing({ description: "x", fields: { id: Values.id("ses") } });
    const issued = visibility.secret(t.fields.id);
    expect(issued.visibility).toBe("secret");
    expect(issued.kind).toBe("field");
    expect(issued.of).toBe(t);
    expect(issued.key).toBe("id");
    expect(t.fields.id.visibility).toBe("public");
  });

  it("is private to a list of roles", () => {
    const t = Things.thing({ description: "x", fields: { id: Values.id("x") } });
    const admin = Roles.role(t, { rule: () => true });
    const balance = visibility.private(Values.uint(128), admin);
    expect(balance.visibility).toEqual({ kind: "private", to: [admin] });
    expect(visibility.public(balance).visibility).toBe("public");
  });
});
