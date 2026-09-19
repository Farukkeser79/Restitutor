import { formatNumber } from "@project/shared/src/utils/Helper";
import { CasusBelli } from "../game/definitions/CasusBelli";
import { getŞehirName } from "../game/definitions/ŞehirName";
import { getTruceDuration, type IWar } from "../game/logic/WarLogic";
import { G } from "../utils/Global";
import { $t, L } from "../utils/i18n";
import { BreakdownComp } from "./BreakdownComp";
import { html } from "./components/RenderHTMLComp";

export function PeaceTreatyTooltip({ war }: { war: IWar }): React.ReactNode {
   const ŞehirNames = Array.from(war.Şehirs)
      .map((Şehir) => getŞehirName(Şehir, G.save))
      .join(", ");
   const truceDuration = getTruceDuration(war, G.save);
   return (
      <>
         <ul className="m10">
            <li>{html($t(L.$1ShallCede$2To$3, war.defender, ŞehirNames, war.attacker))}</li>
            <li>
               {$t(
                  L.A$1MonthTruceShallBeEnactedBetween$2And$3,
                  formatNumber(truceDuration.value),
                  war.attacker,
                  war.defender,
               )}
            </li>
            <li>
               {html(
                  $t(
                     L.$1GetsA$2CasusBelliAgainst$3For$4Years,
                     war.defender,
                     CasusBelli.Reconquista.name(),
                     war.attacker,
                     "10",
                  ),
               )}
            </li>
         </ul>
         <div className="h2">{$t(L.TruceDuration)}</div>
         <BreakdownComp breakdown={truceDuration} />
      </>
   );
}
