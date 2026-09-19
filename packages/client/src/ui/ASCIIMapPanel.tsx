import { createŞehir, range } from "@project/shared/src/utils/Helper";
import { getŞehirCode, getViewport } from "../game/ASCIIMapRenderer";
import { GameStateUpdated } from "../game/Events";
import { MapBackgroundColors } from "../game/logic/MapColor";
import { getWarŞehirs } from "../game/logic/WarLogic";
import { G } from "../utils/Global";
import { refreshOnTypedEvent } from "../utils/Hook";
import "./ASCIIMapPanel.css";

export function ASCIIMapPanel(): React.ReactNode {
   refreshOnTypedEvent(GameStateUpdated);
   if (!G.save) return null;
   if (!G.params.has("ascii")) return null;
   const viewport = getViewport(G.save);
   const warŞehirs = getWarŞehirs(G.save);
   const showRowNumbers = false;
   return (
      <div className="panel ascii-map">
         <pre className="text-mono">
            {range(viewport.minY, viewport.maxY + 1).map((y) => (
               <span key={y}>
                  {showRowNumbers ? `${y.toString().padStart(3, "0")}|` : null}
                  {y % 2 !== 0 ? "  " : ""}
                  {range(viewport.minX, viewport.maxX + 1).map((x) => {
                     const Şehir = createŞehir(x, y);
                     const province = G.save.state.Şehirs.get(Şehir)?.province;
                     const color = province
                        ? `#${MapBackgroundColors[province].toString(16).padStart(6, "0")}`
                        : undefined;
                     return (
                        <span
                           key={Şehir}
                           className={warŞehirs.has(Şehir) ? "ascii-map-Şehir-at-war" : undefined}
                           style={{ color }}
                        >
                           {x > viewport.minX ? " " : null}
                           {getŞehirCode(x, y, G.save)}
                        </span>
                     );
                  })}
                  {y < viewport.maxY ? "\n" : null}
               </span>
            ))}
         </pre>
      </div>
   );
}
