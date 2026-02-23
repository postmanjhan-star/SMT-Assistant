import type { NavigationGuard } from "vue-router"
import {
  isPanasonicDetailRouteNormalized,
  isPanasonicProductionRouteNormalized,
  parsePanasonicDetailRoute,
  parsePanasonicProductionRoute,
  toPanasonicDetailRouteLocation,
  toPanasonicProductionRouteLocation,
} from "./panasonicRouteContracts"
import { PANASONIC_NOT_FOUND_PATH } from "@/ui/shared/composables/panasonic/usePanasonicConstants"

type GuardRouteLike = {
  params: Record<string, unknown>
  query: Record<string, unknown>
}

export function resolvePanasonicDetailRoute(
  to: GuardRouteLike
): true | string | ReturnType<typeof toPanasonicDetailRouteLocation> {
  const parsed = parsePanasonicDetailRoute(to)
  if (!parsed.ok) {
    return PANASONIC_NOT_FOUND_PATH
  }

  if (isPanasonicDetailRouteNormalized(to, parsed.value)) {
    return true
  }

  return toPanasonicDetailRouteLocation(parsed.value, to.query)
}

export function resolvePanasonicProductionRoute(
  to: GuardRouteLike
): true | string | ReturnType<typeof toPanasonicProductionRouteLocation> {
  const parsed = parsePanasonicProductionRoute(to)
  if (!parsed.ok) {
    return PANASONIC_NOT_FOUND_PATH
  }

  if (isPanasonicProductionRouteNormalized(to, parsed.value)) {
    return true
  }

  return toPanasonicProductionRouteLocation(parsed.value, to.query)
}

export const guardPanasonicDetailRoute: NavigationGuard = (to) => {
  return resolvePanasonicDetailRoute({
    params: to.params as Record<string, unknown>,
    query: to.query as Record<string, unknown>,
  })
}

export const guardPanasonicProductionRoute: NavigationGuard = (to) => {
  return resolvePanasonicProductionRoute({
    params: to.params as Record<string, unknown>,
    query: to.query as Record<string, unknown>,
  })
}
