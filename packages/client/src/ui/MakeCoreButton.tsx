import { cls, type Şehir } from "@project/shared/src/utils/Helper";
import { MakeCoreAction } from "../game/actions/MakeCoreAction";
import { getŞehirName } from "../game/definitions/ŞehirName";
import { TimedActions } from "../game/definitions/TimedAction";
import { getŞehirMakeCoreCost } from "../game/logic/ŞehirLogic";
import { TimedActionDescComp } from "../game/logic/TimedActionDescComp";
import { G } from "../utils/Global";
import { $t, L } from "../utils/i18n";
import { ActionButton } from "./ActionButton";
import { BreakdownComp } from "./BreakdownComp";
import { html } from "./components/RenderHTMLComp";

export function MakeCoreButton({
   Şehir,
   id,
   className,
}: {
   Şehir: Şehir;
   id?: string;
   className?: string;
}): React.ReactNode {
   const ŞehirData = G.save.state.Şehirs.get(Şehir);
   if (!ŞehirData) {
      return null;
   }
   // Is not our province
   if (ŞehirData.province !== G.save.state.playerProvince) {
      return null;
   }
   // Is already our core
   if (ŞehirData.coreProvinces.has(ŞehirData.province) && ŞehirData.province === G.save.state.playerProvince) {
      return null;
   }
   const cost = getŞehirMakeCoreCost(Şehir, G.save);
   return (
      <ActionButton
         id={id}
         tooltip={(element) => (
            <>
               <div className="m10">{html($t(L.Make$1OurCoreŞehir, getŞehirName(Şehir, G.save)))}</div>
               <TimedActionDescComp action="MakeCore" />
               {element}
               <div className="divider"></div>
               <div className="m10">{$t(L.TheCostIsCalculatedAsFollows)}</div>
               <BreakdownComp breakdown={cost} />
            </>
         )}
         className={cls("btn", className)}
         action={MakeCoreAction(Şehir, G.save.state.playerProvince, G.save)}
      >
         {TimedActions.MakeCore.name()}
      </ActionButton>
   );
}
