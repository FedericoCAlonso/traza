import DxfWriter from 'dxf-writer';
import makerjs from 'makerjs';
import type { Project } from '../../types/index';
import type { DefinicionSimbolo } from '../symbols';
import { buildSegs, poligonoMuro, pxToM, transformSegment } from '../geometry';
import { getGlobalElementPos } from '../renderer/utils';

export class DxfGenerator {
  private project: Project;
  private symbolsLib: DefinicionSimbolo[];

  constructor(project: Project, symbolsLib: DefinicionSimbolo[]) {
    this.project = project;
    this.symbolsLib = symbolsLib;
  }

  private drawMakerjsModel(dxf: DxfWriter, model: makerjs.IModel, dxMeters: number, dyMeters: number, scaleMeters: number, layer: string) {
    dxf.setActiveLayer(layer);
    makerjs.model.walk(model, {
      onPath: (wp) => {
        const p = wp.pathContext;
        if (p.type === 'line') {
          const l = p as makerjs.IPathLine;
          dxf.drawLine(
            dxMeters + l.origin[0] * scaleMeters,
            dyMeters - l.origin[1] * scaleMeters,
            dxMeters + l.end[0] * scaleMeters,
            dyMeters - l.end[1] * scaleMeters
          );
        } else if (p.type === 'arc') {
          const a = p as makerjs.IPathArc;
          // AutoCAD DXF arcs are CCW. Since we invert Y, the visual sweep direction reverses.
          // We map start/end to 360 - angle, and swap them.
          let startA = (360 - a.endAngle) % 360;
          let endA = (360 - a.startAngle) % 360;
          if (startA < 0) startA += 360;
          if (endA < 0) endA += 360;

          dxf.drawArc(
            dxMeters + a.origin[0] * scaleMeters,
            dyMeters - a.origin[1] * scaleMeters,
            a.radius * scaleMeters,
            startA,
            endA
          );
        } else if (p.type === 'circle') {
          const c = p as makerjs.IPathCircle;
          dxf.drawCircle(
            dxMeters + c.origin[0] * scaleMeters,
            dyMeters - c.origin[1] * scaleMeters,
            c.radius * scaleMeters
          );
        }
      }
    });
  }

  public generateDxf() {
    const dxf = new DxfWriter();
    dxf.setUnits('Meters');
    
    dxf.addLayer('ARQ_PAREDES', DxfWriter.ACI.WHITE, 'CONTINUOUS');
    dxf.addLayer('ARQ_ABERTURAS', DxfWriter.ACI.CYAN, 'CONTINUOUS');
    dxf.addLayer('ELEC_BOCAS', DxfWriter.ACI.RED, 'CONTINUOUS');
    dxf.addLayer('ELEC_CANALIZACIONES', DxfWriter.ACI.BLUE, 'DASHED');
    dxf.addLayer('TEXTOS', DxfWriter.ACI.YELLOW, 'CONTINUOUS');

    const escala = this.project.escala;
    const ambsToExport = this.project.ambientes.map((a, idx) => ({
      ...a,
      posX: a.posX ?? (idx * 20),
      posY: a.posY ?? 0
    }));

    ambsToExport.forEach((amb) => {
      const { allSegs } = buildSegs(amb, this.project);
      const rot = amb.rotation || 0;
      
      const posX = amb.posX!;
      const posY = amb.posY!;
      
      const gSegs = allSegs.map(s => transformSegment(s, posX, posY, rot, escala));
      const { ext, int } = poligonoMuro(gSegs, true);
      
      dxf.setActiveLayer('ARQ_PAREDES');
      for (let i = 0; i < ext.length; i++) {
        const p1 = ext[i];
        const p2 = ext[(i + 1) % ext.length];
        dxf.drawLine(pxToM(p1[0], escala), -pxToM(p1[1], escala), pxToM(p2[0], escala), -pxToM(p2[1], escala));
      }

      for (let i = 0; i < int.length; i++) {
        const p1 = int[i];
        const p2 = int[(i + 1) % int.length];
        dxf.drawLine(pxToM(p1[0], escala), -pxToM(p1[1], escala), pxToM(p2[0], escala), -pxToM(p2[1], escala));
      }

      // 1.5 Dibujar Aberturas
      dxf.setActiveLayer('ARQ_ABERTURAS');
      (amb.aberturas || []).forEach(ab => {
        const seg = gSegs[ab.pared];
        if (!seg) return;

        // Trabajamos 100% en metros para CAD
        const sx = pxToM(seg.inicio[0], escala);
        const sy = -pxToM(seg.inicio[1], escala);
        
        // El vector director en CAD (Y invertido)
        const dx = seg.dir[0];
        const dy = -seg.dir[1];
        
        const bIx = sx + dx * ab.posicion;
        const bIy = sy + dy * ab.posicion;
        
        const bFx = sx + dx * (ab.posicion + ab.ancho);
        const bFy = sy + dy * (ab.posicion + ab.ancho);
        
        const g = pxToM(seg.grosorPx, escala);
        const vExtX = seg.v_ext[0];
        const vExtY = -seg.v_ext[1]; // Y invertido

        if (ab.tipo === 'vano' || ab.tipo === 'ventana') {
          dxf.drawLine(bIx, bIy, bIx + vExtX*g, bIy + vExtY*g);
          dxf.drawLine(bFx, bFy, bFx + vExtX*g, bFy + vExtY*g);
          if (ab.tipo === 'ventana') {
            dxf.drawLine(bIx + vExtX*g*0.5, bIy + vExtY*g*0.5, bFx + vExtX*g*0.5, bFy + vExtY*g*0.5);
          }
        } else if (ab.tipo === 'puerta') {
          const isInt = ab.lado === 'interior';
          const offX = isInt ? seg.v_int[0] : seg.v_ext[0];
          const offY = isInt ? -seg.v_int[1] : -seg.v_ext[1];
          
          const originX = ab.sentido === 'derecha' ? bFx : bIx;
          const originY = ab.sentido === 'derecha' ? bFy : bIy;
          const endX = ab.sentido === 'derecha' ? bIx : bFx;
          const endY = ab.sentido === 'derecha' ? bIy : bFy;
          
          const doorEndX = originX + offX * ab.ancho;
          const doorEndY = originY + offY * ab.ancho;
          
          dxf.drawLine(originX, originY, doorEndX, doorEndY);
          
          const a1 = Math.atan2(endY - originY, endX - originX) * 180 / Math.PI;
          const a2 = Math.atan2(doorEndY - originY, doorEndX - originX) * 180 / Math.PI;
          const n1 = (a1 + 360) % 360;
          const n2 = (a2 + 360) % 360;
          
          let diff = n2 - n1;
          if (diff < -180) diff += 360;
          if (diff > 180) diff -= 360;

          let startA = diff > 0 ? n1 : n2;
          let endA = diff > 0 ? n2 : n1;
          
          dxf.drawArc(originX, originY, ab.ancho, startA, endA);
        }
      });

      // 2. Elementos (Símbolos)
      dxf.setActiveLayer('ELEC_BOCAS');
      (amb.elementos || []).forEach(el => {
        const posPx = getGlobalElementPos(this.project, amb.id, el.id, escala, ambsToExport);
        if (!posPx) return;
        
        const xm = pxToM(posPx[0], escala);
        const ym = -pxToM(posPx[1], escala); 
        
        const symDef = this.symbolsLib.find(s => s.id === el.tipo);
        
        if (symDef && symDef.svgContent) {
          try {
            // El símbolo nativo (path/circle) a dxf
            const paths = Array.from(symDef.svgContent.matchAll(/<path[^>]*d="([^"]+)"/g)).map(m => m[1]);
            if (paths.length > 0) {
              paths.forEach(d => {
                const symModel = makerjs.importer.fromSVGPathData(d);
                makerjs.model.center(symModel); 
                const scaleFactor = (0.3 / 24) * symDef.escalaBase; 
                this.drawMakerjsModel(dxf, symModel, xm, ym, scaleFactor, 'ELEC_BOCAS');
              });
            } else {
               dxf.drawCircle(xm, ym, 0.15);
            }
          } catch (e) {
            dxf.drawCircle(xm, ym, 0.15);
          }
        } else {
          dxf.drawCircle(xm, ym, 0.15);
        }
        
        const textLabel = el.referencia || (symDef ? symDef.label : el.tipo);
        dxf.setActiveLayer('TEXTOS');
        dxf.drawText(xm + 0.2, ym, 0.1, 0, textLabel);
        dxf.setActiveLayer('ELEC_BOCAS');
      });
    });

    // Conexiones curvas con MakerJs
    if (this.project.conexiones) {
      dxf.setActiveLayer('ELEC_CANALIZACIONES');
      this.project.conexiones.forEach((con, idx) => {
        if (!con.from || !con.to) return;
        const p1 = getGlobalElementPos(this.project, con.from.ambienteId, con.from.elementoId, escala, ambsToExport);
        const p2 = getGlobalElementPos(this.project, con.to.ambienteId, con.to.elementoId, escala, ambsToExport);
        
        if (p1 && p2) {
          const midX = (p1[0] + p2[0]) / 2;
          const midY = (p1[1] + p2[1]) / 2;
          const dxDir = p2[0] - p1[0];
          const dyDir = p2[1] - p1[1];
          const len = Math.hypot(dxDir, dyDir);
          const nx = len > 0 ? -dyDir / len : 0;
          const ny = len > 0 ? dxDir / len : 0;
          const curveOffset = Math.min(len * 0.15, 20);
          const cx = midX + nx * curveOffset;
          const cy = midY + ny * curveOffset;

          const svgPath = `M ${p1[0]} ${p1[1]} Q ${cx} ${cy}, ${p2[0]} ${p2[1]}`;
          
          try {
            const curveModel = makerjs.importer.fromSVGPathData(svgPath);
            const meterScale = 1 / escala;
            this.drawMakerjsModel(dxf, curveModel, 0, 0, meterScale, 'ELEC_CANALIZACIONES');
          } catch (e) {
            dxf.setActiveLayer('ELEC_CANALIZACIONES');
            dxf.drawLine(pxToM(p1[0], escala), -pxToM(p1[1], escala), pxToM(p2[0], escala), -pxToM(p2[1], escala));
          }

          const qX = pxToM(0.25 * p1[0] + 0.5 * cx + 0.25 * p2[0], escala);
          const qY = -pxToM(0.25 * p1[1] + 0.5 * cy + 0.25 * p2[1], escala);
          const ref = con.referencia || `C${idx + 1}`;
          dxf.setActiveLayer('TEXTOS');
          dxf.drawText(qX, qY + 0.1, 0.08, 0, ref);
          dxf.setActiveLayer('ELEC_CANALIZACIONES');
        }
      });
    }

    const content = dxf.toDxfString();
    this.downloadBlob(content, `${this.project.nombre}_Plano.dxf`, 'application/dxf');
  }

  private downloadBlob(content: string, name: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    Object.assign(document.createElement('a'), { href: url, download: name }).click();
    URL.revokeObjectURL(url);
  }
}
