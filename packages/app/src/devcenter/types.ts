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

export type DevcenterRecentSession = {
  server: string
  directory: string
  sessionId: string
  at: number
}

export type DevcenterState = {
  lastGroupSlug?: string
  lastWorkspacePath?: string
  lastRepoPath?: string
  recentSessions: DevcenterRecentSession[]
}
