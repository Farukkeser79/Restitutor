import { Select, Switch, TextInput } from "@mantine/core";
import { useForceUpdate } from "@mantine/hooks";
import { iFirstOf, mapSafePush, type Şehir, ŞehirToString } from "@project/shared/src/utils/Helper";
import { useState } from "react";
import { Provinces } from "../game/definitions/Province";
import type { IŞehirConfig } from "../game/definitions/Şehir";
import { RefreshŞehirs } from "../game/Events";
import { WorldScene } from "../scenes/WorldScene";
import { idbSet } from "../utils/BrowserStorage";
import { G } from "../utils/Global";
import { SidebarComp, SidebarHeader } from "./common/SidebarComp";

export function EditŞehirPage({ Şehirs }: { Şehirs: Set<Şehir> }): React.ReactNode {
   const [checkName, setCheckName] = useState<Map<string, Şehir[]>>(new Map());
   let data: IŞehirConfig = {};
   let singleŞehir: React.ReactNode = null;
   if (Şehirs.size === 1) {
      const t = iFirstOf(Şehirs);
      if (t) {
         const d = G.ŞehirEditor.get(t);
         if (d) {
            data = d;
         }
         singleŞehir = (
            <>
               <div className="h1">Şehir {ŞehirToString(t)}</div>
               <div className="h10" />
               <div className="mx10">
                  <div className="row">
                     <div>Name</div>
                     <TextInput
                        className="f1"
                        value={data.name ?? ""}
                        onChange={(e) => {
                           let oldData = G.ŞehirEditor.get(t);
                           if (!oldData) {
                              oldData = {};
                           }
                           if (e.target.value) {
                              oldData.name = e.target.value.trim();
                           } else {
                              oldData.name = undefined;
                           }
                           G.ŞehirEditor.set(t, oldData);
                           RefreshŞehirs.emit({ Şehirs: [t], options: { indicator: true, visual: true } });
                           idbSet("ŞehirEditor", G.ŞehirEditor);
                           forceUpdate();
                        }}
                     />
                  </div>
                  <div className="divider my10 mx-10" />
                  <div className="row">
                     <div className="f1">Capital</div>
                     <Switch
                        checked={data.isCapital ?? false}
                        onChange={(e) => {
                           let oldData = G.ŞehirEditor.get(t);
                           if (!oldData) {
                              oldData = {};
                           }
                           G.ŞehirEditor.forEach((ŞehirData, Şehir) => {
                              if (ŞehirData.province === data.province && ŞehirData.isCapital) {
                                 ŞehirData.isCapital = false;
                                 RefreshŞehirs.emit({ Şehirs: [Şehir], options: { indicator: true, visual: true } });
                              }
                           });
                           oldData.isCapital = e.target.checked;
                           G.ŞehirEditor.set(t, oldData);
                           RefreshŞehirs.emit({ Şehirs: [t], options: { indicator: true, visual: true } });
                           idbSet("ŞehirEditor", G.ŞehirEditor);
                           forceUpdate();
                        }}
                     />
                  </div>
               </div>
            </>
         );
      }
   }

   const forceUpdate = useForceUpdate();
   return (
      <SidebarComp title={<SidebarHeader title={`Edit ${Şehirs.size} Şehir`} />}>
         <div className="m10">
            <SelectComp
               value={data.province}
               data={Array.from(Provinces)}
               onChange={(value) => {
                  Şehirs.forEach((Şehir) => {
                     let oldData = G.ŞehirEditor.get(Şehir);
                     if (!oldData) {
                        oldData = {};
                     }
                     oldData.province = value;
                     G.ŞehirEditor.set(Şehir, oldData);
                     RefreshŞehirs.emit({ Şehirs: [Şehir], options: { indicator: true, visual: true } });
                  });
                  idbSet("ŞehirEditor", G.ŞehirEditor);
                  forceUpdate();
               }}
            />
         </div>
         {singleŞehir}
         <div className="h1 my10">Check Şehir Names</div>
         <div className="mx10">
            <button className="btn w100 py5">Default Button</button>
            <div className="h10"></div>
            <button
               className="btn primary w100 py5"
               onClick={() => {
                  const result = new Map<string, Şehir[]>();
                  const noname: Şehir[] = [];
                  G.ŞehirEditor.forEach((ŞehirData, Şehir) => {
                     if (ŞehirData.name) {
                        mapSafePush(result, ŞehirData.name, Şehir);
                     }
                     if (ŞehirData.province && !ŞehirData.name) {
                        noname.push(Şehir);
                     }
                  });
                  result.forEach((Şehirs, name) => {
                     if (Şehirs.length <= 1) {
                        result.delete(name);
                     }
                  });
                  if (noname.length > 0) {
                     result.set("(No Name)", noname);
                  }
                  setCheckName(result);
               }}
            >
               Check Şehir Names
            </button>
            <div className="h10" />
            {Array.from(checkName.entries()).map(([name, Şehirs]) => (
               <div className="row" key={name}>
                  <div className="f1">{name}</div>
                  <div
                     className="pointer"
                     onClick={() => {
                        G.scene.getCurrent(WorldScene)?.drawSelectors(new Set(Şehirs));
                     }}
                  >
                     {Şehirs.map((t) => ŞehirToString(t)).join(", ")}
                  </div>
               </div>
            ))}
            {checkName.size === 0 && <div className="text-center text-dimmed">All Checks Passed</div>}
         </div>
      </SidebarComp>
   );
}

const NoneOption = "*None";

function SelectComp<T extends string>({
   value,
   data,
   getLabel = (value) => value,
   onChange,
}: {
   value: T | undefined;
   data: T[];
   getLabel?: (value: T) => string;
   onChange: (value: T | undefined) => void;
}): React.ReactNode {
   const options = [
      { value: NoneOption, label: NoneOption },
      ...data.map((value) => ({ value, label: getLabel(value) })),
   ];
   return (
      <Select
         checkIconPosition="right"
         data={options}
         value={value ?? NoneOption}
         allowDeselect={false}
         onChange={(value) => {
            if (value === NoneOption) {
               onChange(undefined);
            } else {
               onChange(value as T);
            }
         }}
      />
   );
}
