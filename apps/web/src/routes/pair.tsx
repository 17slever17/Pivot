import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

import {
  HostedPairingRouteSurface,
  PairingPendingSurface,
  PairingRouteSurface,
} from "../components/auth/PairingRouteSurface";
import { SettingsRuntimeLocalization } from "../components/settings/SettingsRuntimeLocalization";

export const Route = createFileRoute("/pair")({
  beforeLoad: async ({ context }) => {
    const { authGateState } = context;
    if (authGateState.status === "hosted-pairing") {
      return {
        authGateState,
      };
    }

    if (authGateState.status === "authenticated" || authGateState.status === "hosted-static") {
      throw redirect({ to: "/", replace: true });
    }
    return {
      authGateState,
    };
  },
  component: PairRouteView,
  pendingComponent: PairRoutePendingView,
});

function PairRouteView() {
  const { authGateState } = Route.useRouteContext();
  const navigate = useNavigate();

  if (!authGateState) {
    return null;
  }

  return (
    <>
      <SettingsRuntimeLocalization />
      {authGateState.status === "hosted-pairing" ? (
        <HostedPairingRouteSurface />
      ) : (
        <PairingRouteSurface
          auth={authGateState.auth}
          onAuthenticated={() => {
            void navigate({ to: "/", replace: true });
          }}
          {...(authGateState.errorMessage
            ? { initialErrorMessage: authGateState.errorMessage }
            : {})}
        />
      )}
    </>
  );
}

function PairRoutePendingView() {
  return (
    <>
      <SettingsRuntimeLocalization />
      <PairingPendingSurface />
    </>
  );
}
