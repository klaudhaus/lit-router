import { match, compile, MatchFunction, PathFunction } from "path-to-regexp"

export type GoParamsGetter<T> = ((data: any) => T)
export type GoParams<T> = T | GoParamsGetter<T>
export type RouteGoer<T> = (params: GoParams<T>) => void
export type RouteHandler<T> = (routeParams: T) => any

/**
 * An object related to a given route pattern, with its associated functions.
 */
export type Route<T extends object> = {
  pattern: string
  on?: RouteHandler<T> // Optionally initialised on creation or added later
  match: MatchFunction<T> // Matcher for the route's given pattern
  make: PathFunction<T> // Function to construct a route of the given pattern
  go: RouteGoer<T> // Function to go to the given route
  router?: LitRouter
}

/**
 * Create a route for the given pattern, optionally with a given route handler.
 */
export function route<T extends object> (pattern: string, on?: RouteHandler<T>): Route<T> {
  return {
    pattern,
    on,
    match: match(pattern.toString(), { decode: decodeURIComponent }),
    make: compile(pattern.toString()),
    go: function (params: GoParams<T>) {
      if (typeof params === "function") {
        params = (<GoParamsGetter<T>>params)(this.router.data)
      }
      history.pushState(null, null, this.make(params))
      window.dispatchEvent(new PopStateEvent("popstate"))
    }
  }
}

export class LitRouter {

  routes: Array<Route<object>>

  data: any

  onPathChange: () => void

  constructor (routes: Array<Route<object>>, data?: any, onHandled?: (...params: any[]) => any) {
    routes.forEach(route => route.router = this)

    this.data = data

    this.onPathChange = async () => {
      const path = location.pathname
      for (const { on, match } of routes) {
        const urlMatch = match(path)
        if (urlMatch) {
          await on(urlMatch.params)
          if (onHandled) onHandled()
          return
        }
      }
      console.warn(`Unrecognised route: ${path}`)
    }
  }

  start () {
    this.onPathChange()
    window.addEventListener("popstate", this.onPathChange)
    return this // Allow chained `const router = new LitRouter(routes).start()`
  }

  stop () {
    window.removeEventListener("popstate", this.onPathChange)
    return this // For consistency with start()
  }
}

/**
 * URL query parameters are best dealt with separately from route patterns, as they should be valid in any order.
 * Instead, get them (within route `on` handling) and set them with these functions.
 */

export function getQueryParam (name: string) {
  return new URLSearchParams(location.search).get(name)
}

export function setQueryParam (name: string, value: string) {
  const params = new URLSearchParams(location.search)
  params.set(name, value)
  history.pushState(null, null, `${location.pathname}?${params}`)
}
