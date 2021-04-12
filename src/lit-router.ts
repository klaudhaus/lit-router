import { match, compile, MatchFunction, PathFunction } from "path-to-regexp"

export type GoParamsGetter<T> = ((data: any) => T)
export type GoParams<T> = T | GoParamsGetter<T>
export type RouteGoer<T> = (params: GoParams<T>) => void
export type RouteHandler<T> = (routeParams: T) => any

// Functions associated with a particular route pattern and parameters structure
export type Route<T extends object> = {
  pattern: string
  on?: RouteHandler<T> // Optionally initialised on creation or added later
  match: MatchFunction<T>
  make: PathFunction<T>
  go: RouteGoer<T>
  router?: LitRouter
}

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
