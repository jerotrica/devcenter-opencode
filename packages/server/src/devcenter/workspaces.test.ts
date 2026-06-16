import { describe, expect, it } from "bun:test"
import { toSlug, validateName, safeWorkspacePath } from "./workspaces"

describe("toSlug", () => {
  it("converts to lowercase", () => {
    expect(toSlug("Pixa Backend")).toBe("pixa-backend")
  })

  it("replaces spaces with hyphens", () => {
    expect(toSlug("my project")).toBe("my-project")
  })

  it("removes special characters", () => {
    expect(toSlug("project@#$%")).toBe("project")
  })

  it("collapses multiple hyphens", () => {
    expect(toSlug("my---project")).toBe("my-project")
  })

  it("trims leading and trailing hyphens", () => {
    expect(toSlug("-project-")).toBe("project")
  })

  it("truncates to 64 characters", () => {
    const long = "a".repeat(100)
    expect(toSlug(long).length).toBe(64)
  })
})

describe("validateName", () => {
  it("accepts valid names", () => {
    expect(() => validateName("my-project")).not.toThrow()
    expect(() => validateName("Project 123")).not.toThrow()
  })

  it("rejects empty names", () => {
    expect(() => validateName("")).toThrow("Name is required")
    expect(() => validateName("   ")).toThrow("Name is required")
  })

  it("rejects path traversal", () => {
    expect(() => validateName("../etc")).toThrow("Invalid name")
    expect(() => validateName("..")).toThrow("Invalid name")
    expect(() => validateName(".")).toThrow("Invalid name")
    expect(() => validateName("foo/bar")).toThrow("Invalid name")
  })
})

describe("safeWorkspacePath", () => {
  it("resolves paths within root", () => {
    const result = safeWorkspacePath("/workspaces", "pixa")
    expect(result).toBe("/workspaces/pixa")
  })

  it("throws on path traversal", () => {
    expect(() => safeWorkspacePath("/workspaces", "../etc")).toThrow("Path traversal detected")
    expect(() => safeWorkspacePath("/workspaces", "../../root")).toThrow("Path traversal detected")
  })
})
