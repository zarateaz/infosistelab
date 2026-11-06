import { getMfaStatus } from "./actions";
import { MfaPanel } from "./MfaPanel";

export default async function SeguridadPage() {
  const status = await getMfaStatus();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Seguridad</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Verificación en dos pasos (MFA) para tu propia cuenta de administrador.
      </p>

      <div className="mt-8 max-w-xl">
        <MfaPanel initialEnabled={status.enabled} />
      </div>
    </div>
  );
}
