import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Project, Conexion } from '../../types/index';
import { calcularLongitudOrtogonal } from '../electrical/calculations';
import type { DefinicionSimbolo } from '../symbols';

export class ReportGenerator {
  private project: Project;
  private symbolsLib: DefinicionSimbolo[];

  constructor(project: Project, symbolsLib: DefinicionSimbolo[]) {
    this.project = project;
    this.symbolsLib = symbolsLib;
  }

  /**
   * Obtiene la longitud a usar para una conexión (m).
   */
  private getConnectionLength(con: Conexion): number {
    if (con.origenLongitud === 'declarada' && con.seccionConduccion !== undefined) {
      return con.seccionConduccion; // Legacy hack en la UI
    }
    const L = calcularLongitudOrtogonal(
      this.project,
      con.from?.ambienteId,
      con.from?.elementoId,
      con.to?.ambienteId,
      con.to?.elementoId
    );
    // Agregamos 10% de desperdicio/curvas por defecto si se calcula automático
    return L !== null ? L * 1.1 : 0;
  }

  private getSymbolLabel(type: string): string {
    return this.symbolsLib.find(s => s.id === type)?.label || type;
  }

  // ============================================================================
  // CÓMPUTO DE MATERIALES (BOM)
  // ============================================================================
  public generateBOMPdf() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Cómputo de Materiales - ${this.project.nombre}`, 14, 20);
    
    // 1. CONDUCTORES
    const cablesMap: Record<string, number> = {};
    const conductosMap: Record<string, number> = {};

    (this.project.conexiones || []).forEach(con => {
      const L = this.getConnectionLength(con);
      
      // Conducto
      const condKey = `${con.tipoConducto || 'cano_rigido'} - ${con.conducto || 'S/D'}`;
      conductosMap[condKey] = (conductosMap[condKey] || 0) + L;

      // Cables
      (con.cables || []).forEach(cab => {
        const cabKey = `${cab.tipo} ${cab.seccion}mm² ${cab.color ? `(${cab.color})` : ''}`;
        cablesMap[cabKey] = (cablesMap[cabKey] || 0) + L;
      });
    });

    const cablesBody = Object.entries(cablesMap)
      .filter(([_, v]) => v > 0)
      .map(([k, v]) => [k, `${v.toFixed(2)} m`]);

    doc.setFontSize(14);
    doc.text('Conductores (Cableado)', 14, 35);
    autoTable(doc, {
      startY: 40,
      head: [['Descripción', 'Cantidad Estimada']],
      body: cablesBody,
    });

    // 2. CANALIZACIONES
    const conductosBody = Object.entries(conductosMap)
      .filter(([_, v]) => v > 0)
      .map(([k, v]) => [k, `${v.toFixed(2)} m`]);

    let finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.text('Canalizaciones', 14, finalY);
    autoTable(doc, {
      startY: finalY + 5,
      head: [['Tipo y Descripción', 'Cantidad Estimada']],
      body: conductosBody,
    });

    // 3. ELEMENTOS Y BORDES (Llaves, tomas, cajas)
    const elementosMap: Record<string, number> = {};
    (this.project.ambientes || []).forEach(amb => {
      (amb.elementos || []).forEach(el => {
        const label = this.getSymbolLabel(el.tipo);
        elementosMap[label] = (elementosMap[label] || 0) + 1;
      });
    });

    const elementosBody = Object.entries(elementosMap)
      .map(([k, v]) => [k, `${v} un.`]);

    finalY = (doc as any).lastAutoTable.finalY + 15;
    if (finalY > 250) { doc.addPage(); finalY = 20; }
    
    doc.text('Bocas, Cajas y Tableros', 14, finalY);
    autoTable(doc, {
      startY: finalY + 5,
      head: [['Elemento', 'Cantidad']],
      body: elementosBody,
    });

    doc.save(`${this.project.nombre}_BOM.pdf`);
  }

  // ============================================================================
  // DESGLOSE POR CIRCUITO
  // ============================================================================
  public generateCircuitsPdf() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Desglose por Circuito - ${this.project.nombre}`, 14, 20);
    
    let currentY = 30;

    (this.project.circuitos || []).forEach(circ => {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Circuito: ${circ.nombre} [${circ.tipo}]`, 14, currentY);
      currentY += 6;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Línea base: ${circ.conductoresBase || 3}x${circ.seccionBase || 2.5} mm²`, 14, currentY);
      currentY += 8;

      // Buscar conexiones asociadas a este circuito
      const conexiones = (this.project.conexiones || []).filter(c => 
        c.circuitoId === circ.id || (c.circuitosIds || []).includes(circ.id)
      );

      // Calcular cantidad de bocas asociadas (únicas)
      const bocasSet = new Set<string>();
      const tramosBody: string[][] = [];
      let totalLength = 0;

      conexiones.forEach((con, idx) => {
        if (!con.from || !con.to) return;
        bocasSet.add(con.from.elementoId);
        bocasSet.add(con.to.elementoId);

        const L = this.getConnectionLength(con);
        totalLength += L;

        const ref = con.referencia || `C${idx + 1}`;
        tramosBody.push([
          ref,
          `${con.conducto || 'S/D'}`,
          `${L.toFixed(2)} m`
        ]);
      });

      doc.text(`Bocas conectadas: ${bocasSet.size} un.`, 14, currentY);
      currentY += 8;
      doc.text(`Longitud total canalización: ${totalLength.toFixed(2)} m`, 14, currentY);
      currentY += 4;

      if (tramosBody.length > 0) {
        autoTable(doc, {
          startY: currentY,
          head: [['Ref.', 'Conducto', 'Longitud']],
          body: tramosBody,
          theme: 'grid',
          styles: { fontSize: 8 },
          margin: { left: 14 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      } else {
        doc.setFont('helvetica', 'italic');
        doc.text('No hay conexiones trazadas en plano para este circuito.', 14, currentY + 4);
        doc.setFont('helvetica', 'normal');
        currentY += 15;
      }
    });

    doc.save(`${this.project.nombre}_Circuitos.pdf`);
  }

  // ============================================================================
  // CUADRO DE CARGAS
  // ============================================================================
  public generateLoadSchedulePdf() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Cuadro de Cargas - ${this.project.nombre}`, 14, 20);

    const tableros = this.project.tableros || [];
    let currentY = 30;

    if (tableros.length === 0) {
      doc.setFontSize(12);
      doc.text("No hay tableros definidos en el proyecto.", 14, currentY);
      doc.save(`${this.project.nombre}_CuadroCargas.pdf`);
      return;
    }

    tableros.forEach(tablero => {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Tablero: ${tablero.nombre} (${tablero.tipo})`, 14, currentY);
      
      const circs = (this.project.circuitos || []).filter(c => c.tableroId === tablero.id);
      const rows: string[][] = [];

      circs.forEach(circ => {
        // En iebaSuite actualmente no se ingresa potencia en la interfaz básica, 
        // pero podemos dejar las columnas listas o hacer un cálculo base según bocas si quisiéramos.
        rows.push([
          circ.nombre,
          circ.tipo,
          `${circ.conductoresBase || 3}x${circ.seccionBase || 2.5} mm²`,
          `S/D VA`, // Potencia (a futuro)
          `S/D A`,  // In (a futuro)
          `S/D mm`  // Caída de tensión (a futuro)
        ]);
      });

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Circuito', 'Tipo', 'Línea', 'Potencia (VA)', 'In (A)', 'ΔV (%)']],
        body: rows,
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    });

    doc.save(`${this.project.nombre}_CuadroCargas.pdf`);
  }

  private downloadBlob(content: string, name: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    Object.assign(document.createElement('a'), { href: url, download: name }).click();
    URL.revokeObjectURL(url);
  }

  // ============================================================================
  // CÓMPUTO DE MATERIALES (BOM) - CSV
  // ============================================================================
  public generateBOMCsv() {
    const cablesMap: Record<string, number> = {};
    const conductosMap: Record<string, number> = {};

    (this.project.conexiones || []).forEach(con => {
      const L = this.getConnectionLength(con);
      const condKey = `${con.tipoConducto || 'cano_rigido'} - ${con.conducto || 'S/D'}`;
      conductosMap[condKey] = (conductosMap[condKey] || 0) + L;
      (con.cables || []).forEach(cab => {
        const cabKey = `${cab.tipo} ${cab.seccion}mm² ${cab.color ? `(${cab.color})` : ''}`;
        cablesMap[cabKey] = (cablesMap[cabKey] || 0) + L;
      });
    });

    const elementosMap: Record<string, number> = {};
    (this.project.ambientes || []).forEach(amb => {
      (amb.elementos || []).forEach(el => {
        const label = this.getSymbolLabel(el.tipo);
        elementosMap[label] = (elementosMap[label] || 0) + 1;
      });
    });

    const rows = [['Categoría', 'Descripción', 'Cantidad Estimada']];
    Object.entries(cablesMap).filter(([_, v]) => v > 0).forEach(([k, v]) => rows.push(['Conductor', k, `${v.toFixed(2)} m`]));
    Object.entries(conductosMap).filter(([_, v]) => v > 0).forEach(([k, v]) => rows.push(['Canalización', k, `${v.toFixed(2)} m`]));
    Object.entries(elementosMap).forEach(([k, v]) => rows.push(['Boca/Elemento', k, `${v} un.`]));

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    this.downloadBlob(csv, `${this.project.nombre}_BOM.csv`, 'text/csv');
  }

  // ============================================================================
  // DESGLOSE POR CIRCUITO - CSV
  // ============================================================================
  public generateCircuitsCsv() {
    const rows = [['Circuito', 'Tipo', 'Línea Base', 'Cant. Bocas', 'Longitud Canalización (m)', 'Detalle Tramo (Ref)', 'Conducto Tramo', 'Longitud Tramo (m)']];

    (this.project.circuitos || []).forEach(circ => {
      const conexiones = (this.project.conexiones || []).filter(c => 
        c.circuitoId === circ.id || (c.circuitosIds || []).includes(circ.id)
      );

      const bocasSet = new Set<string>();
      let totalLength = 0;
      const tramos: any[] = [];

      conexiones.forEach((con, idx) => {
        if (!con.from || !con.to) return;
        bocasSet.add(con.from.elementoId);
        bocasSet.add(con.to.elementoId);
        const L = this.getConnectionLength(con);
        totalLength += L;
        tramos.push({ ref: con.referencia || `C${idx + 1}`, cond: con.conducto || 'S/D', len: L });
      });

      if (tramos.length === 0) {
        rows.push([circ.nombre, circ.tipo, `${circ.conductoresBase || 3}x${circ.seccionBase || 2.5} mm²`, '0', '0.00', '-', '-', '-']);
      } else {
        tramos.forEach((t, i) => {
          if (i === 0) {
            rows.push([circ.nombre, circ.tipo, `${circ.conductoresBase || 3}x${circ.seccionBase || 2.5} mm²`, String(bocasSet.size), totalLength.toFixed(2), t.ref, t.cond, t.len.toFixed(2)]);
          } else {
            rows.push(['', '', '', '', '', t.ref, t.cond, t.len.toFixed(2)]);
          }
        });
      }
    });

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    this.downloadBlob(csv, `${this.project.nombre}_Circuitos.csv`, 'text/csv');
  }

  // ============================================================================
  // CUADRO DE CARGAS - CSV
  // ============================================================================
  public generateLoadScheduleCsv() {
    const rows = [['Tablero', 'Circuito', 'Tipo', 'Línea', 'Potencia (VA)', 'In (A)', 'ΔV (%)']];
    const tableros = this.project.tableros || [];
    
    tableros.forEach(tablero => {
      const circs = (this.project.circuitos || []).filter(c => c.tableroId === tablero.id);
      circs.forEach(circ => {
        rows.push([
          tablero.nombre,
          circ.nombre,
          circ.tipo,
          `${circ.conductoresBase || 3}x${circ.seccionBase || 2.5} mm²`,
          `S/D VA`,
          `S/D A`,
          `S/D mm`
        ]);
      });
    });

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    this.downloadBlob(csv, `${this.project.nombre}_CuadroCargas.csv`, 'text/csv');
  }
}
