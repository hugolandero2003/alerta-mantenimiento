"use client";

import { useState } from "react";

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

type FuelEstimateResult = {
  routeKm: number;
  totalCostCop: number;
  costPerKmCop: number;
  origin: string;
  destination: string;
  providerLabel: string;
};

export default function FuelCostCard() {
  const [expanded, setExpanded] = useState(false);
  const [fuelType, setFuelType] = useState("ACPM");
  const [tankValue, setTankValue] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FuelEstimateResult | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const tankValueNumber = Number(tankValue);

    if (!origin.trim() || !destination.trim() || tankValueNumber <= 0) {
      setError("Ingresa origen, destino y el valor tanqueado para calcular.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/fuel/estimate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          origin,
          destination,
          tankValue: tankValueNumber,
          fuelType,
        }),
      });

      const payload = (await response.json()) as
        | { ok: true; result: FuelEstimateResult }
        | { ok: false; error: string };

      if (!response.ok || !payload.ok) {
        setResult(null);
        setError("error" in payload ? payload.error : "No fue posible calcular la ruta.");
        return;
      }

      setResult(payload.result);
    } catch {
      setResult(null);
      setError("No fue posible conectar con el servicio de Google Maps.");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setFuelType("ACPM");
    setTankValue("");
    setOrigin("");
    setDestination("");
    setError(null);
    setResult(null);
    setLoading(false);
  }

  return (
    <section className="panel-water-card rounded-3xl p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Opcional</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Calcular consumo de combustible</h2>
          <p className="mt-1 text-sm text-slate-600">
            Abre esta tarjeta solo si quieres estimar el costo por kilómetro y el gasto total de una ruta.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="btn-glass btn-glass-neutral px-4 py-2 text-sm font-semibold"
        >
          {expanded ? "Ocultar" : "Mostrar"}
        </button>
      </div>

      {expanded && (
        <form className="mt-5" onSubmit={handleSubmit}>
          <p className="text-sm text-slate-600">
            Esta tarjeta es opcional y no guarda nada. Solo calcula la ruta con partida y destino usando Google Maps.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-slate-800">
              Tipo de combustible
              <select
                value={fuelType}
                onChange={(event) => setFuelType(event.target.value)}
                className="field-glass rounded-xl px-3 py-2.5 text-sm"
              >
                <option value="ACPM">ACPM</option>
                <option value="Gasolina">Gasolina</option>
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-medium text-slate-800">
              Valor tanqueado
              <input
                type="number"
                min="0"
                step="1000"
                inputMode="numeric"
                value={tankValue}
                onChange={(event) => setTankValue(event.target.value)}
                placeholder="Ej: 300000"
                className="field-glass rounded-xl px-3 py-2.5 text-sm"
              />
            </label>

            <label className="grid gap-1.5 text-sm font-medium text-slate-800 sm:col-span-2">
              Lugar de partida
              <input
                type="text"
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
                placeholder="Ej: Terminal de transporte de Bogotá"
                className="field-glass rounded-xl px-3 py-2.5 text-sm"
              />
            </label>

            <label className="grid gap-1.5 text-sm font-medium text-slate-800 sm:col-span-2">
              Lugar de destino
              <input
                type="text"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="Ej: Aeropuerto El Dorado"
                className="field-glass rounded-xl px-3 py-2.5 text-sm"
              />
            </label>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Combustible</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{fuelType}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Km recorridos</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {result ? result.routeKm.toLocaleString("es-CO") : "-"}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Costo por km</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {result ? formatCOP(result.costPerKmCop) : "-"}
              </p>
            </article>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Gasto total estimado</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {result ? formatCOP(result.totalCostCop) : "-"}
              </p>
            </article>
            <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-700">
              {result ? (
                <>
                  Ruta calculada por <strong>{result.providerLabel}</strong>. Con <strong>{formatCOP(Number(tankValue))}</strong> tanqueados,
                  el costo estimado es <strong>{formatCOP(result.costPerKmCop)}</strong> por km en una ruta de <strong>{result.routeKm.toLocaleString("es-CO")} km</strong>.
                </>
              ) : (
                "Ingresa el lugar de partida, el destino y el valor tanqueado para ver el cálculo."
              )}
            </article>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {error}
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-glass btn-glass-primary px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Calculando..." : "Calcular"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="btn-glass btn-glass-neutral px-4 py-2.5 text-sm font-medium"
            >
              Limpiar formulario
            </button>
          </div>
        </form>
      )}
    </section>
  );
}