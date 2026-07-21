import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const mainLabs = [
  ["01 network namespaces", "NetworkNamespaceTopologyLab.tsx"],
  ["02 veth, bridges, and routing", "VethTopologyLab.tsx"],
  ["03 egress NAT and conntrack", "NatConntrackLab.tsx"],
  ["04 network policy and firewalls", "NetworkPolicyLab.tsx"],
  ["05 service discovery", "ServicePathLab.tsx"],
  ["06 availability and failure domains", "AvailabilityFailureDomainLab.tsx"],
  ["07 network observability and capacity", "NetworkObservabilityCapacityLab.tsx"],
  ["08 namespace platform", "NamespacePlatformLab.tsx"],
];

const incidentLabs = [
  ["01 network namespaces", "NetworkNamespaceIncidentLab.tsx"],
  ["02 veth, bridges, and routing", "VethRoutingIncidentLab.tsx"],
  ["03 egress NAT and conntrack", "NatConntrackIncidentLab.tsx"],
  ["04 network policy and firewalls", "NetworkPolicyIncidentLab.tsx"],
  ["05 service discovery", "ServiceDiscoveryIncidentLab.tsx"],
  ["06 availability and failure domains", "AvailabilityFailureDomainIncidentLab.tsx"],
  ["07 network observability and capacity", "NetworkObservabilityCapacityIncidentLab.tsx"],
  ["08 namespace platform", "NamespacePlatformIncidentLab.tsx"],
];

const nativeSelectPattern = /<select(?:\s|>)/gi;
const checkboxPattern = /\btype\s*=\s*(?:"checkbox"|'checkbox'|\{\s*["']checkbox["']\s*\})/gi;
const renderedChoiceRailPattern = /<InfrastructureChoiceRail\b/;
const renderedStateSwitchPattern = /<InfrastructureStateSwitch\b/;
const explicitDataControlPattern = /\bdata-control(?:-id)?\s*=/;
const explicitSwitchRolePattern = /\brole\s*=\s*["']switch["']/;

function componentUrl(fileName) {
  return new URL(`../src/components/infrastructure/${fileName}`, import.meta.url);
}

function assertNoLegacyFormControls(source, kind, chapter, fileName) {
  const selects = source.match(nativeSelectPattern) ?? [];
  const checkboxes = source.match(checkboxPattern) ?? [];

  assert.equal(
    selects.length,
    0,
    `${kind} ${chapter} (${fileName}) must not render native <select> controls; found ${selects.length}. Use direct-manipulation choice cards instead.`,
  );
  assert.equal(
    checkboxes.length,
    0,
    `${kind} ${chapter} (${fileName}) must not render type="checkbox" controls; found ${checkboxes.length}. Use an explicit state switch instead.`,
  );
}

test("all infrastructure main and incident labs preserve the direct-manipulation contract", async (t) => {
  for (const [chapter, fileName] of mainLabs) {
    await t.test(`main lab: ${chapter}`, async () => {
      const source = await readFile(componentUrl(fileName), "utf8");
      assertNoLegacyFormControls(source, "Main lab", chapter, fileName);

      const rendersSharedChoice = renderedChoiceRailPattern.test(source);
      const rendersSharedSwitch = renderedStateSwitchPattern.test(source);
      const rendersExplicitSwitch = explicitDataControlPattern.test(source)
        && explicitSwitchRolePattern.test(source);

      assert.ok(
        rendersSharedChoice || rendersSharedSwitch || rendersExplicitSwitch,
        `Main lab ${chapter} (${fileName}) has no direct-manipulation control contract. Render InfrastructureChoiceRail, InfrastructureStateSwitch, or an explicit data-control + role="switch" control.`,
      );
    });
  }

  for (const [chapter, fileName] of incidentLabs) {
    await t.test(`incident lab: ${chapter}`, async () => {
      const source = await readFile(componentUrl(fileName), "utf8");
      assertNoLegacyFormControls(source, "Incident lab", chapter, fileName);
      assert.match(
        source,
        renderedChoiceRailPattern,
        `Incident lab ${chapter} (${fileName}) must render InfrastructureChoiceRail for repair selection.`,
      );
    });
  }
});
