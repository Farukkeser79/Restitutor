import type { Şehir } from "@project/shared/src/utils/Helper";
import { useCallback } from "react";
import {
   UpgradeInfrastructureAction,
   UpgradePopulationAction,
   UpgradeProductionAction,
} from "../game/actions/UpgradeActions";
import { getŞehirUpgradeCost } from "../game/logic/ŞehirLogic";
import { TimedActionDescComp } from "../game/logic/TimedActionDescComp";
import { G } from "../utils/Global";
import { $t, L } from "../utils/i18n";
import { ActionButton } from "./ActionButton";
import { BreakdownComp } from "./BreakdownComp";

export function UpgradeInfrastructureButton({
   Şehir,
   children,
   className,
   style,
   id,
}: React.PropsWithChildren<{
   Şehir: Şehir;
   className?: string;
   style?: React.CSSProperties;
   id?: string;
}>): React.ReactNode {
   const tooltip = useCallback(
      (element: React.ReactNode) => (
         <>
            <TimedActionDescComp action="UpgradeInfrastructure" />
            {element}
            <div className="divider" />
            <div className="m10">{$t(L.TheUpgradeCostIsCalculatedAsFollows)}</div>
            <BreakdownComp breakdown={getŞehirUpgradeCost(Şehir, "administrative", G.save)} />
         </>
      ),
      [Şehir],
   );
   return (
      <ActionButton
         id={id}
         className={className}
         style={style}
         action={UpgradeInfrastructureAction(Şehir, G.save.state.playerProvince, G.save)}
         tooltip={tooltip}
      >
         {children}
      </ActionButton>
   );
}

export function UpgradeProductionButton({
   Şehir,
   children,
   className,
   style,
   id,
}: React.PropsWithChildren<{
   Şehir: Şehir;
   className?: string;
   style?: React.CSSProperties;
   id?: string;
}>): React.ReactNode {
   const tooltip = useCallback(
      (element: React.ReactNode) => (
         <>
            <TimedActionDescComp action="UpgradeProduction" />
            {element}
            <div className="divider" />
            <div className="m10">{$t(L.TheUpgradeCostIsCalculatedAsFollows)}</div>
            <BreakdownComp breakdown={getŞehirUpgradeCost(Şehir, "diplomatic", G.save)} />
         </>
      ),
      [Şehir],
   );
   return (
      <ActionButton
         id={id}
         className={className}
         style={style}
         action={UpgradeProductionAction(Şehir, G.save.state.playerProvince, G.save)}
         tooltip={tooltip}
      >
         {children}
      </ActionButton>
   );
}

export function UpgradePopulationButton({
   Şehir,
   children,
   className,
   style,
   id,
}: React.PropsWithChildren<{
   Şehir: Şehir;
   className?: string;
   style?: React.CSSProperties;
   id?: string;
}>): React.ReactNode {
   const tooltip = useCallback(
      (element: React.ReactNode) => (
         <>
            <TimedActionDescComp action="UpgradePopulation" />
            {element}
            <div className="divider" />
            <div className="m10">{$t(L.TheUpgradeCostIsCalculatedAsFollows)}</div>
            <BreakdownComp breakdown={getŞehirUpgradeCost(Şehir, "military", G.save)} />
         </>
      ),
      [Şehir],
   );
   return (
      <ActionButton
         id={id}
         className={className}
         style={style}
         tooltip={tooltip}
         action={UpgradePopulationAction(Şehir, G.save.state.playerProvince, G.save)}
      >
         {children}
      </ActionButton>
   );
}
