"use client";

import { useState } from "react";
import { Users, Wrench } from "lucide-react";
import type { AdminTechnician, AdminEquipmentType } from "./actions";
import { TechnicianManager } from "./TechnicianManager";
import { EquipmentTypeManager } from "./EquipmentTypeManager";

export function ConfigTab({ technicians, equipmentTypes }: { technicians: AdminTechnician[]; equipmentTypes: AdminEquipmentType[] }) {
  const [tab, setTab] = useState<"tecnicos" | "tipos">("tecnicos");

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-fg">Configuración</h2>
      <p className="mt-1 text-sm text-fg-muted">Administra técnicos y tipos de equipo</p>

      <div className="mt-5 inline-flex items-center gap-1 rounded-xl border-2 border-border-strong bg-bg-alt p-1">
        <button
          type="button"
          onClick={() => setTab("tecnicos")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
            tab === "tecnicos" ? "bg-accent text-accent-fg shadow-sm" : "text-fg-muted hover:text-accent"
          }`}
        >
          <Users size={13} /> Técnicos
        </button>
        <button
          type="button"
          onClick={() => setTab("tipos")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
            tab === "tipos" ? "bg-accent text-accent-fg shadow-sm" : "text-fg-muted hover:text-accent"
          }`}
        >
          <Wrench size={13} /> Tipos de equipo
        </button>
      </div>

      <div className="mt-4">
        {tab === "tecnicos" ? <TechnicianManager technicians={technicians} /> : <EquipmentTypeManager types={equipmentTypes} />}
      </div>
    </div>
  );
}
