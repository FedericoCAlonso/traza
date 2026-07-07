import { describe, it, expect } from 'vitest'
import {
  add, sub, scale, rot, norm, perpIzq, dot, len, dist,
  lineIntersect, esCerrado, construirEjes, snapAPared,
  calcularTransformacionEnlace
} from './geometry'
import type { Pared, Ambiente } from '../types/index'

describe('geometry - Vector algebra utilities', () => {
  it('should add vectors', () => {
    expect(add([1, 2], [3, 4])).toEqual([4, 6])
  })

  it('should subtract vectors', () => {
    expect(sub([5, 7], [2, 3])).toEqual([3, 4])
  })

  it('should scale vectors', () => {
    expect(scale([2, -3], 3)).toEqual([6, -9])
  })

  it('should rotate vectors', () => {
    const rotated = rot([1, 0], 90)
    expect(rotated[0]).toBeCloseTo(0)
    expect(rotated[1]).toBeCloseTo(1)
  })

  it('should normalize vectors', () => {
    expect(norm([3, 4])).toEqual([0.6, 0.8])
    expect(norm([0, 0])).toEqual([0, 0])
  })

  it('should return perpendicular vector', () => {
    expect(perpIzq([1, 0])).toEqual([0, -1])
    expect(perpIzq([0, 1])).toEqual([1, -0])
  })

  it('should calculate dot product', () => {
    expect(dot([1, 2], [3, 4])).toBe(11)
  })

  it('should calculate vector length', () => {
    expect(len([3, 4])).toBe(5)
  })

  it('should calculate distance between points', () => {
    expect(dist([1, 1], [4, 5])).toBe(5)
  })

  it('should calculate line intersection points', () => {
    // Line 1: passes through (0,0) going along X-axis
    // Line 2: passes through (5,5) going down along Y-axis
    const intersect = lineIntersect([0, 0], [1, 0], [5, 5], [0, -1])
    expect(intersect).not.toBeNull()
    expect(intersect![0]).toBeCloseTo(5)
    expect(intersect![1]).toBeCloseTo(0)
  })

  it('should return null for parallel lines', () => {
    const intersect = lineIntersect([0, 0], [1, 0], [0, 5], [1, 0])
    expect(intersect).toBeNull()
  })
})

describe('geometry - Room/Wall logical builders', () => {
  it('should determine if a segment sequence is closed', () => {
    const closedSegs = [
      { inicio: [0, 0], fin: [10, 0], dir: [1, 0], v_ext: [0, 1], v_int: [0, -1], grosorPx: 10 },
      { inicio: [10, 0], fin: [10, 10], dir: [0, 1], v_ext: [-1, 0], v_int: [1, 0], grosorPx: 10 },
      { inicio: [10, 10], fin: [0, 0], dir: [-0.7, -0.7], v_ext: [0.7, -0.7], v_int: [-0.7, 0.7], grosorPx: 10 }
    ] as any[]
    expect(esCerrado(closedSegs)).toBe(true)

    const openSegs = [
      { inicio: [0, 0], fin: [10, 0], dir: [1, 0], v_ext: [0, 1], v_int: [0, -1], grosorPx: 10 },
      { inicio: [10, 0], fin: [10, 10], dir: [0, 1], v_ext: [-1, 0], v_int: [1, 0], grosorPx: 10 }
    ] as any[]
    expect(esCerrado(openSegs)).toBe(false)
  })

  it('should construct axes correctly from walls list', () => {
    const paredes: Pared[] = [
      { id: 'p1', largo: 4, angulo: 0, grosor: 0.15, esquina_saliente: null, irregularidades: [] },
      { id: 'p2', largo: 3, angulo: 90, grosor: 0.15, esquina_saliente: null, irregularidades: [] }
    ]
    const escala = 50 // px por metro = 1000 / escala = 20 px/m
    const segs = construirEjes(paredes, escala, 1, 0, 0)

    expect(segs.length).toBe(2)
    // First segment starts at (0,0) and goes right
    expect(segs[0].inicio).toEqual([0, 0])
    expect(segs[0].fin[0]).toBeCloseTo(80) // 4m * 20px/m = 80px
    expect(segs[0].fin[1]).toBeCloseTo(0)

    // Second segment starts at (80,0) and goes down (rotated 90 deg clockwise)
    expect(segs[1].inicio).toEqual(segs[0].fin)
    expect(segs[1].fin[0]).toBeCloseTo(80)
    expect(segs[1].fin[1]).toBeCloseTo(60) // 3m * 20px/m = 60px
  })

  it('should snap coordinates to the closest wall segment', () => {
    const closedSegs = [
      { inicio: [0, 0], fin: [100, 0], dir: [1, 0], v_ext: [0, -1], v_int: [0, 1], grosorPx: 10 },
      { inicio: [100, 0], fin: [100, 100], dir: [0, 1], v_ext: [1, 0], v_int: [-1, 0], grosorPx: 10 }
    ] as any[]

    // Point near [50, 2] should snap to segment 0 (which is along Y=0) at pos=50
    const snapResult = snapAPared(50, 2, closedSegs)
    expect(snapResult.segIdx).toBe(0)
    expect(snapResult.pos).toBeCloseTo(50)
    expect(snapResult.dist).toBeCloseTo(2)
  })

  it('should calculate alignment transformations between linked ports', () => {
    // Environment A: placed at (0,0), rotated 0, has port A at position 2m on wall 0 (which goes along X axis)
    const ambA = {
      id: 'a',
      nombre: 'Ambiente A',
      sentido: 'horario',
      rotation: 0,
      posX: 0,
      posY: 0,
      paredes: [
        { id: 'ap0', largo: 4, angulo: 0, grosor: 0.15, esquina_saliente: null, irregularidades: [] }
      ],
      aberturas: [
        { id: 'abA', pared: 0, tipo: 'puerta', posicion: 2.0, ancho: 1.0, hojas: 1, lado: 'izq', sentido: 'int' }
      ]
    } as unknown as Ambiente

    // Environment B: has port B at position 1m on wall 0 (which goes along X axis)
    const ambB = {
      id: 'b',
      nombre: 'Ambiente B',
      sentido: 'horario',
      rotation: 0,
      posX: 0,
      posY: 0,
      paredes: [
        { id: 'bp0', largo: 3, angulo: 0, grosor: 0.15, esquina_saliente: null, irregularidades: [] }
      ],
      aberturas: [
        { id: 'abB', pared: 0, tipo: 'puerta', posicion: 1.0, ancho: 1.0, hojas: 1, lado: 'izq', sentido: 'int' }
      ]
    } as unknown as Ambiente

    // Alignment logic aligns the midpoints of the ports, and rotates B so its wall points in the opposite direction.
    // Port A midpoint = 2.5m on X-axis = (2.5, 0)
    // Port B midpoint = 1.5m on X-axis = (1.5, 0)
    // Rotation of B should be 180 degrees relative to A
    // Once B is rotated 180, B's midpoint (1.5, 0) rotated by 180 becomes (-1.5, 0)
    // The translation (posX, posY) should move B's rotated midpoint to A's midpoint: (2.5, 0) - (-1.5, 0) = (4.0, 0)
    const escala = 50
    const transform = calcularTransformacionEnlace(
      ambA, ambA.aberturas![0],
      ambB, ambB.aberturas![0],
      escala
    )

    expect(transform.rotation).toBeCloseTo(180)
    expect(transform.posX).toBeCloseTo(4.0)
    expect(transform.posY).toBeCloseTo(0.0)
  })
})
