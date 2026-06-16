import type { DevcenterGroup, DevcenterRepo, DevcenterError } from "./types"

export class DevcenterApi {
  private baseUrl: string
  private authHeader: string

  constructor(baseUrl: string, username: string, password: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "")
    this.authHeader = `Basic ${btoa(`${username}:${password}`)}`
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: this.authHeader,
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

  async listGroups(): Promise<DevcenterGroup[]> {
    return this.request("/api/devcenter/groups")
  }

  async getGroup(slug: string): Promise<DevcenterGroup> {
    return this.request(`/api/devcenter/groups/${slug}`)
  }

  async createGroup(name: string, description?: string): Promise<DevcenterGroup> {
    return this.request("/api/devcenter/groups", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    })
  }

  async listRepos(groupSlug: string): Promise<DevcenterRepo[]> {
    return this.request(`/api/devcenter/groups/${groupSlug}/repos`)
  }

  async createRepo(groupSlug: string, name: string): Promise<DevcenterRepo> {
    return this.request(`/api/devcenter/groups/${groupSlug}/repos/create`, {
      method: "POST",
      body: JSON.stringify({ name }),
    })
  }

  async cloneRepo(groupSlug: string, name: string, gitUrl: string): Promise<DevcenterRepo> {
    return this.request(`/api/devcenter/groups/${groupSlug}/repos/clone`, {
      method: "POST",
      body: JSON.stringify({ name, git_url: gitUrl }),
    })
  }
}
