"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

type ServerAction = (formData: FormData) => void | Promise<void>;

type VehicleLoginFormProps = {
  action: ServerAction;
};

type VehicleRegisterFormProps = {
  action: ServerAction;
  brands: string[];
  commercialLinesByBrand: Record<string, string[]>;
  cargoBodyTypesByBrand: Record<string, string[]>;
};

type VehicleEditFormProps = {
  action: ServerAction;
  vehicleId: string;
  brands: string[];
  commercialLinesByBrand: Record<string, string[]>;
  cargoBodyTypesByBrand: Record<string, string[]>;
  initialPlate: string;
  initialDriverCc: string;
  initialDriverName: string;
  initialBrand: string;
  initialCommercialLine: string;
  initialCargoBodyType: string;
};

function SubmitButton({
  idleText,
  pendingText,
  fullWidth = false,
}: {
  idleText: string;
  pendingText: string;
  fullWidth?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`btn-glass btn-glass-primary mt-4 px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${fullWidth ? "w-full" : ""}`}
    >
      {pending ? pendingText : idleText}
    </button>
  );
}

export function VehicleLoginForm({ action }: VehicleLoginFormProps) {
  return (
    <form
      action={action}
      className="mt-6 max-w-xl rounded-2xl border border-white/50 bg-white/75 p-5 shadow-[0_18px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl"
      noValidate
    >
      <h2 className="text-lg font-semibold">Iniciar sesion</h2>
      <p className="mt-1 text-sm text-slate-600">
        Usa exactamente la misma placa y cedula con la que fue creado el usuario.
      </p>

      <div className="mt-4 grid gap-3">
        <div className="grid gap-1.5">
          <label htmlFor="login-plate" className="text-sm font-medium text-slate-800">
            Placa del vehiculo
          </label>
          <input
            id="login-plate"
            required
            name="plate"
            autoComplete="off"
            maxLength={8}
            placeholder="Ejemplo: ABC123"
            className="field-glass rounded-xl px-3 py-2.5 text-sm uppercase"
          />
          <p className="text-xs text-slate-500">Sin espacios. Puedes usar letras, numeros o guion.</p>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="login-driverCc" className="text-sm font-medium text-slate-800">
            Cedula del conductor
          </label>
          <input
            id="login-driverCc"
            required
            name="driverCc"
            inputMode="numeric"
            autoComplete="off"
            maxLength={12}
            placeholder="Solo numeros"
            className="field-glass rounded-xl px-3 py-2.5 text-sm"
          />
          <p className="text-xs text-slate-500">No incluyas puntos ni espacios.</p>
        </div>
      </div>

      <SubmitButton
        fullWidth
        idleText="Entrar al panel"
        pendingText="Validando acceso..."
      />
    </form>
  );
}

export function VehicleRegisterForm({
  action,
  brands,
  commercialLinesByBrand,
  cargoBodyTypesByBrand,
}: VehicleRegisterFormProps) {
  const [selectedBrand, setSelectedBrand] = useState("");

  const availableCommercialLines = selectedBrand
    ? commercialLinesByBrand[selectedBrand] ?? []
    : [];
  const availableCargoBodyTypes = selectedBrand
    ? cargoBodyTypesByBrand[selectedBrand] ?? []
    : [];

  return (
    <form action={action} className="mt-4 grid gap-3" noValidate>
      <div className="grid gap-1.5">
        <label htmlFor="register-driverName" className="text-sm font-medium text-slate-800">
          Nombre completo del conductor
        </label>
        <input
          id="register-driverName"
          required
          name="driverName"
          maxLength={80}
          placeholder="Ejemplo: Carlos Perez"
          className="field-glass rounded-xl px-3 py-2.5 text-sm"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="register-plate" className="text-sm font-medium text-slate-800">
          Placa del vehiculo
        </label>
        <input
          id="register-plate"
          required
          name="plate"
          maxLength={8}
          placeholder="Ejemplo: ABC123"
          className="field-glass rounded-xl px-3 py-2.5 text-sm uppercase"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="register-driverCc" className="text-sm font-medium text-slate-800">
          Cedula del conductor
        </label>
        <input
          id="register-driverCc"
          required
          name="driverCc"
          inputMode="numeric"
          maxLength={12}
          placeholder="Solo numeros"
          className="field-glass rounded-xl px-3 py-2.5 text-sm"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="register-model" className="text-sm font-medium text-slate-800">
          Marca del vehiculo de carga
        </label>
        <select
          id="register-model"
          required
          name="model"
          defaultValue=""
          onChange={(event) => {
            setSelectedBrand(event.target.value);
          }}
          className="field-glass rounded-xl px-3 py-2.5 text-sm"
        >
          <option value="" disabled>
            Selecciona una marca
          </option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="register-commercial-line" className="text-sm font-medium text-slate-800">
          Linea comercial del vehiculo
        </label>
        <select
          id="register-commercial-line"
          required
          name="commercialLine"
          defaultValue=""
          disabled={!selectedBrand}
          className="field-glass rounded-xl px-3 py-2.5 text-sm"
        >
          <option value="" disabled>
            {selectedBrand ? "Selecciona la linea comercial" : "Primero selecciona la marca"}
          </option>
          {availableCommercialLines.map((line) => (
            <option key={`${selectedBrand}-commercial-${line}`} value={line}>
              {line}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">
          Ejemplos: NHR, NPR, FRR. Se filtra por la marca seleccionada.
        </p>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="register-cargo-body-type" className="text-sm font-medium text-slate-800">
          Tipo de carroceria de carga
        </label>
        <select
          id="register-cargo-body-type"
          required
          name="cargoBodyType"
          defaultValue=""
          disabled={!selectedBrand}
          className="field-glass rounded-xl px-3 py-2.5 text-sm"
        >
          <option value="" disabled>
            {selectedBrand ? "Selecciona el tipo de carroceria" : "Primero selecciona la marca"}
          </option>
          {availableCargoBodyTypes.map((bodyType) => (
            <option key={`${selectedBrand}-body-${bodyType}`} value={bodyType}>
              {bodyType}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">
          Ejemplos: turbo, furgon seco, furgon refrigerado, estacado, cisterna.
        </p>
      </div>

      <p className="text-xs text-slate-500">
        Este registro crea o actualiza el acceso del conductor con la misma placa.
      </p>

      <SubmitButton idleText="Crear usuario" pendingText="Guardando datos..." />
    </form>
  );
}

export function VehicleEditForm({
  action,
  vehicleId,
  brands,
  commercialLinesByBrand,
  cargoBodyTypesByBrand,
  initialPlate,
  initialDriverCc,
  initialDriverName,
  initialBrand,
  initialCommercialLine,
  initialCargoBodyType,
}: VehicleEditFormProps) {
  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [selectedCommercialLine, setSelectedCommercialLine] = useState(initialCommercialLine);
  const [selectedCargoBodyType, setSelectedCargoBodyType] = useState(initialCargoBodyType);

  const availableCommercialLines = selectedBrand
    ? commercialLinesByBrand[selectedBrand] ?? []
    : [];
  const availableCargoBodyTypes = selectedBrand
    ? cargoBodyTypesByBrand[selectedBrand] ?? []
    : [];

  return (
    <form action={action} className="inline-action-panel action-modal-panel" noValidate>
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <div className="mb-3 flex items-center justify-end">
        <a href="/admin" className="btn-glass btn-glass-neutral px-3 py-1 text-xs font-semibold">
          Cerrar
        </a>
      </div>
      <div className="mb-3 border-b border-line pb-3">
        <p className="text-sm font-semibold text-slate-900">Editar usuario</p>
        <p className="text-xs text-slate-500">Actualiza los datos de acceso del conductor.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700">
          Placa
          <input
            required
            name="plate"
            defaultValue={initialPlate}
            className="field-glass mt-1 w-full rounded-lg px-3 py-2 text-sm uppercase"
          />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Cedula
          <input
            required
            name="driverCc"
            defaultValue={initialDriverCc}
            className="field-glass mt-1 w-full rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
          Vehiculo (marca)
          <select
            required
            name="model"
            value={selectedBrand}
            onChange={(event) => {
              setSelectedBrand(event.target.value);
              setSelectedCommercialLine("");
              setSelectedCargoBodyType("");
            }}
            className="field-glass mt-1 w-full rounded-lg px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Selecciona marca
            </option>
            {brands.map((brand) => (
              <option key={`edit-brand-${vehicleId}-${brand}`} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Linea comercial
          <select
            required
            name="commercialLine"
            value={selectedCommercialLine}
            onChange={(event) => setSelectedCommercialLine(event.target.value)}
            disabled={!selectedBrand}
            className="field-glass mt-1 w-full rounded-lg px-3 py-2 text-sm"
          >
            <option value="" disabled>
              {selectedBrand ? "Selecciona la linea comercial" : "Primero selecciona la marca"}
            </option>
            {availableCommercialLines.map((line) => (
              <option key={`edit-line-${vehicleId}-${line}`} value={line}>
                {line}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Tipo de carroceria
          <select
            required
            name="cargoBodyType"
            value={selectedCargoBodyType}
            onChange={(event) => setSelectedCargoBodyType(event.target.value)}
            disabled={!selectedBrand}
            className="field-glass mt-1 w-full rounded-lg px-3 py-2 text-sm"
          >
            <option value="" disabled>
              {selectedBrand ? "Selecciona el tipo de carroceria" : "Primero selecciona la marca"}
            </option>
            {availableCargoBodyTypes.map((bodyType) => (
              <option key={`edit-body-${vehicleId}-${bodyType}`} value={bodyType}>
                {bodyType}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
          Nombre del conductor
          <input
            required
            name="driverName"
            defaultValue={initialDriverName}
            className="field-glass mt-1 w-full rounded-lg px-3 py-2 text-sm"
          />
        </label>
      </div>
      <SubmitButton fullWidth idleText="Guardar cambios" pendingText="Actualizando..." />
    </form>
  );
}
