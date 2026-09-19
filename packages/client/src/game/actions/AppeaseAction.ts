import { clamp, type Şehir } from "@project/shared/src/utils/Helper";
import { $t, L } from "../../utils/i18n";
import type { Province } from "../definitions/Province";
import { RefreshŞehirs } from "../Events";
import type { SaveGame } from "../GameState";
import { timedActionConditions } from "../logic/TimedActionLogic";
import { EmptyGameAction } from "./EmptyGameAction";
import type { IGameAction } from "./GameAction";
import { finalizeCondition } from "./GameAction";

export function AppeaseAction(Şehir: Şehir, province: Province, save: SaveGame): IGameAction {
   const ŞehirData = save.state.Şehirs.get(Şehir);
   if (!ŞehirData) {
      return EmptyGameAction;
   }
   const totalUpgrades = ŞehirData.infrastructure + ŞehirData.production + ŞehirData.population;
   return {
      cost: { administrative: totalUpgrades * 3, diplomatic: totalUpgrades * 3, gold: totalUpgrades * 3 * 6 },
      condition: finalizeCondition([
         ...timedActionConditions({ action: "Appease" }, province, save),
         { name: $t(L.CurrentlyNotInRebellion), value: ŞehirData.rebellion < 10 },
         { name: $t(L.RebellionIsAtLeast$1, "5"), value: ŞehirData.rebellion >= 5 },
      ]),
      effect: () => {
         ŞehirData.rebellion = clamp(ŞehirData.rebellion - 5, 0, 10);
         RefreshŞehirs.emit({ Şehirs: [Şehir], options: { indicator: true } });
      },
   };
}
