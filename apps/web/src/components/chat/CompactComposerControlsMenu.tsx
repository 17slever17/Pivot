import { ProviderInteractionMode, RuntimeMode, ThreadAgentMode } from "@t3tools/contracts";
import { memo, type ReactNode } from "react";
import { BotIcon, EllipsisIcon, UsersIcon } from "lucide-react";
import { Button } from "../ui/button";
import { ComposerControlIcon, ComposerSelectControl } from "./ComposerControl";
import {
  Menu,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator as MenuDivider,
  MenuTrigger,
} from "../ui/menu";
import { Select, SelectItem, SelectPopup, SelectValue } from "../ui/select";

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
    <>
      <Select
        value={props.agentMode}
        onValueChange={(value) => {
          if (value === "single" || value === "orchestrator") {
            props.onAgentModeChange(value);
          }
        }}
      >
        <ComposerSelectControl
          className="max-w-36 shrink-0 font-medium"
          aria-label="Agent mode"
          disabled={props.agentModeChangeDisabled}
        >
          <ComposerControlIcon icon={props.agentMode === "orchestrator" ? UsersIcon : BotIcon} />
          <SelectValue>
            {props.agentMode === "orchestrator" ? "Orchestrator" : "Single"}
          </SelectValue>
        </ComposerSelectControl>
        <SelectPopup alignItemWithTrigger={false}>
          <SelectItem value="single" hideIndicator className="min-w-64 py-2">
            <div className="grid gap-0.5">
              <span className="font-medium text-foreground">Single</span>
              <span className="text-muted-foreground text-xs leading-4">
                Use one primary agent for this thread.
              </span>
            </div>
          </SelectItem>
          <SelectItem value="orchestrator" hideIndicator className="min-w-64 py-2">
            <div className="grid gap-0.5">
              <span className="font-medium text-foreground">Orchestrator</span>
              <span className="text-muted-foreground text-xs leading-4">
                Let the root agent coordinate named subagents.
              </span>
            </div>
          </SelectItem>
        </SelectPopup>
      </Select>

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
    </>
  );
});
