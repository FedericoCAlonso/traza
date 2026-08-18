export type RolContacto = 'cliente' | 'proveedor';
export type TipoProveedor = 'material' | 'servicio' | 'ambos';
export type CondicionIVA = 'Responsable Inscripto' | 'Monotributo' | 'Consumidor Final' | 'Exento';

export interface CanalContacto {
  tipo: 'telefono' | 'whatsapp' | 'email' | 'web';
  valor: string;
  esPrincipal: boolean;
}

export interface PersonaContacto {
  id: string;
  nombre?: string;
  nombrePersona?: string;
  rol?: string; // "Titular", "Jefe de Obra", "Compras", "Técnico"
  telefono?: string;
  email?: string;
  esPrincipal?: boolean;
  canales?: CanalContacto[];
}

export interface ObraCliente {
  id: string;
  clienteId: string;
  nombre: string;              // Ej: "Depto 4B", "Local Comercial", "Casa Country"
  direccion: string;
  localidad?: string;
  provincia?: string;
  notas?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Contacto {
  id: string;
  razonSocial: string;               // Nombre o Razón Social principal
  nombreFantasia?: string;           // Nombre comercial o alias
  nombre?: string;                   // Alias de compatibilidad (= razonSocial)
  cuitDni?: string;
  cuit?: string;                     // Alias de compatibilidad (= cuitDni)
  condicionIVA?: CondicionIVA;
  
  roles: RolContacto[];              // ['cliente'], ['proveedor']
  tipoProveedor?: TipoProveedor;
  
  etiquetas?: string[];              // ['Residencial', 'Comercial', 'Consorcio']
  
  direccion?: string;
  localidad?: string;
  provincia?: string;
  telefono?: string;
  email?: string;
  sitioWeb?: string;
  contactos?: PersonaContacto[];
  
  obras?: ObraCliente[];             // Lista de obras asociadas al cliente
  
  notas?: string;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
}

export type Cliente = Contacto;
export type Proveedor = Contacto;
