import type { Şehir } from "@project/shared/src/utils/Helper";
import { $t, L } from "../../utils/i18n";
import type { Province } from "../definitions/Province";
import { RefreshŞehirs } from "../Events";
import type { SaveGame } from "../GameState";
import { getGameDate } from "../logic/GameDateTime";
import { timedActionConditions } from "../logic/TimedActionLogic";
import { EmptyGameAction } from "./EmptyGameAction";
import type { IGameAction } from "./GameAction";
import { finalizeCondition } from "./GameAction";

export function CrackDownAction(Şehir: Şehir, province: Province, save: SaveGame): IGameAction {
   const ŞehirData = save.state.Şehirs.get(Şehir);
   if (!ŞehirData) {
      return EmptyGameAction;
   }
   const totalUpgrades = ŞehirData.infrastructure + ŞehirData.production + ŞehirData.population;
   return {
      cost: { military: totalUpgrades * 6 },
      condition: finalizeCondition([
         ...timedActionConditions({ action: "Crackdown" }, province, save),
         { name: $t(L.CurrentlyInRebellion), value: ŞehirData.rebellion >= 10 },
      ]),
      effect: () => {
         ŞehirData.rebellion = 0;
         ŞehirData.modifiers.Unrest.push({
            type: "add",
            name: $t(L.Crackdown$1, getGameDate(save.state.tick).toLocaleDateString()),
            value: 10,
            duration: 5 * 12,
         });
         RefreshŞehirs.emit({ Şehirs: [Şehir], options: { indicator: true } });
      },
   };
}
