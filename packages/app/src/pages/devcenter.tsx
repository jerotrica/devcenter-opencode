import { createSignal, createResource, For, Show, type Component } from "solid-js"
import { useNavigate } from "@solidjs/router"
import { base64Encode } from "@opencode-ai/core/util/encode"
import * as api from "@/devcenter/api"
import type { DevcenterGroup, DevcenterRepo } from "@/devcenter/types"
import { Button } from "@opencode-ai/ui/button"
import "./devcenter.css"

const Devcenter: Component = () => {
  const navigate = useNavigate()
  const [groups, { refetch: refetchGroups }] = createResource(api.listGroups)
  const [selectedSlug, setSelectedSlug] = createSignal<string | null>(null)
  const [repos, { refetch: refetchRepos }] = createResource(
    () => selectedSlug(),
    (slug) => (slug ? api.listRepos(slug) : []),
  )

  const [showCreateGroup, setShowCreateGroup] = createSignal(false)
  const [newGroupName, setNewGroupName] = createSignal("")
  const [newGroupDesc, setNewGroupDesc] = createSignal("")

  const [showCreateRepo, setShowCreateRepo] = createSignal(false)
  const [showCloneRepo, setShowCloneRepo] = createSignal(false)
  const [newRepoName, setNewRepoName] = createSignal("")
  const [newRepoUrl, setNewRepoUrl] = createSignal("")

  const [groupsOpen, setGroupsOpen] = createSignal(false)

  const [error, setError] = createSignal("")

  function openGroupSession(group: DevcenterGroup) {
    navigate(`/${base64Encode(group.path)}/session`)
  }

  function openRepoSession(repo: DevcenterRepo) {
    navigate(`/${base64Encode(repo.path)}/session`)
  }

  async function createGroup() {
    if (!newGroupName().trim()) return
    setError("")
    try {
      const group = await api.createGroup(newGroupName().trim(), newGroupDesc().trim() || undefined)
      setShowCreateGroup(false)
      setNewGroupName("")
      setNewGroupDesc("")
      await refetchGroups()
      setSelectedSlug(group.slug)
      setGroupsOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create group")
    }
  }

  async function createRepo() {
    const slug = selectedSlug()
    if (!slug || !newRepoName().trim()) return
    setError("")
    try {
      await api.createRepo(slug, newRepoName().trim())
      setShowCreateRepo(false)
      setNewRepoName("")
      await refetchRepos()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create repo")
    }
  }

  async function cloneRepo() {
    const slug = selectedSlug()
    if (!slug || !newRepoName().trim() || !newRepoUrl().trim()) return
    setError("")
    try {
      await api.cloneRepo(slug, newRepoName().trim(), newRepoUrl().trim())
      setShowCloneRepo(false)
      setNewRepoName("")
      setNewRepoUrl("")
      await refetchRepos()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clone repo")
    }
  }

  async function deleteSelectedGroup(group: DevcenterGroup) {
    if (!group) return
    if (!confirm(`Move "${group.name}" and all its repos to trash?`)) return
    setError("")
    try {
      await api.deleteGroup(group.slug)
      setSelectedSlug(null)
      await refetchGroups()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete group")
    }
  }

  async function deleteRepo(repo: DevcenterRepo) {
    const slug = selectedSlug()
    if (!slug) return
    if (!confirm(`Move "${repo.name}" to trash?`)) return
    setError("")
    try {
      await api.deleteRepo(slug, repo.slug)
      await refetchRepos()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete repo")
    }
  }

  function selectGroup(slug: string) {
    setSelectedSlug(slug)
    setShowCreateRepo(false)
    setShowCloneRepo(false)
    setNewRepoName("")
    setNewRepoUrl("")
    setError("")
    setGroupsOpen(false)
  }

  function goHome() {
    setSelectedSlug(null)
    setError("")
  }

  const selectedGroup = () => groups()?.find((g) => g.slug === selectedSlug())

  const showGroupsPanel = () => groupsOpen() || !selectedSlug()

  return (
    <div class="flex flex-col md:flex-row h-full w-full min-h-0 min-w-0">
      <aside class="hidden md:flex md:flex-col md:w-72 md:shrink-0 border-r border-border-base">
        <div class="p-4 border-b border-border-base flex items-center justify-between">
          <div class="min-w-0">
            <h1 class="text-base font-semibold text-text-strong">DevCenter</h1>
            <p class="text-xs text-text-muted mt-0.5">Workspaces</p>
          </div>
          <button
            type="button"
            class="flex items-center justify-center min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 text-xs text-text-muted hover:text-text-base px-2 py-1"
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
                    class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors min-h-[44px] md:min-h-0"
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
            class="w-full min-h-[44px] md:min-h-0"
          >
            {showCreateGroup() ? "Cancel" : "New Group"}
          </Button>
        </div>
      </aside>

      <div class="md:hidden border-b border-border-base">
        <button
          type="button"
          class="flex items-center justify-between w-full min-h-[44px] px-3 py-2 bg-background-base text-left cursor-pointer border-0"
          onClick={() => setGroupsOpen(!groupsOpen())}
          aria-expanded={groupsOpen()}
        >
          <span class="font-semibold text-sm text-text-strong truncate">
            {selectedGroup()?.name ?? "DevCenter"}
          </span>
          <span class="text-xs text-text-muted shrink-0 ml-2">
            {groupsOpen() ? "▲" : selectedSlug() ? "Groups ▼" : "▼"}
          </span>
        </button>
        <Show when={showGroupsPanel()}>
          <div class="max-h-[40dvh] overflow-y-auto border-t border-border-base">
            <div class="px-3 py-2 flex items-center justify-between">
              <span class="text-xs font-semibold text-text-muted uppercase tracking-wider">Groups</span>
              <button
                type="button"
                class="flex items-center justify-center min-w-[44px] min-h-[44px] text-xs text-text-muted hover:text-text-base px-2 py-1 border-0 bg-transparent cursor-pointer"
                onClick={goHome}
                title="Back to home"
              >
                ←
              </button>
            </div>
            <Show when={!groups.loading} fallback={<p class="text-xs text-text-muted px-3 py-2">Loading...</p>}>
              <Show when={groups()?.length} fallback={<p class="text-xs text-text-muted px-3 py-2">No groups yet</p>}>
                <div class="px-2 pb-2 flex flex-col gap-0.5">
                  <For each={groups()}>
                    {(g) => (
                      <button
                        type="button"
                        class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors min-h-[44px]"
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
                </div>
              </Show>
            </Show>
            <div class="px-2 pb-2">
              <Button
                size="normal"
                variant="ghost"
                onClick={() => {
                  setShowCreateGroup(!showCreateGroup())
                  setError("")
                }}
                class="w-full min-h-[44px]"
              >
                {showCreateGroup() ? "Cancel" : "New Group"}
              </Button>
            </div>
          </div>
        </Show>
      </div>

      <main class="flex-1 min-w-0 flex flex-col min-h-0">
        <Show when={showCreateGroup()}>
          <div class="p-3 md:p-4 border-b border-border-base bg-surface-base">
            <h2 class="text-sm font-semibold text-text-strong mb-3">New Group</h2>
            <div class="flex flex-col gap-2 w-full max-w-md">
              <input
                type="text"
                placeholder="Group name (e.g. pixa)"
                value={newGroupName()}
                onInput={(e) => setNewGroupName(e.currentTarget.value)}
                class="px-3 py-2 bg-background-base border border-border-base rounded-md text-sm text-text-base placeholder-text-muted focus:outline-none focus:border-border-active min-h-[44px]"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newGroupDesc()}
                onInput={(e) => setNewGroupDesc(e.currentTarget.value)}
                class="px-3 py-2 bg-background-base border border-border-base rounded-md text-sm text-text-base placeholder-text-muted focus:outline-none focus:border-border-active min-h-[44px]"
              />
              <Show when={error()}>
                <p class="text-xs text-text-error">{error()}</p>
              </Show>
              <div class="flex flex-col md:flex-row gap-2 mt-1">
                <Button size="normal" onClick={createGroup} disabled={!newGroupName().trim()} class="min-h-[44px] md:min-h-0">
                  Create
                </Button>
                <Button size="normal" variant="ghost" onClick={() => setShowCreateGroup(false)} class="min-h-[44px] md:min-h-0">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </Show>

        <Show
          when={selectedSlug()}
          fallback={
            <div class="flex-1 flex items-center justify-center text-text-muted text-sm px-4 py-12">
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
            onDeleteGroup={deleteSelectedGroup}
            onDeleteRepo={deleteRepo}
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
  onDeleteGroup: (g: DevcenterGroup) => void
  onDeleteRepo: (r: DevcenterRepo) => void
}

const GroupView: Component<GroupViewProps> = (props) => {
  const group = () => props.groups.find((g) => g.slug === props.slug)

  return (
    <div class="flex-1 min-w-0 flex flex-col">
      <div class="p-3 md:p-4 border-b border-border-base flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div class="min-w-0">
          <h2 class="text-lg font-semibold text-text-strong truncate">
            {group()?.name ?? props.slug}
          </h2>
          <Show when={group()?.description}>
            <p class="text-sm text-text-muted mt-0.5">{group()?.description}</p>
          </Show>
          <Show when={group()?.path}>
            <p class="text-xs text-text-muted font-mono mt-1 truncate">{group()?.path}</p>
          </Show>
        </div>
        <Show when={group()}>
          {(g) => (
            <div class="w-full md:w-auto flex flex-col md:flex-row gap-2">
              <Button
                size="normal"
                onClick={() => props.onOpenGroupSession(g())}
                class="w-full md:w-auto min-h-[44px] md:min-h-0"
              >
                Open Group Session
              </Button>
              <Button
                size="normal"
                variant="ghost"
                onClick={() => props.onDeleteGroup(g())}
                class="w-full md:w-auto min-h-[44px] md:min-h-0 text-text-error"
              >
                Delete Group
              </Button>
            </div>
          )}
        </Show>
      </div>

      <div class="p-3 md:p-4 border-b border-border-base flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <h3 class="text-sm font-semibold text-text-strong">Repos</h3>
        <div class="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <Button
            size="small"
            variant="ghost"
            onClick={() => props.onSetShowCreateRepo(!props.showCreateRepo)}
            class="w-full md:w-auto min-h-[44px] md:min-h-0"
          >
            {props.showCreateRepo ? "Cancel" : "New Project"}
          </Button>
          <Button
            size="small"
            variant="ghost"
            onClick={() => props.onSetShowCloneRepo(!props.showCloneRepo)}
            class="w-full md:w-auto min-h-[44px] md:min-h-0"
          >
            {props.showCloneRepo ? "Cancel" : "Clone Repo"}
          </Button>
        </div>
      </div>

      <Show when={props.showCreateRepo}>
        <div class="p-3 md:p-4 border-b border-border-base bg-surface-base">
          <div class="flex flex-col gap-2 w-full max-w-md">
            <input
              type="text"
              placeholder="Project name (e.g. backend)"
              value={props.newRepoName}
              onInput={(e) => props.onSetNewRepoName(e.currentTarget.value)}
              class="px-3 py-2 bg-background-base border border-border-base rounded-md text-sm text-text-base placeholder-text-muted focus:outline-none focus:border-border-active min-h-[44px]"
            />
            <Show when={props.error}>
              <p class="text-xs text-text-error">{props.error}</p>
            </Show>
            <div class="flex flex-col md:flex-row gap-2 mt-1">
              <Button
                size="small"
                onClick={props.onCreateRepo}
                disabled={!props.newRepoName.trim()}
                class="min-h-[44px] md:min-h-0"
              >
                Create
              </Button>
              <Button
                size="small"
                variant="ghost"
                onClick={() => props.onSetShowCreateRepo(false)}
                class="min-h-[44px] md:min-h-0"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </Show>

      <Show when={props.showCloneRepo}>
        <div class="p-3 md:p-4 border-b border-border-base bg-surface-base">
          <div class="flex flex-col gap-2 w-full max-w-md">
            <input
              type="text"
              placeholder="Project name (e.g. backend)"
              value={props.newRepoName}
              onInput={(e) => props.onSetNewRepoName(e.currentTarget.value)}
              class="px-3 py-2 bg-background-base border border-border-base rounded-md text-sm text-text-base placeholder-text-muted focus:outline-none focus:border-border-active min-h-[44px]"
            />
            <input
              type="text"
              placeholder="SSH or HTTPS URL"
              value={props.newRepoUrl}
              onInput={(e) => props.onSetNewRepoUrl(e.currentTarget.value)}
              class="px-3 py-2 bg-background-base border border-border-base rounded-md text-sm text-text-base placeholder-text-muted focus:outline-none focus:border-border-active min-h-[44px]"
            />
            <Show when={props.error}>
              <p class="text-xs text-text-error">{props.error}</p>
            </Show>
            <div class="flex flex-col md:flex-row gap-2 mt-1">
              <Button
                size="small"
                onClick={props.onCloneRepo}
                disabled={!props.newRepoName.trim() || !props.newRepoUrl.trim()}
                class="min-h-[44px] md:min-h-0"
              >
                Clone
              </Button>
              <Button
                size="small"
                variant="ghost"
                onClick={() => props.onSetShowCloneRepo(false)}
                class="min-h-[44px] md:min-h-0"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </Show>

      <div class="flex-1 overflow-y-auto p-3 md:p-4">
        <Show when={!props.reposLoading} fallback={<p class="text-sm text-text-muted">Loading...</p>}>
          <Show
            when={props.repos.length}
            fallback={<p class="text-sm text-text-muted">No repos yet. Create or clone one.</p>}
          >
            <div class="flex flex-col gap-2">
              <For each={props.repos}>
                {(repo) => (
                  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 bg-surface-base border border-border-base rounded-md">
                    <div class="min-w-0">
                      <div class="text-sm font-medium text-text-strong truncate">{repo.name}</div>
                      <Show when={repo.git_url}>
                        <div class="text-xs text-text-muted font-mono truncate">{repo.git_url}</div>
                      </Show>
                      <Show when={repo.branch}>
                        <div class="text-xs text-text-muted">branch: {repo.branch}</div>
                      </Show>
                    </div>
                    <div class="flex flex-col md:flex-row w-full md:w-auto">
                      <Button
                        size="small"
                        variant="ghost"
                        onClick={() => props.onOpenRepoSession(repo)}
                        class="w-full md:w-auto min-h-[44px] md:min-h-0"
                      >
                        Open
                      </Button>
                      <Button
                        size="small"
                        variant="ghost"
                        onClick={() => props.onDeleteRepo(repo)}
                        class="w-full md:w-auto min-h-[44px] md:min-h-0 text-text-error"
                      >
                        Delete
                      </Button>
                    </div>
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
