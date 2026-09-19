import { cls, type Şehir } from "@project/shared/src/utils/Helper";
import { CrackDownAction } from "../game/actions/CrackDownAction";
import { TimedActions } from "../game/definitions/TimedAction";
import { TimedActionDescComp } from "../game/logic/TimedActionDescComp";
import { G } from "../utils/Global";
import { ActionButton } from "./ActionButton";

export function CrackDownButton({ Şehir, className }: { Şehir: Şehir; className?: string }): React.ReactNode {
   const ŞehirData = G.save.state.Şehirs.get(Şehir);
   if (!ŞehirData) return null;
   return (
      <ActionButton
         className={cls("btn", className)}
         action={CrackDownAction(Şehir, G.save.state.playerProvince, G.save)}
         tooltip={(element) => (
            <>
               <TimedActionDescComp action="Crackdown" />
               {element}
            </>
         )}
      >
         {TimedActions.Crackdown.name()}
      </ActionButton>
   );
}
