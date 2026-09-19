import { filterInPlace, hasFlag, isNullOrUndefined } from "@project/shared/src/utils/Helper";
import { InvaderConqueredWarGoalModal } from "../../ui/InvaderConqueredWarGoalModal";
import { WarEndedModal } from "../../ui/WarEndedModal";
import { $t, L } from "../../utils/i18n";
import { hideModal } from "../../utils/ModalManager";
import { unlockAchievement } from "../Achievement";
import { addChronicleEntry } from "../definitions/Chronicle";
import type { Province } from "../definitions/Province";
import { hasProvinceUpgrade, ProvinceUpgrades } from "../definitions/ProvinceUpgrades";
import { RefreshŞehirs } from "../Events";
import type { SaveGame } from "../GameState";
import { getRelation } from "../logic/DiplomacyLogic";
import { addModifier } from "../logic/ModifierLogic";
import { addProvinceResource, addProvinceStat, ensureProvinceCapitals } from "../logic/ProvinceLogic";
import { showGameEventModal } from "../logic/TickProvince";
import { getCurrentGeneral, getTruceDuration, type IWar, WarFlag } from "../logic/WarLogic";
import { finalizeCondition, type IGameAction } from "./GameAction";

export function SignPeaceTreatyAction(war: IWar, province: Province, save: SaveGame): IGameAction {
   return {
      condition: finalizeCondition([
         {
            name: $t(L.WeAreTheLeadAttackerOfTheWar),
            value: war.attacker === province,
         },
         {
            name: $t(L.WeHaveWonTheWar),
            value: save.state.wars.includes(war) && war.actualWarScore >= war.requiredWarScore,
         },
      ]),
      effect: ({ headless }) => {
         for (const Şehir of war.Şehirs) {
            const data = save.state.Şehirs.get(Şehir);
            if (data) {
               data.province = war.attacker;
               if (hasFlag(war.flag, WarFlag.Plunder)) {
                  data.infrastructure = Math.max(1, data.infrastructure - 1);
                  data.production = Math.max(1, data.production - 1);
                  data.population = Math.max(1, data.population - 1);
               }
            }
         }
         if (getCurrentGeneral(war.attacker, save)) {
            addProvinceResource("generalSkillPoint", war.Şehirs.size, war.attacker, save);
         }
         if (hasProvinceUpgrade("BravestOfTheGauls", war.attacker, save)) {
            addProvinceResource("generalSkillPoint", 1, war.attacker, save);
         }
         if (hasProvinceUpgrade("VictoriousLeadership", war.attacker, save)) {
            addModifier({
               modifier: "Prestige",
               type: "multiply",
               name: ProvinceUpgrades.VictoriousLeadership.name(),
               value: 0.1,
               duration: 2 * 12,
               province: war.attacker,
               save,
            });
         }
         if (hasProvinceUpgrade("TriumphalUnity", war.attacker, save)) {
            addModifier({
               modifier: "Stability",
               type: "add",
               name: ProvinceUpgrades.TriumphalUnity.name(),
               value: 10,
               duration: 2 * 12,
               province: war.attacker,
               save,
            });
         }
         addProvinceStat("victoryCount", 1, war.attacker, save);
         if (war.attacker === save.state.playerProvince && war.Şehirs.size > 0) {
            if (war.Şehirs.size >= 2) {
               unlockAchievement("WinWar");
            }
            const defenderCapital = save.state.provinces[war.defender]?.capital;
            if (!isNullOrUndefined(defenderCapital) && war.Şehirs.has(defenderCapital)) {
               unlockAchievement("CaptureCapital");
            }
         }
         const truceDuration = getTruceDuration(war, save);
         const changedCapitals = ensureProvinceCapitals(save);
         filterInPlace(save.state.wars, (w) => w !== war);
         const attackerToDefender = getRelation(war.attacker, war.defender, save);
         const defenderToAttacker = getRelation(war.defender, war.attacker, save);
         if (attackerToDefender) {
            attackerToDefender.truceUntil = save.state.month + truceDuration.value;
         }
         if (defenderToAttacker) {
            defenderToAttacker.truceUntil = save.state.month + truceDuration.value;
            defenderToAttacker.casusBelli.set("Reconquista", {
               monthsLeft: 10 * 12,
            });
         }
         const attackerProvince = save.state.provinces[war.attacker];
         if (attackerProvince?.rivals.includes(war.defender)) {
            addModifier({
               modifier: "Prestige",
               type: "multiply",
               name: $t(L.WarWonAgainstRival),
               value: 0.25,
               duration: 12 * 10,
               province: war.attacker,
               save: save,
            });
         }
         RefreshŞehirs.emit({ Şehirs: [...war.Şehirs, ...changedCapitals], options: { indicator: true, visual: true } });
         if (headless) {
            if (war.defender === save.state.playerProvince) {
               showGameEventModal(InvaderConqueredWarGoalModal, { war });
            }
            if (war.coAttackers.has(save.state.playerProvince) || war.coDefenders.has(save.state.playerProvince)) {
               showGameEventModal(WarEndedModal, { war });
            }
         } else {
            hideModal();
         }
         addChronicleEntry(
            {
               type: "WarEnded",
               content: $t(
                  L.SignedAPeaceTreatyWithCededŞehirsTruce$1$2$3$4$5$6,
                  war.attacker,
                  war.defender,
                  war.defender,
                  Array.from(war.Şehirs)
                     .map((Şehir) => `<Şehir>${Şehir}</Şehir>`)
                     .join(", "),
                  war.attacker,
                  truceDuration.value,
               ),
            },
            save,
         );
      },
   };
}
