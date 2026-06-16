import { Effect } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { Api } from "../api"
import * as workspaces from "../devcenter/workspaces"
import { InvalidRequestError, ConflictError } from "../errors"

function toError(error: unknown): InvalidRequestError {
  const message = error instanceof Error ? error.message : "Unknown error"
  return new InvalidRequestError({ message, kind: "devcenter" })
}

export const DevcenterHandler = HttpApiBuilder.group(Api, "server.devcenter", (handlers) =>
  Effect.gen(function* () {
    return handlers
      .handle("devcenter.groups.list", () =>
        Effect.tryPromise({
          try: () => workspaces.listGroups(),
          catch: toError,
        }),
      )
      .handle("devcenter.groups.create", (ctx) =>
        Effect.tryPromise({
          try: () => workspaces.createGroup(ctx.payload.name, ctx.payload.description),
          catch: (e) => {
            const message = e instanceof Error ? e.message : "Unknown error"
            return e instanceof Error && message === "Group already exists"
              ? new ConflictError({ message, resource: ctx.payload.name })
              : new InvalidRequestError({ message, kind: "devcenter" })
          },
        }),
      )
      .handle("devcenter.groups.get", (ctx) =>
        Effect.gen(function* () {
          const group = yield* Effect.tryPromise({
            try: () => workspaces.getGroup(ctx.params.slug),
            catch: toError,
          })
          if (!group) {
            return yield* Effect.fail(
              new InvalidRequestError({ message: "Group not found", kind: "devcenter" }),
            )
          }
          return group
        }),
      )
      .handle("devcenter.repos.list", (ctx) =>
        Effect.tryPromise({
          try: () => workspaces.listRepos(ctx.params.slug),
          catch: toError,
        }),
      )
      .handle("devcenter.repos.create", (ctx) =>
        Effect.tryPromise({
          try: () => workspaces.createRepo(ctx.params.slug, ctx.payload.name),
          catch: (e) => {
            const message = e instanceof Error ? e.message : "Unknown error"
            return message.includes("already exists")
              ? new ConflictError({ message, resource: ctx.payload.name })
              : new InvalidRequestError({ message, kind: "devcenter" })
          },
        }),
      )
      .handle("devcenter.repos.clone", (ctx) =>
        Effect.tryPromise({
          try: () => workspaces.cloneRepo(ctx.params.slug, ctx.payload.name, ctx.payload.git_url),
          catch: (e) => {
            const message = e instanceof Error ? e.message : "Unknown error"
            return message.includes("already exists") || message.includes("not found")
              ? new ConflictError({ message, resource: ctx.payload.name })
              : new InvalidRequestError({ message, kind: "devcenter" })
          },
        }),
      )
  }),
)
