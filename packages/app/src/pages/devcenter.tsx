import { createSignal, createResource, For, Show, type Component } from "solid-js"
import { useNavigate } from "@solidjs/router"
import { base64Encode } from "@opencode-ai/core/util/encode"
import { useServer } from "@/context/server"
import { DevcenterApi } from "@/devcenter/api"
import type { DevcenterGroup, DevcenterRepo } from "@/devcenter/types"
import { Button } from "@opencode-ai/ui/button"

function useDevcenterApi(): DevcenterApi | null {
  const server = useServer()
  const conn = server.current
  if (!conn) return null
  if (!conn.http.password) return null
  return new DevcenterApi(conn.http.url, conn.http.username ?? "opencode", conn.http.password)
}

const Devcenter: Component = () => {
  const api = useDevcenterApi()
  const navigate = useNavigate()
  const [groups, { refetch: refetchGroups }] = createResource(
    () => api,
    async (a) => (a ? a.listGroups() : []),
  )
  const [selectedSlug, setSelectedSlug] = createSignal<string | null>(null)
  const [repos, { refetch: refetchRepos }] = createResource(
    () => ({ api: api, slug: selectedSlug() }),
    async ({ api: a, slug }) => (a && slug ? a.listRepos(slug) : []),
  )

  const [showCreateGroup, setShowCreateGroup] = createSignal(false)
  const [newGroupName, setNewGroupName] = createSignal("")
  const [newGroupDesc, setNewGroupDesc] = createSignal("")

  const [showCreateRepo, setShowCreateRepo] = createSignal(false)
  const [showCloneRepo, setShowCloneRepo] = createSignal(false)
  const [newRepoName, setNewRepoName] = createSignal("")
  const [newRepoUrl, setNewRepoUrl] = createSignal("")

  const [error, setError] = createSignal("")

  function openGroupSession(group: DevcenterGroup) {
    navigate(`/${base64Encode(group.path)}/session`)
  }

  function openRepoSession(repo: DevcenterRepo) {
    navigate(`/${base64Encode(repo.path)}/session`)
  }

  async function createGroup() {
    const a = api
    if (!a || !newGroupName().trim()) return
    setError("")
    try {
      const group = await a.createGroup(newGroupName().trim(), newGroupDesc().trim() || undefined)
      setShowCreateGroup(false)
      setNewGroupName("")
      setNewGroupDesc("")
      await refetchGroups()
      setSelectedSlug(group.slug)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create group")
    }
  }

  async function createRepo() {
    const a = api
    const slug = selectedSlug()
    if (!a || !slug || !newRepoName().trim()) return
    setError("")
    try {
      await a.createRepo(slug, newRepoName().trim())
      setShowCreateRepo(false)
      setNewRepoName("")
      await refetchRepos()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create repo")
    }
  }

  async function cloneRepo() {
    const a = api
    const slug = selectedSlug()
    if (!a || !slug || !newRepoName().trim() || !newRepoUrl().trim()) return
    setError("")
    try {
      await a.cloneRepo(slug, newRepoName().trim(), newRepoUrl().trim())
      setShowCloneRepo(false)
      setNewRepoName("")
      setNewRepoUrl("")
      await refetchRepos()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clone repo")
    }
  }

  function selectGroup(slug: string) {
    setSelectedSlug(slug)
    setShowCreateRepo(false)
    setShowCloneRepo(false)
    setNewRepoName("")
    setNewRepoUrl("")
    setError("")
  }

  function goHome() {
    setSelectedSlug(null)
    setError("")
  }

  return (
    <div class="flex h-full w-full min-h-0 min-w-0">
      <aside class="w-72 shrink-0 border-r border-border-base flex flex-col">
        <div class="p-4 border-b border-border-base flex items-center justify-between">
          <div>
            <h1 class="text-base font-semibold text-text-strong">DevCenter</h1>
            <p class="text-xs text-text-muted mt-0.5">Workspaces</p>
          </div>
          <button
            type="button"
            class="text-xs text-text-muted hover:text-text-base px-2 py-1"
            onClick={goHome}
            title="Back to home"
          >
            ←
          </button>
        </div>
        <div class="p-2 flex-1 overflow-y-auto">
          <Show when={!groups.loading} fallback={<p class="text-xs text-text-muted p-2">Loading...</p>}>
            <Show when={groups()?.length} fallback={<p class="text-xs text-text-muted p-2">No groups yet</p>}>
              <For each={groups()}>
                {(g) => (
                  <button
                    type="button"
                    class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors"
                    classList={{
                      "bg-surface-base text-text-strong": selectedSlug() === g.slug,
                      "text-text-muted hover:bg-surface-raised-base-hover hover:text-text-base":
                        selectedSlug() !== g.slug,
                    }}
                    onClick={() => selectGroup(g.slug)}
                  >
                    <div class="font-medium truncate">{g.name}</div>
                    <div class="text-xs text-text-muted truncate font-mono">{g.path}</div>
                  </button>
                )}
              </For>
            </Show>
          </Show>
        </div>
        <div class="p-2 border-t border-border-base">
          <Button
            size="normal"
            variant="ghost"
            onClick={() => {
              setShowCreateGroup(!showCreateGroup())
              setError("")
            }}
            class="w-full"
          >
            {showCreateGroup() ? "Cancel" : "New Group"}
          </Button>
        </div>
      </aside>

      <main class="flex-1 min-w-0 flex flex-col">
        <Show when={showCreateGroup()}>
          <div class="p-4 border-b border-border-base bg-surface-base">
            <h2 class="text-sm font-semibold text-text-strong mb-3">New Group</h2>
            <div class="flex flex-col gap-2 max-w-md">
              <input
                type="text"
                placeholder="Group name (e.g. pixa)"
                value={newGroupName()}
                onInput={(e) => setNewGroupName(e.currentTarget.value)}
                class="px-3 py-2 bg-background-base border border-border-base rounded-md text-sm text-text-base placeholder-text-muted focus:outline-none focus:border-border-active"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newGroupDesc()}
                onInput={(e) => setNewGroupDesc(e.currentTarget.value)}
                class="px-3 py-2 bg-background-base border border-border-base rounded-md text-sm text-text-base placeholder-text-muted focus:outline-none focus:border-border-active"
              />
              <Show when={error()}>
                <p class="text-xs text-text-error">{error()}</p>
              </Show>
              <div class="flex gap-2 mt-1">
                <Button size="normal" onClick={createGroup} disabled={!newGroupName().trim()}>
                  Create
                </Button>
                <Button size="normal" variant="ghost" onClick={() => setShowCreateGroup(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </Show>

        <Show
          when={selectedSlug()}
          fallback={
            <div class="flex-1 flex items-center justify-center text-text-muted text-sm">
              Select a group or create a new one
            </div>
          }
        >
          <GroupView
            slug={selectedSlug()!}
            groups={groups() ?? []}
            repos={repos() ?? []}
            reposLoading={repos.loading}
            error={error()}
            showCreateRepo={showCreateRepo()}
            showCloneRepo={showCloneRepo()}
            newRepoName={newRepoName()}
            newRepoUrl={newRepoUrl()}
            onSetNewRepoName={setNewRepoName}
            onSetNewRepoUrl={setNewRepoUrl}
            onSetShowCreateRepo={(v) => {
              setShowCreateRepo(v)
              setShowCloneRepo(false)
              setError("")
            }}
            onSetShowCloneRepo={(v) => {
              setShowCloneRepo(v)
              setShowCreateRepo(false)
              setError("")
            }}
            onCreateRepo={createRepo}
            onCloneRepo={cloneRepo}
            onOpenGroupSession={openGroupSession}
            onOpenRepoSession={openRepoSession}
          />
        </Show>
      </main>
    </div>
  )
}

type GroupViewProps = {
  slug: string
  groups: DevcenterGroup[]
  repos: DevcenterRepo[]
  reposLoading: boolean
  error: string
  showCreateRepo: boolean
  showCloneRepo: boolean
  newRepoName: string
  newRepoUrl: string
  onSetNewRepoName: (v: string) => void
  onSetNewRepoUrl: (v: string) => void
  onSetShowCreateRepo: (v: boolean) => void
  onSetShowCloneRepo: (v: boolean) => void
  onCreateRepo: () => void
  onCloneRepo: () => void
  onOpenGroupSession: (g: DevcenterGroup) => void
  onOpenRepoSession: (r: DevcenterRepo) => void
}

const GroupView: Component<GroupViewProps> = (props) => {
  const group = () => props.groups.find((g) => g.slug === props.slug)

  return (
    <div class="flex-1 min-w-0 flex flex-col">
      <div class="p-4 border-b border-border-base flex items-start justify-between">
        <div class="min-w-0">
          <h2 class="text-lg font-semibold text-text-strong truncate">
            {group()?.name ?? props.slug}
          </h2>
          <Show when={group()?.description}>
            <p class="text-sm text-text-muted mt-0.5">{group()?.description}</p>
          </Show>
          <Show when={group()?.path}>
            <p class="text-xs text-text-muted font-mono mt-1">{group()?.path}</p>
          </Show>
        </div>
        <Show when={group()}>
          {(g) => (
            <Button size="normal" onClick={() => props.onOpenGroupSession(g())}>
              Open Group Session
            </Button>
          )}
        </Show>
      </div>

      <div class="p-4 border-b border-border-base flex items-center justify-between">
        <h3 class="text-sm font-semibold text-text-strong">Repos</h3>
        <div class="flex gap-2">
          <Button size="small" variant="ghost" onClick={() => props.onSetShowCreateRepo(!props.showCreateRepo)}>
            {props.showCreateRepo ? "Cancel" : "New Project"}
          </Button>
          <Button size="small" variant="ghost" onClick={() => props.onSetShowCloneRepo(!props.showCloneRepo)}>
            {props.showCloneRepo ? "Cancel" : "Clone Repo"}
          </Button>
        </div>
      </div>

      <Show when={props.showCreateRepo}>
        <div class="p-4 border-b border-border-base bg-surface-base">
          <div class="flex flex-col gap-2 max-w-md">
            <input
              type="text"
              placeholder="Project name (e.g. backend)"
              value={props.newRepoName}
              onInput={(e) => props.onSetNewRepoName(e.currentTarget.value)}
              class="px-3 py-2 bg-background-base border border-border-base rounded-md text-sm text-text-base placeholder-text-muted focus:outline-none focus:border-border-active"
            />
            <Show when={props.error}>
              <p class="text-xs text-text-error">{props.error}</p>
            </Show>
            <div class="flex gap-2 mt-1">
              <Button size="small" onClick={props.onCreateRepo} disabled={!props.newRepoName.trim()}>
                Create
              </Button>
              <Button size="small" variant="ghost" onClick={() => props.onSetShowCreateRepo(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </Show>

      <Show when={props.showCloneRepo}>
        <div class="p-4 border-b border-border-base bg-surface-base">
          <div class="flex flex-col gap-2 max-w-md">
            <input
              type="text"
              placeholder="Project name (e.g. backend)"
              value={props.newRepoName}
              onInput={(e) => props.onSetNewRepoName(e.currentTarget.value)}
              class="px-3 py-2 bg-background-base border border-border-base rounded-md text-sm text-text-base placeholder-text-muted focus:outline-none focus:border-border-active"
            />
            <input
              type="text"
              placeholder="SSH or HTTPS URL"
              value={props.newRepoUrl}
              onInput={(e) => props.onSetNewRepoUrl(e.currentTarget.value)}
              class="px-3 py-2 bg-background-base border border-border-base rounded-md text-sm text-text-base placeholder-text-muted focus:outline-none focus:border-border-active"
            />
            <Show when={props.error}>
              <p class="text-xs text-text-error">{props.error}</p>
            </Show>
            <div class="flex gap-2 mt-1">
              <Button
                size="small"
                onClick={props.onCloneRepo}
                disabled={!props.newRepoName.trim() || !props.newRepoUrl.trim()}
              >
                Clone
              </Button>
              <Button size="small" variant="ghost" onClick={() => props.onSetShowCloneRepo(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </Show>

      <div class="flex-1 overflow-y-auto p-4">
        <Show when={!props.reposLoading} fallback={<p class="text-sm text-text-muted">Loading...</p>}>
          <Show
            when={props.repos.length}
            fallback={<p class="text-sm text-text-muted">No repos yet. Create or clone one.</p>}
          >
            <div class="flex flex-col gap-2">
              <For each={props.repos}>
                {(repo) => (
                  <div class="p-3 bg-surface-base border border-border-base rounded-md flex items-center justify-between">
                    <div class="min-w-0">
                      <div class="text-sm font-medium text-text-strong truncate">{repo.name}</div>
                      <Show when={repo.git_url}>
                        <div class="text-xs text-text-muted font-mono truncate">{repo.git_url}</div>
                      </Show>
                      <Show when={repo.branch}>
                        <div class="text-xs text-text-muted">branch: {repo.branch}</div>
                      </Show>
                    </div>
                    <Button size="small" variant="ghost" onClick={() => props.onOpenRepoSession(repo)}>
                      Open
                    </Button>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  )
}

export default Devcenter
