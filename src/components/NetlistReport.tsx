// ═══════════════════════════════════════════════════════════════════════════
// MODULE: components/NetlistReport.tsx
// ═══════════════════════════════════════════════════════════════════════════

import { Modal } from '../ui/Modal';
import type { Ambiente, ElementoElectrico, Project } from '../types/index';

interface NetlistReportProps {
  project: Project;
  ambiente: Ambiente;
  onClose: () => void;
}
export function NetlistReport({ project, ambiente, onClose }: NetlistReportProps) {
  
  const circuitosMap = new Map((project.circuitos || []).map(c => [c.id, c.nombre]));
  const conexionesLocales = (project.conexiones || []).filter(c => c.from.ambienteId === ambiente.id && c.to.ambienteId === ambiente.id);

  /**
   * Genera y descarga el archivo CSV con los datos del netlist
   */
  const exportToCSV = () => {
    const rows = [
      ['SECCIÓN', 'BOCAS'],
      ['Tipo', 'Referencia', 'Altura (m)', 'Circuito', 'Pared/Posición'],
      ...(ambiente.elementos || []).map(el => [
        el.tipo,
        el.referencia || '-',
        el.altura || '-',
        el.circuitoId ? (circuitosMap.get(el.circuitoId) || el.circuitoId) : '-',
        el.paredIdx !== null ? `Pared ${el.paredIdx} @ ${el.paredPos}m` : 'Libre'
      ]),
      [],
      ['SECCIÓN', 'CONEXIONES'],
      ['Origen', 'Destino', 'Circuito', 'Conducto', 'Conductores'],
      ...conexionesLocales.map(con => {
        const elFrom = ambiente.elementos.find(e => e.id === con.from.elementoId);
        const elTo = ambiente.elementos.find(e => e.id === con.to.elementoId);
        return [
          elFrom?.referencia || elFrom?.tipo || '?',
          elTo?.referencia || elTo?.tipo || '?',
          con.circuitoId ? (circuitosMap.get(con.circuitoId) || con.circuitoId) : '-',
          con.conducto || '-',
          con.cables?.length ? `${con.cables.length} cables` : '-'
        ];
      })
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `netlist_${ambiente.nombre.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Reporte de Materiales: ${ambiente.nombre}`}
      maxWidth="800px"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          <button className="btn btn-acc" onClick={exportToCSV}>📥 Exportar CSV</button>
        </>
      }
    >
      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-h)' }}>Bocas y Elementos Eléctricos</h4>
        <table className="netlist-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '8px' }}>Símbolo</th>
              <th style={{ padding: '8px' }}>Ref.</th>
              <th style={{ padding: '8px' }}>Altura</th>
              <th style={{ padding: '8px' }}>Circuito</th>
              <th style={{ padding: '8px' }}>Ubicación</th>
            </tr>
          </thead>
          <tbody>
            {(ambiente.elementos || []).map((el: ElementoElectrico) => (
              <tr key={el.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px' }}>{el.tipo}</td>
                <td style={{ padding: '8px' }}>{el.referencia}</td>
                <td style={{ padding: '8px' }}>{el.altura ?? '-'} m</td>
                <td style={{ padding: '8px' }}>{el.circuitoId ? circuitosMap.get(el.circuitoId) : '-'}</td>
                <td style={{ padding: '8px' }}>
                  {el.paredIdx !== null ? `Pared ${el.paredIdx} (${el.paredPos}m)` : 'Techo/Libre'}
                </td>
              </tr>
            ))}
            {(!ambiente.elementos || ambiente.elementos.length === 0) && (
              <tr>
                <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)' }}>
                  No hay elementos eléctricos en esta hoja.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-h)' }}>Conexiones y Canalizaciones</h4>
        <table className="netlist-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '8px' }}>Origen</th>
              <th style={{ padding: '8px' }}>Destino</th>
              <th style={{ padding: '8px' }}>Circuito</th>
              <th style={{ padding: '8px' }}>Conducto</th>
              <th style={{ padding: '8px' }}>Conductores</th>
            </tr>
          </thead>
          <tbody>
            {conexionesLocales.map((con) => {
              const elFrom = ambiente.elementos.find(e => e.id === con.from.elementoId);
              const elTo = ambiente.elementos.find(e => e.id === con.to.elementoId);
              return (
                <tr key={con.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px' }}>{elFrom?.referencia || elFrom?.tipo || '?'}</td>
                  <td style={{ padding: '8px' }}>{elTo?.referencia || elTo?.tipo || '?'}</td>
                  <td style={{ padding: '8px' }}>{con.circuitoId ? circuitosMap.get(con.circuitoId) : '-'}</td>
                  <td style={{ padding: '8px' }}>{con.conducto || '-'}</td>
                  <td style={{ padding: '8px' }}>{con.cables?.length ? `${con.cables.length} cables` : '-'}</td>
                </tr>
              );
            })}
            {conexionesLocales.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)' }}>
                  No hay conexiones definidas en esta hoja.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

