import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime/environment";
import ChatView from "../components/ChatView";
import { threadHasProjectedUserMessage } from "../components/ChatView.logic";
import {
  DraftId,
  markPromotedDraftThreadByRef,
  useComposerDraftStore,
} from "../composerDraftStore";
import { SidebarInset } from "../components/ui/sidebar";
import { waitForDraftHeroTransition } from "../components/chat/draftHeroTransition";
import { buildThreadRouteParams } from "../threadRoutes";
import { usePendingThreadState } from "../pendingThreadState";
import { useThread, useThreadRefs } from "../state/entities";

function DraftChatThreadRouteView() {
  const navigate = useNavigate();
  const { draftId: rawDraftId } = Route.useParams();
  const draftId = DraftId.make(rawDraftId);
  const draftSession = useComposerDraftStore((store) => store.getDraftSession(draftId));
  const threadRefs = useThreadRefs();
  const inferredThreadRef = draftSession
    ? (threadRefs.find(
        (ref) =>
          ref.environmentId === draftSession.environmentId &&
          ref.threadId === draftSession.threadId,
      ) ?? null)
    : null;
  const serverThreadRef = draftSession?.promotedTo ?? inferredThreadRef;
  const serverThread = useThread(serverThreadRef);
  const serverThreadHasProjectedMessage = threadHasProjectedUserMessage(serverThread);
  const canonicalThreadRef = serverThreadHasProjectedMessage ? serverThreadRef : null;
  const migratePendingThreadState = usePendingThreadState((state) => state.migrateThreadState);
  const draftThreadKey = draftSession
    ? scopedThreadKey(scopeThreadRef(draftSession.environmentId, draftSession.threadId))
    : null;
  const serverThreadKey = serverThreadRef ? scopedThreadKey(serverThreadRef) : null;

  useEffect(() => {
    if (!draftThreadKey || !serverThreadKey) {
      return;
    }
    migratePendingThreadState(draftThreadKey, serverThreadKey);
  }, [draftThreadKey, migratePendingThreadState, serverThreadKey]);

  useEffect(() => {
    // A bootstrap send creates the thread before preparing its worktree and
    // rolls it back when preparation fails. Marking on mere existence would
    // stick `promotedTo` on the surviving draft, hiding it from the sidebar.
    if (!inferredThreadRef || draftSession?.promotedTo || !serverThreadHasProjectedMessage) {
      return;
    }
    markPromotedDraftThreadByRef(inferredThreadRef);
  }, [draftSession?.promotedTo, inferredThreadRef, serverThreadHasProjectedMessage]);

  useEffect(() => {
    if (!canonicalThreadRef) {
      return;
    }

    let cancelled = false;
    void waitForDraftHeroTransition().then(() => {
      if (cancelled) {
        return;
      }
      void navigate({
        to: "/$environmentId/$threadId",
        params: buildThreadRouteParams(canonicalThreadRef),
        replace: true,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [canonicalThreadRef, navigate]);

  useEffect(() => {
    if (draftSession || canonicalThreadRef) {
      return;
    }
    void navigate({ to: "/", replace: true });
  }, [canonicalThreadRef, draftSession, navigate]);

  if (!draftSession) {
    return null;
  }

  return (
    <SidebarInset className="h-svh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground md:h-dvh">
      <ChatView
        draftId={draftId}
        environmentId={draftSession.environmentId}
        threadId={draftSession.threadId}
        routeKind="draft"
        forceExpandedMobileComposer
      />
    </SidebarInset>
  );
}

export const Route = createFileRoute("/_chat/draft/$draftId")({
  component: DraftChatThreadRouteView,
});
