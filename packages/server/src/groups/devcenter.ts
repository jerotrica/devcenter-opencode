import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "effect/unstable/httpapi"
import { InvalidRequestError, ConflictError } from "../errors"

const Slug = Schema.String

const RepoSlug = Schema.String

const GroupPayload = Schema.Struct({
  name: Schema.String,
  description: Schema.optional(Schema.String),
})

const RepoPayload = Schema.Struct({
  name: Schema.String,
})

const ClonePayload = Schema.Struct({
  name: Schema.String,
  git_url: Schema.String,
})

const GroupResponse = Schema.Struct({
  slug: Schema.String,
  name: Schema.String,
  description: Schema.optional(Schema.String),
  path: Schema.String,
  created_at: Schema.Number,
  updated_at: Schema.Number,
})

const RepoResponse = Schema.Struct({
  slug: Schema.String,
  name: Schema.String,
  path: Schema.String,
  git_url: Schema.optional(Schema.String),
  branch: Schema.optional(Schema.String),
  is_git_repo: Schema.Boolean,
  created_at: Schema.Number,
  updated_at: Schema.Number,
})

export const DevcenterGroup = HttpApiGroup.make("server.devcenter")
  .add(
    HttpApiEndpoint.get("devcenter.groups.list", "/api/devcenter/groups", {
      success: Schema.Array(GroupResponse),
      error: [InvalidRequestError],
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.devcenter.groups.list",
        summary: "List workspace groups",
        description: "List all workspace groups in the DevCenter.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.post("devcenter.groups.create", "/api/devcenter/groups", {
      payload: GroupPayload,
      success: GroupResponse,
      error: [InvalidRequestError, ConflictError],
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.devcenter.groups.create",
        summary: "Create workspace group",
        description: "Create a new workspace group.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.get("devcenter.groups.get", "/api/devcenter/groups/:slug", {
      params: Schema.Struct({ slug: Slug }),
      success: GroupResponse,
      error: [InvalidRequestError],
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.devcenter.groups.get",
        summary: "Get workspace group",
        description: "Get a workspace group by slug.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.get("devcenter.repos.list", "/api/devcenter/groups/:slug/repos", {
      params: Schema.Struct({ slug: Slug }),
      success: Schema.Array(RepoResponse),
      error: [InvalidRequestError],
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.devcenter.repos.list",
        summary: "List repos in group",
        description: "List all repos/projects in a workspace group.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.post("devcenter.repos.create", "/api/devcenter/groups/:slug/repos/create", {
      params: Schema.Struct({ slug: Slug }),
      payload: RepoPayload,
      success: RepoResponse,
      error: [InvalidRequestError, ConflictError],
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.devcenter.repos.create",
        summary: "Create repo in group",
        description: "Create a new repo/project in a workspace group.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.post("devcenter.repos.clone", "/api/devcenter/groups/:slug/repos/clone", {
      params: Schema.Struct({ slug: Slug }),
      payload: ClonePayload,
      success: RepoResponse,
      error: [InvalidRequestError, ConflictError],
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.devcenter.repos.clone",
        summary: "Clone repo into group",
        description: "Clone a git repository into a workspace group.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.delete("devcenter.groups.remove", "/api/devcenter/groups/:slug", {
      params: Schema.Struct({ slug: Slug }),
      success: HttpApiSchema.NoContent,
      error: [InvalidRequestError],
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.devcenter.groups.remove",
        summary: "Remove workspace group",
        description: "Move a workspace group to trash.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.delete("devcenter.repos.remove", "/api/devcenter/groups/:slug/repos/:repoSlug", {
      params: Schema.Struct({ slug: Slug, repoSlug: RepoSlug }),
      success: HttpApiSchema.NoContent,
      error: [InvalidRequestError],
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.devcenter.repos.remove",
        summary: "Remove repo from group",
        description: "Move a repository from a workspace group to trash.",
      }),
    ),
  )
  .annotateMerge(
    OpenApi.annotations({
      title: "devcenter",
      description: "DevCenter workspace management routes.",
    }),
  )
