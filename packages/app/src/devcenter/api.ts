import type { DevcenterGroup, DevcenterRepo, DevcenterError } from "./types"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      ...options?.headers,
      "Content-Type": "application/json",
    },
  })

  if (!res.ok) {
    const error: DevcenterError = await res.json().catch(() => ({
      error: "Unknown",
      message: `HTTP ${res.status}`,
    }))
    throw new Error(error.message || `HTTP ${res.status}`)
  }

  return res.json()
}

export async function listGroups(): Promise<DevcenterGroup[]> {
  return request("/api/devcenter/groups")
}

export async function getGroup(slug: string): Promise<DevcenterGroup> {
  return request(`/api/devcenter/groups/${slug}`)
}

export async function createGroup(name: string, description?: string): Promise<DevcenterGroup> {
  return request("/api/devcenter/groups", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  })
}

export async function listRepos(groupSlug: string): Promise<DevcenterRepo[]> {
  return request(`/api/devcenter/groups/${groupSlug}/repos`)
}

export async function createRepo(groupSlug: string, name: string): Promise<DevcenterRepo> {
  return request(`/api/devcenter/groups/${groupSlug}/repos/create`, {
    method: "POST",
    body: JSON.stringify({ name }),
  })
}

export async function cloneRepo(groupSlug: string, name: string, gitUrl: string): Promise<DevcenterRepo> {
  return request(`/api/devcenter/groups/${groupSlug}/repos/clone`, {
    method: "POST",
    body: JSON.stringify({ name, git_url: gitUrl }),
  })
}
