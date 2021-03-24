import { match, compile, MatchFunction, PathFunction } from "path-to-regexp"
import { up } from "lit-app"

export type RouteMap = Map<string, ((obj: any) => any)>

type RouteHandler<T> = (routeParams: T) => any
type RouteGoer<T> = (params: T) => void

// Functions associated with a particular route pattern and parameters structure
export type Route<T extends object> = {
  pattern: string
  on?: RouteHandler<T> // Optionally initialised on creation or added later
  match: MatchFunction<T>
  make: PathFunction<T>
  go: RouteGoer<T>
}

export function route<T extends object> (pattern: string, on?: RouteHandler<T>): Route<T> {
  return {
    pattern,
    on,
    match: match(pattern.toString(), { decode: decodeURIComponent }),
    make: compile(pattern.toString()),
    go: function (params: T) {
      history.pushState(null, null, this.make(params))
      window.dispatchEvent(new PopStateEvent("popstate"))
    }
  }
}

export function routeMatchers (patterns: object) {
  const matchers: any = {}
  for (const pattern of Object.values(patterns)) {
    matchers[pattern] = route(pattern)
  }
  return matchers
}

export function setRoute (path: string) {
  history.pushState(null, null, path)
}

export class LitRouter {

  routes: Array<Route<object>>

  constructor (routes: Array<Route<object>>) {
    this.routes = routes
  }

  onPathChange (path: string) {
    console.log(`Path change: ${path}`)
    for (const { on, match } of this.routes) {
      const urlMatch = match(path)
      if (urlMatch) {
        on(urlMatch.params)
        break
      }
    }
  }

  wrappedHandler () {
    this.onPathChange(location.pathname)
    up(() => {})()
  }

  start () {
    console.log("Starting router")
    this.onPathChange(location.pathname)
    console.log("adding event listener")
    window.addEventListener("popstate", this.wrappedHandler.bind(this))
    return this // Allow chained `const router = new LitRouter(routes).start()`
  }

  stop () {
    window.removeEventListener("popstate", this.wrappedHandler)
    return this // For consistency with start()
  }
}
