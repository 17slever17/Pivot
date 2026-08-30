import { ProviderInteractionMode, RuntimeMode, ThreadAgentMode } from "@t3tools/contracts";
import { memo, type ReactNode } from "react";
import { EllipsisIcon } from "lucide-react";
import { Button } from "../ui/button";
import {
  Menu,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator as MenuDivider,
  MenuTrigger,
} from "../ui/menu";

export const CompactComposerControlsMenu = memo(function CompactComposerControlsMenu(props: {
  interactionMode: ProviderInteractionMode;
  agentMode: ThreadAgentMode;
  agentModeChangeDisabled: boolean;
  runtimeMode: RuntimeMode;
  showInteractionModeToggle: boolean;
  traitsMenuContent?: ReactNode;
  onToggleInteractionMode: () => void;
  onAgentModeChange: (mode: ThreadAgentMode) => void;
  onRuntimeModeChange: (mode: RuntimeMode) => void;
}) {
  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 px-2 text-muted-foreground/70 hover:text-foreground/80"
            aria-label="More composer controls"
          />
        }
      >
        <EllipsisIcon aria-hidden="true" className="size-4" />
      </MenuTrigger>
      <MenuPopup align="start">
        {props.traitsMenuContent ? (
          <>
            {props.traitsMenuContent}
            <MenuDivider />
          </>
        ) : null}
        {props.showInteractionModeToggle ? (
          <>
            <div className="px-2 py-1.5 font-medium text-muted-foreground text-xs">Mode</div>
            <MenuRadioGroup
              value={props.interactionMode}
              onValueChange={(value) => {
                if (!value || value === props.interactionMode) return;
                props.onToggleInteractionMode();
              }}
            >
              <MenuRadioItem value="default">Chat</MenuRadioItem>
              <MenuRadioItem value="plan">Plan</MenuRadioItem>
            </MenuRadioGroup>
            <MenuDivider />
          </>
        ) : null}
        <div className="px-2 py-1.5 font-medium text-muted-foreground text-xs">Agent mode</div>
        <MenuRadioGroup
          value={props.agentMode}
          onValueChange={(value) => {
            if (value === "single" || value === "orchestrator") {
              props.onAgentModeChange(value);
            }
          }}
        >
          <MenuRadioItem value="single" disabled={props.agentModeChangeDisabled}>
            Single
          </MenuRadioItem>
          <MenuRadioItem value="orchestrator" disabled={props.agentModeChangeDisabled}>
            Orchestrator
          </MenuRadioItem>
        </MenuRadioGroup>
        <div className="px-2 pb-1.5 text-muted-foreground text-xs">
          {props.agentModeChangeDisabled
            ? "Can change before the first turn or while idle."
            : "Choose how the root agent handles this thread."}
        </div>
        <MenuDivider />
        <div className="px-2 py-1.5 font-medium text-muted-foreground text-xs">Access</div>
        <MenuRadioGroup
          value={props.runtimeMode}
          onValueChange={(value) => {
            if (!value || value === props.runtimeMode) return;
            props.onRuntimeModeChange(value as RuntimeMode);
          }}
        >
          <MenuRadioItem value="approval-required">Supervised</MenuRadioItem>
          <MenuRadioItem value="auto-accept-edits">Auto-accept edits</MenuRadioItem>
          <MenuRadioItem value="auto">Auto</MenuRadioItem>
          <MenuRadioItem value="full-access">Full access</MenuRadioItem>
        </MenuRadioGroup>
      </MenuPopup>
    </Menu>
  );
});
