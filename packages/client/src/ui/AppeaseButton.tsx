import { cls, type Şehir } from "@project/shared/src/utils/Helper";
import { AppeaseAction } from "../game/actions/AppeaseAction";
import { TimedActions } from "../game/definitions/TimedAction";
import { TimedActionDescComp } from "../game/logic/TimedActionDescComp";
import { G } from "../utils/Global";
import { ActionButton } from "./ActionButton";

export function AppeaseButton({ Şehir, className }: { Şehir: Şehir; className?: string }): React.ReactNode {
   return (
      <ActionButton
         tooltip={(element) => (
            <>
               <TimedActionDescComp action="Appease" />
               {element}
            </>
         )}
         className={cls("btn", className)}
         action={AppeaseAction(Şehir, G.save.state.playerProvince, G.save)}
      >
         {TimedActions.Appease.name()}
      </ActionButton>
   );
}
