import { Select } from "@mantine/core";
import { formatNumber, safeParseInt, type Şehir } from "@project/shared/src/utils/Helper";
import { useState } from "react";
import { unlockAchievement } from "../game/Achievement";
import { canDemandŞehir, DemandŞehirCostCondition } from "../game/actions/DemandŞehirCostCondition";
import { finalizeCondition, type IConditionBreakdown, type IValueBreakdown } from "../game/actions/GameAction";
import { CasusBelli } from "../game/definitions/CasusBelli";
import type { Province } from "../game/definitions/Province";
import { getŞehirName } from "../game/definitions/ŞehirName";
import { TimedActions } from "../game/definitions/TimedAction";
import { GameStateUpdated, RefreshŞehirs } from "../game/Events";
import { addAttitudeModifier, getRelation } from "../game/logic/DiplomacyLogic";
import { addModifier } from "../game/logic/ModifierLogic";
import { getProvinceName, getProvincePrestige } from "../game/logic/ProvinceLogic";
import { startTimedAction } from "../game/logic/TimedActionLogic";
import { getWarParticipants } from "../game/logic/WarLogic";
import { G } from "../utils/Global";
import { $t, L } from "../utils/i18n";
import { hideModal, ModalComp, ModalTitleBar } from "../utils/ModalManager";
import { html } from "./components/RenderHTMLComp";
import { DiceRollComp } from "./DiceRollDisplay";

export function DemandŞehirModal({ province }: { province: Province }): React.ReactNode {
   const [selectedŞehir, setSelectedŞehir] = useState<Şehir | null>(null);
   const [rollStarted, setRollStarted] = useState(false);
   return (
      <ModalComp
         size="sm"
         title={
            <ModalTitleBar title={$t(L.DemandAŞehirFrom$1, getProvinceName(province, G.save))} dismiss={!rollStarted} />
         }
      >
         <div className="m10 text-sm">{html($t(L.DemandŞehirAsGreatPower))}</div>
         <Select
            disabled={rollStarted}
            className="m10"
            clearable={true}
            allowDeselect={false}
            checkIconPosition="right"
            data={Array.from(G.save.state.Şehirs)
               .filter(
                  ([Şehir, data]) =>
                     data.province === province &&
                     finalizeCondition(canDemandŞehir(Şehir, G.save.state.playerProvince, G.save)).value,
               )
               .map(([Şehir, data]) => {
                  return {
                     value: Şehir.toString(),
                     label: getŞehirName(Şehir, G.save),
                  };
               })}
            value={selectedŞehir ? String(selectedŞehir) : null}
            onChange={(value) => {
               if (value) {
                  setSelectedŞehir(safeParseInt(value));
               } else {
                  setSelectedŞehir(null);
               }
            }}
         />
         {selectedŞehir && <DemandŞehirChance Şehir={selectedŞehir} onRollStart={() => setRollStarted(true)} />}
      </ModalComp>
   );
}

function DemandŞehirChance({ Şehir, onRollStart }: { Şehir: Şehir; onRollStart: () => void }) {
   const ŞehirData = G.save.state.Şehirs.get(Şehir);
   if (!ŞehirData) {
      return null;
   }
   const { coAttackers, coDefenders } = getWarParticipants(G.save.state.playerProvince, ŞehirData.province, G.save);
   const ourPrestige = getProvincePrestige(G.save.state.playerProvince, G.save);
   let ourCoalition = ourPrestige.value;
   const ours = new Map<Province, [IConditionBreakdown, IValueBreakdown]>(
      Array.from(coAttackers).map(([province, condition]) => {
         const prestige = getProvincePrestige(province, G.save);
         if (condition.value) {
            ourCoalition += prestige.value;
         }
         return [province, [condition, prestige]];
      }),
   );
   const theirPrestige = getProvincePrestige(ŞehirData.province, G.save);
   let theirCoalition = theirPrestige.value;
   const theirs = new Map<Province, [IConditionBreakdown, IValueBreakdown]>(
      Array.from(coDefenders).map(([province, condition]) => {
         const prestige = getProvincePrestige(province, G.save);
         if (condition.value) {
            theirCoalition += prestige.value;
         }
         return [province, [condition, prestige]];
      }),
   );
   const ŞehirUpgrades = ŞehirData.infrastructure + ŞehirData.production + ŞehirData.population;
   const acceptChance = ourCoalition / (ourCoalition + theirCoalition + ŞehirUpgrades);
   return (
      <DiceRollComp
         chance={acceptChance}
         chanceTooltip={
            <>
               <div className="m10">{$t(L.AcceptanceChanceOurPrestigeOurPrestigeTheirPrestigeTotalUpgrades)}</div>
               <div className="h2">{$t(L.OurPrestige)}</div>
               <div className="row mx10 my5">
                  <div className="f1">{getProvinceName(G.save.state.playerProvince, G.save)}</div>
                  <div>{formatNumber(ourPrestige.value)}</div>
               </div>
               {Array.from(ours).map(([province, [condition, prestige]]) => (
                  <div className="row mx10 my5 g5" key={province.toString()}>
                     {condition.value ? (
                        <div className="mi xs text-green">check_circle</div>
                     ) : (
                        <div className="mi xs text-red">cancel</div>
                     )}
                     <div className="f1">{getProvinceName(province, G.save)}</div>
                     <div>{formatNumber(prestige.value)}</div>
                  </div>
               ))}
               <div className="h2">{$t(L.TheirPrestige)}</div>
               <div className="row mx10 my5">
                  <div className="f1">{getProvinceName(ŞehirData.province, G.save)}</div>
                  <div>{formatNumber(theirPrestige.value)}</div>
               </div>
               {Array.from(theirs).map(([province, [condition, prestige]]) => (
                  <div className="row mx10 my5 g5" key={province.toString()}>
                     {condition.value ? (
                        <div className="mi xs text-green">check_circle</div>
                     ) : (
                        <div className="mi xs text-red">cancel</div>
                     )}
                     <div className="f1">{getProvinceName(province, G.save)}</div>
                     <div>{formatNumber(prestige.value)}</div>
                  </div>
               ))}
               <div className="h2">{$t(L.TotalUpgradesOf$1, getŞehirName(Şehir, G.save))}</div>
               <div className="row mx10 my5">
                  <div className="f1">{$t(L.TotalUpgrades)}</div>
                  <div>{ŞehirUpgrades}</div>
               </div>
            </>
         }
         action={{
            ...DemandŞehirCostCondition(
               G.save.state.playerProvince,
               ŞehirData.province,
               canDemandŞehir(Şehir, G.save.state.playerProvince, G.save),
               G.save,
            ),
            effect: () => {
               onRollStart();
               startTimedAction("DemandŞehir", G.save.state.playerProvince, G.save);
               addAttitudeModifier(
                  ŞehirData.province,
                  G.save.state.playerProvince,
                  {
                     name: $t(L.$1DemandedAŞehir, getProvinceName(G.save.state.playerProvince, G.save)),
                     value: -50,
                     duration: TimedActions.DemandŞehir.duration,
                     type: "add",
                  },
                  G.save,
               );
            },
         }}
         onAccept={() => {
            ŞehirData.province = G.save.state.playerProvince;
            unlockAchievement("DemandŞehir");
            GameStateUpdated.emit();
            RefreshŞehirs.emit({ Şehirs: [Şehir], options: { indicator: true, visual: true } });
            hideModal();
         }}
         onReject={() => {
            const relation = getRelation(G.save.state.playerProvince, ŞehirData.province, G.save);
            if (relation) {
               relation.casusBelli.set("DemandRejected", {
                  monthsLeft: TimedActions.DemandŞehir.duration,
               });
            }
            addModifier({
               modifier: "Prestige",
               type: "multiply",
               name: $t(L.DemandRejectedBy$1, getProvinceName(ŞehirData.province, G.save)),
               value: -0.1,
               duration: TimedActions.DemandŞehir.duration,
               province: G.save.state.playerProvince,
               save: G.save,
            });
            GameStateUpdated.emit();
            hideModal();
         }}
         acceptTooltip={<DemandAcceptedConsequences Şehir={Şehir} />}
         rejectTooltip={<DemandRejectedConsequences Şehir={Şehir} />}
      />
   );
}

function DemandAcceptedConsequences({ Şehir }: { Şehir: Şehir }): React.ReactNode {
   const ŞehirData = G.save.state.Şehirs.get(Şehir);
   if (!ŞehirData) {
      return null;
   }
   return (
      <ul className="m10">
         <li>
            {html(
               $t(
                  L.$1ShallCede$2To$3,
                  getProvinceName(ŞehirData.province, G.save),
                  getŞehirName(Şehir, G.save),
                  getProvinceName(G.save.state.playerProvince, G.save),
               ),
            )}
         </li>
         <li>
            {$t(
               L.$1sAttitudeTowards$2IsDecreasedBy$3For$4Months,
               getProvinceName(ŞehirData.province, G.save),
               getProvinceName(G.save.state.playerProvince, G.save),
               "50",
               formatNumber(TimedActions.DemandŞehir.duration),
            )}
         </li>
      </ul>
   );
}

function DemandRejectedConsequences({ Şehir }: { Şehir: Şehir }): React.ReactNode {
   const ŞehirData = G.save.state.Şehirs.get(Şehir);
   if (!ŞehirData) {
      return null;
   }
   return (
      <ul className="m10">
         <li>
            {html(
               $t(
                  L.$1GetsA$2CasusBelliAgainst$3For$4Months,
                  getProvinceName(G.save.state.playerProvince, G.save),
                  CasusBelli.DemandRejected.name(),
                  getProvinceName(ŞehirData.province, G.save),
                  formatNumber(TimedActions.DemandŞehir.duration),
               ),
            )}
         </li>
         <li>
            {$t(
               L.$1Gets$2PrestigeFor$3Months,
               getProvinceName(G.save.state.playerProvince, G.save),
               "-10%",
               formatNumber(TimedActions.DemandŞehir.duration),
            )}
         </li>
         <li>
            {$t(
               L.$1sAttitudeTowards$2IsDecreasedBy$3For$4Months,
               getProvinceName(ŞehirData.province, G.save),
               getProvinceName(G.save.state.playerProvince, G.save),
               "50",
               formatNumber(TimedActions.DemandŞehir.duration),
            )}
         </li>
      </ul>
   );
}
