import { deriveIpv4Network } from "./subnets-neighbors-and-gateways.ts";

export type IPv4Route = Readonly<{
  id: string; prefix: string; nextHop: string; device: string; metric: number;
}>;
export type RouteLookup = Readonly<{
  destination: string;
  candidates: readonly (IPv4Route & { prefixLength: number })[];
  selected: (IPv4Route & { prefixLength: number }) | null;
}>;

export const learningRouteTable: readonly IPv4Route[] = Object.freeze([
  { id: "remote-primary", prefix: "203.0.113.0/24", nextHop: "10.20.0.1", device: "eth0", metric: 20 },
  { id: "metric-primary", prefix: "198.51.100.0/24", nextHop: "10.20.0.1", device: "eth0", metric: 20 },
  { id: "metric-backup", prefix: "198.51.100.0/24", nextHop: "10.20.0.254", device: "eth0", metric: 80 },
  { id: "default", prefix: "0.0.0.0/0", nextHop: "10.20.0.254", device: "eth0", metric: 100 },
]);

/** One lookup supplies command evidence, matching candidates, and topology. */
export function lookupIPv4Route(destination: string, table = learningRouteTable): RouteLookup {
  deriveIpv4Network(destination, 32); // Validate even with an empty route table.
  const candidates = table.flatMap(route => {
    const [network, length] = route.prefix.split("/");
    const prefixLength = Number(length);
    if (length === undefined || !Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 32 || !Number.isFinite(route.metric) || route.metric < 0) throw new Error("invalid-route");
    return deriveIpv4Network(destination, prefixLength) === deriveIpv4Network(network, prefixLength)
      ? [{ ...route, prefixLength }] : [];
  }).sort((a, b) => b.prefixLength - a.prefixLength || a.metric - b.metric || a.id.localeCompare(b.id));
  return { destination, candidates, selected: candidates[0] ?? null };
}

export function routeLookupForPhase(phaseId: string): RouteLookup {
  return lookupIPv4Route(phaseId === "metric-tie" ? "198.51.100.8" : "203.0.113.20");
}

export function formatRoute(route: IPv4Route): string {
  return `${route.prefix === "0.0.0.0/0" ? "default" : route.prefix} via ${route.nextHop} dev ${route.device} metric ${route.metric}`;
}

export function formatRouteLookup(lookup: RouteLookup): string {
  const route = lookup.selected;
  return route ? `${lookup.destination} via ${route.nextHop} dev ${route.device} src 10.20.0.2 metric ${route.metric}` : `${lookup.destination}: no matching route`;
}
