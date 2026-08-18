import type { Cliente, ObraCliente } from '../types/client';

const CLIENTS_STORAGE_KEY = 'ieba_clientes_v1';

export const loadClients = (): Cliente[] => {
  try {
    const raw = localStorage.getItem(CLIENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error al cargar clientes desde almacenamiento local:', err);
    return [];
  }
};

export const saveClients = (clientes: Cliente[]): void => {
  try {
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clientes));
  } catch (err) {
    console.error('Error al guardar clientes en almacenamiento local:', err);
  }
};

export const createNewClient = (
  razonSocial: string,
  extra: Partial<Cliente> = {}
): Cliente => {
  const id = `cli_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  
  const client: Cliente = {
    id,
    razonSocial: razonSocial.trim(),
    nombre: razonSocial.trim(),
    roles: ['cliente'],
    obras: [],
    createdAt: now,
    updatedAt: now,
    ...extra
  };

  return client;
};

export const createNewObra = (
  clienteId: string,
  nombre: string,
  direccion: string,
  extra: Partial<ObraCliente> = {}
): ObraCliente => {
  const id = `obra_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();

  return {
    id,
    clienteId,
    nombre: nombre.trim(),
    direccion: direccion.trim(),
    createdAt: now,
    updatedAt: now,
    ...extra
  };
};
