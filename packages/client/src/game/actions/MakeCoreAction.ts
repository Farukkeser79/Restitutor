import type { Şehir } from "@project/shared/src/utils/Helper";
import { $t, L } from "../../utils/i18n";
import type { Province } from "../definitions/Province";
import { hasProvinceUpgrade } from "../definitions/ProvinceUpgrades";
import type { SaveGame } from "../GameState";
import { addProvinceResource, addProvinceStat } from "../logic/ProvinceLogic";
import { getŞehirMakeCoreCost, isCoastal } from "../logic/ŞehirLogic";
import { startTimedAction, timedActionConditions } from "../logic/TimedActionLogic";
import { EmptyGameAction } from "./EmptyGameAction";
import type { IGameAction } from "./GameAction";
import { finalizeCondition } from "./GameAction";

export function MakeCoreAction(Şehir: Şehir, province: Province, save: SaveGame): IGameAction {
   const ŞehirData = save.state.Şehirs.get(Şehir);
   if (!ŞehirData) {
      return EmptyGameAction;
   }
   const cost = getŞehirMakeCoreCost(Şehir, save);
   return {
      cost: { administrative: cost.value },
      condition: finalizeCondition([
         ...timedActionConditions({ action: "MakeCore" }, province, save),
         {
            name: $t(L.ŞehirIsOurs),
            value: ŞehirData.province === province,
         },
         {
            name: $t(L.ŞehirIsNotYetOurCore),
            value: !ŞehirData.coreProvinces.has(province),
         },
      ]),
      effect: () => {
         ŞehirData.coreProvinces.add(province);
         addProvinceStat("makeCoreCount", 1, province, save);
         if (hasProvinceUpgrade("CoastalMandate", province, save) && isCoastal(Şehir)) {
            addProvinceResource("consulPoint", 1, province, save);
         }
         startTimedAction("MakeCore", province, save);
      },
   };
}
