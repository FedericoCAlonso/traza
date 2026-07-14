import React from 'react';
import { Card } from '../../../../ui/Card';
import { F } from '../../../../ui/Field';
import { NumInput } from '../../../../ui/NumInput';
import { createTexto } from '../../../../lib/storage';
import { type Project, type Ambiente } from '../../../../types/index';

interface ProjectTabProps {
  project: Project;
  activeAmbiente: Ambiente;
  onUpdateAmbiente: (fn: (a: Ambiente) => Ambiente) => void;
  onDeleteAmbiente: (id: string) => void;
}

/**
 * Pestaña de configuración de la hoja activa.
 * La configuración general del proyecto se ha movido al Hub de Proyectos.
 */
export const ProjectTab: React.FC<ProjectTabProps> = ({ 
  project, 
  activeAmbiente, 
  onUpdateAmbiente, 
  onDeleteAmbiente 
}) => {
  return (
    <>
      <Card idx="🏠" title={`Hoja de relevamiento: ${activeAmbiente.nombre}`} defaultOpen={true}>
        <F label="Nombre de la hoja">
          <input
            value={activeAmbiente.nombre}
            onChange={e => onUpdateAmbiente(a => ({ ...a, nombre: e.target.value }))}
          />
        </F>
        <div className="field-row">
          <F label="Tipo de hoja">
            <select
              value={activeAmbiente.tipoAmbiente || 'interior'}
              onChange={e => onUpdateAmbiente(a => ({ ...a, tipoAmbiente: e.target.value as Ambiente['tipoAmbiente'] }))}
            >
              <option value="interior">🏠 Interior</option>
              <option value="semi_cubierto">⛅ Semi-cubierta</option>
              <option value="exterior">☀ Exterior</option>
            </select>
          </F>
          <F label="Sentido de recorrido">
            <select
              value={activeAmbiente.sentido}
              onChange={e => onUpdateAmbiente(a => ({ ...a, sentido: e.target.value as Ambiente['sentido'] }))}
            >
              <option value="horario">Horario</option>
              <option value="antihorario">Antihorario</option>
            </select>
          </F>
        </div>
        <div className="field-row">
          <F label="Formato de papel">
            <select
              value={activeAmbiente.configHoja?.formato || 'A4'}
              onChange={e => onUpdateAmbiente(a => ({ ...a, configHoja: { ...(a.configHoja || { orientacion: 'horizontal' }), formato: e.target.value as any } }))}
            >
              <option value="A5">A5</option>
              <option value="A4">A4</option>
              <option value="A3">A3</option>
              <option value="A2">A2</option>
              <option value="A1">A1</option>
              <option value="A0">A0</option>
            </select>
          </F>
          <F label="Orientación">
            <select
              value={activeAmbiente.configHoja?.orientacion || 'horizontal'}
              onChange={e => onUpdateAmbiente(a => ({ ...a, configHoja: { ...(a.configHoja || { formato: 'A4' }), orientacion: e.target.value as any } }))}
            >
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
            </select>
          </F>
        </div>
        <div className="field-row">
          <F label="Escala de Símbolos (1:X)">
            <NumInput
              value={activeAmbiente.configHoja?.escalaSimbolos ?? project.escala}
              onChange={(v: number) => onUpdateAmbiente(a => ({ ...a, configHoja: { ...(a.configHoja || { formato: 'A4', orientacion: 'horizontal' }), escalaSimbolos: v } }))}
              placeholder="Ej. 50"
            />
          </F>
        </div>
        <div className="field-row">
          <F label="Altura de techo (m)">
            <NumInput
              value={activeAmbiente.alturaLocal ?? (project.alturaDefault ?? 2.6)}
              onChange={(v: any) => onUpdateAmbiente(a => ({ ...a, alturaLocal: v }))}
            />
          </F>
          <F label="Mostrar cotas">
            <select
              value={activeAmbiente.mostrar_cotas ? 'si' : 'no'}
              onChange={e => onUpdateAmbiente(a => ({ ...a, mostrar_cotas: e.target.value === 'si' }))}
            >
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </F>
          <F label="Tamaño cotas (mm)">
            <NumInput
              value={activeAmbiente.cotaSize || 2.5}
              onChange={(v: any) => onUpdateAmbiente(a => ({ ...a, cotaSize: v }))}
            />
          </F>
        </div>
        {project.ambientes.length > 1 && (
          <button className="btn btn-danger btn-sm" onClick={() => onDeleteAmbiente(activeAmbiente.id)}>
            Eliminar esta hoja de relevamiento
          </button>
        )}
      </Card>

      <Card idx="T" title="Anotaciones en el plano" defaultOpen={true}>
        <div className="info-helper">Agregá textos libres en el plano (ej: "Cocina", "Pasillo").</div>
        {(activeAmbiente.textos || []).map((t) => (
          <div key={t.id} className="field-row" style={{ alignItems: 'flex-end', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
            <div style={{ flex: 2 }}>
              <F label="Texto">
                <input
                  value={t.texto}
                  onChange={e => onUpdateAmbiente(a => ({
                  ...a, textos: (a.textos || []).map((xt: any) => xt.id === t.id ? { ...xt, texto: e.target.value } : xt)
                }))}
              />
            </F>
          </div>
          <div style={{ flex: 1 }}>
            <F label="X">
              <NumInput value={Math.round(t.x)} onChange={(v: any) => onUpdateAmbiente(a => ({
                ...a, textos: (a.textos || []).map((xt: any) => xt.id === t.id ? { ...xt, x: v } : xt)
              }))} />
            </F>
          </div>
          <div style={{ flex: 1 }}>
            <F label="Y">
              <NumInput value={Math.round(t.y)} onChange={(v: any) => onUpdateAmbiente(a => ({
                ...a, textos: (a.textos || []).map((xt: any) => xt.id === t.id ? { ...xt, y: v } : xt)
              }))} />
            </F>
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => onUpdateAmbiente(a => ({
            ...a, textos: (a.textos || []).filter((xt: any) => xt.id !== t.id)
            }))}>✕</button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm btn-full" onClick={() => onUpdateAmbiente(a => ({
          ...a, textos: [...(a.textos || []), createTexto()]
        }))}>
          + Agregar texto
        </button>
      </Card>
    </>
  );
};
