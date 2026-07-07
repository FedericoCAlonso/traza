import React from 'react';
import { ElectricalCard } from '../ElectricalCard';
import { RENDERER } from '../../../../lib/renderer';
import {
  type Project, type Ambiente, type ElementoElectrico,
  type Circuito, type SymbolDialogData
} from '../../../../types/index';

interface ElectricalTabProps {
  project: Project;
  activeAmbiente: Ambiente;
  symbolsLib: any[];
  circuitos: Circuito[];
  updateElectrical: (fn: (elementos: ElementoElectrico[]) => ElementoElectrico[]) => void;
  updateStructural: (fn: (elementos: any[]) => any[]) => void;
  onSymbolDialog: (data: SymbolDialogData) => void;
  onShowNetlist: () => void;
  pendingConnection?: { ambienteId: string, elementoId: string } | null;
  onStartConnecting?: (elId: string) => void;
  onFinishConnecting?: (ambId: string, elId: string) => void;
  onCancelConnecting?: () => void;
  globalMeasurements?: import('../../../../types/index').Measurement[];
  onNewMeasurementModal?: (elementoId: string, moduleType: import('../../../../types/index').ModuleType) => void;
  onStartCircuitForBoca?: (bocaId: string) => void;
  selectedElement?: import('../../../../types/index').SelectedElement;
  onSelectElement?: (el: import('../../../../types/index').SelectedElement) => void;
}

/**
 * Pestaña para la gestión de bocas eléctricas y elementos estructurales.
 */
export const ElectricalTab: React.FC<ElectricalTabProps> = React.memo(({
  project,
  activeAmbiente,
  symbolsLib,
  circuitos,
  updateElectrical,
  onSymbolDialog,
  onShowNetlist,
  pendingConnection,
  onStartConnecting,
  onFinishConnecting,
  onCancelConnecting,
  globalMeasurements,
  onNewMeasurementModal,
  onStartCircuitForBoca,
  selectedElement,
  onSelectElement
}) => {
  return (
    <>
      <div className="info-helper">
        🖱 Tocá el plano para insertar un símbolo.
      </div>

      <div style={{ padding: '0 8px 8px' }}>
        <button className="btn btn-acc btn-full" onClick={onShowNetlist}>
          <span className="truncate">📄 Ver Listado de Materiales (Netlist)</span>
        </button>
      </div>

      {(activeAmbiente.elementos || []).map((el: any, i: number) => (
        <ElectricalCard
          key={el.id}
          el={el}
          index={i}
          wallCount={RENDERER.buildSegs(activeAmbiente, project).allSegs.length}
          symbolsLib={symbolsLib}
          circuitos={circuitos}
          tableros={project.tableros}
          isSelected={selectedElement?.type === 'elemento' && selectedElement.id === el.id}
          onSelect={() => onSelectElement?.({ type: 'elemento', id: el.id })}
          onChange={(nel) => updateElectrical(ps => ps.map((x, j) => j === i ? nel : x))}
          onRemove={() => updateElectrical(ps => ps.filter((_, j) => j !== i))}
          onEdit={() => onSymbolDialog({ mode: 'edit', existing: el })}
          activeAmbienteId={activeAmbiente.id}
          pendingConnection={pendingConnection}
          onStartConnecting={onStartConnecting}
          onFinishConnecting={onFinishConnecting}
          onCancelConnecting={onCancelConnecting}
          globalMeasurements={globalMeasurements}
          onNewMeasurementModal={onNewMeasurementModal}
          onStartCircuitForBoca={onStartCircuitForBoca}
        />
      ))}
    </>
  );
});
