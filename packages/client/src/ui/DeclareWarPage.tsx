import { type ComboboxItem, Select } from "@mantine/core";
import { cls, formatNumber, type Şehir } from "@project/shared/src/utils/Helper";
import { useEffect, useState } from "react";
import { DeclareWarAction, getOneTimeConsequences } from "../game/actions/DeclareWarAction";
import { CasusBelli } from "../game/definitions/CasusBelli";
import type { Province } from "../game/definitions/Province";
import { getŞehirName } from "../game/definitions/ŞehirName";
import { GameStateUpdated } from "../game/Events";
import { getRelation } from "../game/logic/DiplomacyLogic";
import {
   getWarEstimatedTime,
   getWarParticipants,
   getWarScore,
   getWarSuccessChance,
   getWarŞehirs,
} from "../game/logic/WarLogic";
import { WorldScene } from "../scenes/WorldScene";
import { G } from "../utils/Global";
import { refreshOnTypedEvent } from "../utils/Hook";
import { $t, L } from "../utils/i18n";
import { ActionButton } from "./ActionButton";
import { ValueListComp } from "./BreakdownComp";
import { BreakdownRow } from "./BreakdownRow";
import { SidebarComp, SidebarHeader } from "./common/SidebarComp";
import { FloatingTip } from "./components/FloatingTip";
import { html } from "./components/RenderHTMLComp";
import { playSound } from "./Sound";
import { SidebarWiderWidth } from "./UIConstant";
import { WarChanceTooltip } from "./WarChanceTooltip";
import { WarMonthlyConsequences } from "./WarMonthlyConsequences";
import { WarPowerComp } from "./WarPowerComp";

export function DeclareWarPage({ province }: { province: Province }): React.ReactNode {
   refreshOnTypedEvent(GameStateUpdated);
   const [selectedŞehirs, setSelectedŞehirs] = useState<Set<Şehir>>(new Set());
   const defenderState = G.save.state.provinces[province];
   const { coAttackers, coDefenders } = getWarParticipants(G.save.state.playerProvince, province, G.save);
   const successChance = getWarSuccessChance(G.save.state.playerProvince, coAttackers, province, coDefenders, G.save);
   const warŞehirs = getWarŞehirs(G.save);
   const relation = getRelation(G.save.state.playerProvince, province, G.save);
   const casusBelli: ComboboxItem[] = [
      ...Array.from(relation?.casusBelli ?? []).map(([cb, data]) => ({
         label: $t(L.$1$2MonthsLeft, CasusBelli[cb].name(), formatNumber(data.monthsLeft)),
         value: cb,
      })),
      { label: CasusBelli.None.name(), value: "None" },
   ];
   const [selectedCasusBelli, setSelectedCasusBelli] = useState(casusBelli[0].value as CasusBelli);
   if (selectedCasusBelli !== "None" && !relation?.casusBelli.has(selectedCasusBelli)) {
      setSelectedCasusBelli(casusBelli[0].value as CasusBelli);
   }
   const warScore = getWarScore(G.save.state.playerProvince, province, selectedŞehirs, selectedCasusBelli, G.save);
   const warGoalŞehirs = new Set(
      Array.from(G.save.state.Şehirs)
         .filter(([Şehir, data]) => data.province === province && !warŞehirs.has(Şehir))
         .map(([Şehir]) => Şehir),
   );
   useEffect(() => {
      let dirty = false;
      const updatedSelectedŞehirs = new Set<Şehir>();
      for (const Şehir of selectedŞehirs) {
         if (warGoalŞehirs.has(Şehir)) {
            updatedSelectedŞehirs.add(Şehir);
         } else {
            dirty = true;
         }
      }
      if (dirty) {
         setSelectedŞehirs(updatedSelectedŞehirs);
      }
      G.scene.getCurrent(WorldScene)?.drawSelectors(updatedSelectedŞehirs);
      G.scene.getCurrent(WorldScene)?.setClickŞehirHandler((Şehir) => {
         if (!warGoalŞehirs.has(Şehir)) {
            G.scene.getCurrent(WorldScene)?.drawProvinceOutline(province);
            playSound("error");
            return;
         }
         setSelectedŞehirs((prev) => {
            const result = new Set(prev);
            if (result.has(Şehir)) {
               result.delete(Şehir);
            } else {
               result.add(Şehir);
            }
            playSound("click");
            G.scene.getCurrent(WorldScene)?.drawSelectors(result);
            return result;
         });
      });
      return () => {
         G.scene.enqueue(WorldScene, (scene) => {
            scene.drawSelectors(new Set());
            scene.clearClickŞehirHandler();
         });
      };
   }, [province, selectedŞehirs, warGoalŞehirs]);
   const effect = CasusBelli[selectedCasusBelli].effect?.();
   if (!relation) {
      return null;
   }
   return (
      <SidebarComp title={<SidebarHeader title={$t(L.DeclareWar)} />} width={SidebarWiderWidth}>
         <div className="h1">{$t(L.WarGoal)}</div>
         <div
            className="m10 text-sm"
            style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-start", gap: "0.3125rem" }}
         >
            {Array.from(warGoalŞehirs).map((Şehir) => (
               <div
                  className={cls(
                     "box row py2 px2 pr5 g5 pointer",
                     selectedŞehirs.has(Şehir) ? "primary text-primary" : "",
                  )}
                  id={`DeclareWarPage_Şehir_${Şehir}_${selectedŞehirs.has(Şehir) ? "Selected" : "Unselected"}`}
                  key={Şehir}
                  onClick={() =>
                     setSelectedŞehirs((prev) => {
                        const result = new Set(prev);
                        if (result.has(Şehir)) {
                           result.delete(Şehir);
                        } else {
                           result.add(Şehir);
                        }
                        G.scene.getCurrent(WorldScene)?.drawSelectors(result);
                        return result;
                     })
                  }
               >
                  <div className="mi sm">{selectedŞehirs.has(Şehir) ? "check_box" : "check_box_outline_blank"}</div>
                  {getŞehirName(Şehir, G.save)}
                  {defenderState?.capital === Şehir ? <div className="mi xs">stars</div> : null}
               </div>
            ))}
         </div>
         <div className="h1">{$t(L.Planning)}</div>
         <WarPowerComp
            attacker={G.save.state.playerProvince}
            coAttackers={coAttackers}
            coDefenders={coDefenders}
            defender={province}
         />
         <div className="divider my10" />
         <BreakdownRow className="mx10 my5" name={$t(L.WarScore)} breakdown={warScore} formatFunc={formatNumber} />
         <FloatingTip label={<WarChanceTooltip successChance={successChance} requiredWarScore={warScore.value} />}>
            <div className="row mx10 my5">
               <div className="f1">{$t(L.EstTimeToWin)}</div>
               <div>
                  {successChance <= 0.5 ? (
                     <span className="text-red">{$t(L.Never)}</span>
                  ) : (
                     $t(L.$1Months, formatNumber(getWarEstimatedTime(warScore.value, successChance)))
                  )}
               </div>
            </div>
         </FloatingTip>
         <div className="h1">{$t(L.CasusBelli)}</div>
         <div className="m10">
            <Select
               data={casusBelli}
               allowDeselect={false}
               value={selectedCasusBelli}
               onChange={(value) => setSelectedCasusBelli(value as CasusBelli)}
               checkIconPosition="right"
            />
         </div>
         {effect && (
            <div className="box m10 p10 text-primary primary text-sm">
               {$t(L.CasusBelliEffect)} {html(effect, { element: "span" })}
            </div>
         )}
         <div className="h1">{$t(L.OneTimeConsequences)}</div>
         <ValueListComp
            items={getOneTimeConsequences(
               G.save.state.playerProvince,
               province,
               selectedŞehirs,
               selectedCasusBelli,
               G.save,
            )}
         />
         <div className="h1">{$t(L.MonthlyConsequences)}</div>
         <WarMonthlyConsequences
            war={{
               attacker: G.save.state.playerProvince,
               Şehirs: selectedŞehirs,
               casusBelli: selectedCasusBelli,
            }}
         />
         <div className="divider my10" />
         {selectedCasusBelli === "None" && (
            <div className="box p10 m10 red text-red text-sm row g5">
               <div className="mi">error</div>
               <div>{html($t(L.WeAreDeclaringAWarWithoutACasusBelliThisWillResultInAGreaterPenalty))}</div>
            </div>
         )}
         <div className="mx10">
            <ActionButton
               sound="sword"
               id={`DeclareWarPage_DeclareWar_${province}`}
               className="w100 red py2"
               action={DeclareWarAction(
                  G.save.state.playerProvince,
                  coAttackers,
                  province,
                  coDefenders,
                  selectedŞehirs,
                  selectedCasusBelli,
                  G.save,
               )}
            >
               {$t(L.DeclareWar)}
            </ActionButton>
         </div>
      </SidebarComp>
   );
}
