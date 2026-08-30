import type { OmpRootPromptBundles } from "@t3tools/contracts";

export type RootPromptBundlesDraft = OmpRootPromptBundles;

export function areRootPromptBundlesEqual(
  left: OmpRootPromptBundles,
  right: OmpRootPromptBundles,
): boolean {
  return (
    left.commonPrompt === right.commonPrompt && left.orchestratorPrompt === right.orchestratorPrompt
  );
}

export function isRootPromptBundlesEmpty(bundles: OmpRootPromptBundles): boolean {
  return bundles.commonPrompt.length === 0 && bundles.orchestratorPrompt.length === 0;
}
