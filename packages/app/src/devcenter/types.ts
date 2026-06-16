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
