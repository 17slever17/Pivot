import { createFileRoute, redirect } from "@tanstack/react-router";

import { connectCliAuthRoutesEnabled } from "../cloud/connectCliAuth";
import { ConnectCliCallbackSurface } from "../components/cloud/ConnectCliAuthSurface";
import { SettingsRuntimeLocalization } from "../components/settings/SettingsRuntimeLocalization";

function ConnectCallbackRouteSurface() {
  return (
    <>
      <SettingsRuntimeLocalization />
      <ConnectCliCallbackSurface />
    </>
  );
}

export const Route = createFileRoute("/connect_/callback")({
  beforeLoad: () => {
    if (!connectCliAuthRoutesEnabled()) {
      throw redirect({ to: "/", replace: true });
    }
  },
  component: ConnectCallbackRouteSurface,
});
