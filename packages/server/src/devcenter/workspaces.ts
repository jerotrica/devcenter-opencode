import { Effect } from "effect"
import { FileSystem } from "@opencode-ai/core/filesystem"
import { AbsolutePath } from "@opencode-ai/core/schema"
import path from "path"
import fs from "fs/promises"

export type DevcenterGroup = {
  slug: string
  name: string
  description?: string
  path: string
  created_at: number
  updated_at: number
}

export type DevcenterRepo = {
  slug: string
  name: string
  path: string
  git_url?: string
  branch?: string
  is_git_repo: boolean
  created_at: number
  updated_at: number
}

export type DevcenterError = {
  error: string
  message: string
}

const WORKSPACES_DIR = process.env.WORKSPACES_DIR ?? "/workspaces"

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64)
}

export function validateName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error("Name is required")
  }
  if (name.includes("/") || name.includes("..") || name === "." || name === "..") {
    throw new Error("Invalid name")
  }
}

export function safeWorkspacePath(root: string, slug: string): string {
  const resolved = path.resolve(root, slug)
  if (!resolved.startsWith(root)) {
    throw new Error("Path traversal detected")
  }
  return resolved
}

export async function listGroups(): Promise<DevcenterGroup[]> {
  const entries = await fs.readdir(WORKSPACES_DIR, { withFileTypes: true })
  const groups: DevcenterGroup[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith(".")) continue

    const groupPath = path.join(WORKSPACES_DIR, entry.name)
    const metaPath = path.join(groupPath, ".devcenter.json")

    try {
      const stat = await fs.stat(groupPath)
      const meta = await fs.readFile(metaPath, "utf-8").catch(() => null)
      const parsed = meta ? JSON.parse(meta) : {}

      groups.push({
        slug: entry.name,
        name: parsed.name || entry.name,
        description: parsed.description,
        path: groupPath,
        created_at: stat.birthtimeMs || stat.ctimeMs,
        updated_at: stat.mtimeMs,
      })
    } catch {
      // Skip invalid entries
    }
  }

  return groups.sort((a, b) => b.updated_at - a.updated_at)
}

export async function getGroup(slug: string): Promise<DevcenterGroup | null> {
  const groupPath = safeWorkspacePath(WORKSPACES_DIR, slug)
  const stat = await fs.stat(groupPath).catch(() => null)
  if (!stat || !stat.isDirectory()) return null

  const metaPath = path.join(groupPath, ".devcenter.json")
  const meta = await fs.readFile(metaPath, "utf-8").catch(() => null)
  const parsed = meta ? JSON.parse(meta) : {}

  return {
    slug,
    name: parsed.name || slug,
    description: parsed.description,
    path: groupPath,
    created_at: stat.birthtimeMs || stat.ctimeMs,
    updated_at: stat.mtimeMs,
  }
}

export async function createGroup(name: string, description?: string): Promise<DevcenterGroup> {
  validateName(name)
  const slug = toSlug(name)
  if (!slug) throw new Error("Invalid group name")

  const groupPath = safeWorkspacePath(WORKSPACES_DIR, slug)
  const existing = await fs.stat(groupPath).catch(() => null)
  if (existing && existing.isDirectory()) {
    throw new Error(`Group already exists: ${slug}`)
  }

  await fs.mkdir(groupPath, { recursive: true })

  const meta = { name, description }
  await fs.writeFile(path.join(groupPath, ".devcenter.json"), JSON.stringify(meta, null, 2))

  const stat = await fs.stat(groupPath)
  return {
    slug,
    name,
    description,
    path: groupPath,
    created_at: stat.birthtimeMs || stat.ctimeMs,
    updated_at: stat.mtimeMs,
  }
}

export async function listRepos(groupSlug: string): Promise<DevcenterRepo[]> {
  const group = await getGroup(groupSlug)
  if (!group) throw new Error("Group not found")

  const entries = await fs.readdir(group.path, { withFileTypes: true })
  const repos: DevcenterRepo[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith(".")) continue

    const repoPath = path.join(group.path, entry.name)
    const gitPath = path.join(repoPath, ".git")
    const isGitRepo = await fs.stat(gitPath).then(() => true).catch(() => false)

    try {
      const stat = await fs.stat(repoPath)
      repos.push({
        slug: entry.name,
        name: entry.name,
        path: repoPath,
        is_git_repo: isGitRepo,
        created_at: stat.birthtimeMs || stat.ctimeMs,
        updated_at: stat.mtimeMs,
      })
    } catch {
      // Skip invalid entries
    }
  }

  return repos.sort((a, b) => b.updated_at - a.updated_at)
}

export async function createRepo(groupSlug: string, name: string): Promise<DevcenterRepo> {
  const group = await getGroup(groupSlug)
  if (!group) throw new Error("Group not found")

  validateName(name)
  const slug = toSlug(name)
  if (!slug) throw new Error("Invalid repo name")

  const repoPath = safeWorkspacePath(group.path, slug)
  const existing = await fs.stat(repoPath).catch(() => null)
  if (existing && existing.isDirectory()) {
    throw new Error(`Repo already exists: ${slug}`)
  }

  await fs.mkdir(repoPath, { recursive: true })

  // Initialize git repo
  const { exec } = await import("child_process")
  await new Promise<void>((resolve, reject) => {
    exec("git init", { cwd: repoPath }, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })

  const stat = await fs.stat(repoPath)
  return {
    slug,
    name,
    path: repoPath,
    is_git_repo: true,
    created_at: stat.birthtimeMs || stat.ctimeMs,
    updated_at: stat.mtimeMs,
  }
}

export async function cloneRepo(groupSlug: string, name: string, gitUrl: string): Promise<DevcenterRepo> {
  const group = await getGroup(groupSlug)
  if (!group) throw new Error("Group not found")

  validateName(name)
  const slug = toSlug(name)
  if (!slug) throw new Error("Invalid repo name")

  // Validate git URL
  if (!gitUrl.match(/^(git@|ssh:\/\/|https:\/\/)/)) {
    throw new Error("Invalid git URL. Must start with git@, ssh://, or https://")
  }

  const repoPath = safeWorkspacePath(group.path, slug)

  // Clone
  const { exec } = await import("child_process")
  await new Promise<void>((resolve, reject) => {
    exec(`git clone ${gitUrl} ${repoPath}`, { cwd: group.path }, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })

  // Get branch
  let branch: string | undefined
  try {
    const { stdout } = await new Promise<{ stdout: string }>((resolve, reject) => {
      exec("git rev-parse --abbrev-ref HEAD", { cwd: repoPath }, (error, stdout) => {
        if (error) reject(error)
        else resolve({ stdout: stdout.trim() })
      })
    })
    branch = stdout
  } catch {
    // Ignore
  }

  const stat = await fs.stat(repoPath)
  return {
    slug,
    name,
    path: repoPath,
    git_url: gitUrl,
    branch,
    is_git_repo: true,
    created_at: stat.birthtimeMs || stat.ctimeMs,
    updated_at: stat.mtimeMs,
  }
}
