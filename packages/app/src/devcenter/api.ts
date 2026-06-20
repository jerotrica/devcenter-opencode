import type { DevcenterGroup, DevcenterRepo, DevcenterState, DevcenterError } from "./types"

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

  if (res.status === 204) {
    return undefined as T
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

export async function deleteGroup(slug: string): Promise<void> {
  await request(`/api/devcenter/groups/${slug}`, { method: "DELETE" })
}

export async function deleteRepo(groupSlug: string, repoSlug: string): Promise<void> {
  await request(`/api/devcenter/groups/${groupSlug}/repos/${repoSlug}`, { method: "DELETE" })
}

export async function getState(): Promise<DevcenterState> {
  return request("/api/devcenter/state")
}

export async function updateState(patch: Partial<DevcenterState>): Promise<DevcenterState> {
  return request("/api/devcenter/state", {
    method: "POST",
    body: JSON.stringify(patch),
  })
}
