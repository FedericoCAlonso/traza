import { create } from 'zustand';
import type { Cliente, ObraCliente } from '../types/client';
import { loadClients, saveClients, createNewClient, createNewObra } from '../lib/clientStorage';

interface ClientsState {
  clients: Cliente[];
  setClients: (clients: Cliente[]) => void;
  addClient: (razonSocial: string, extra?: Partial<Cliente>) => Cliente;
  updateClient: (id: string, patch: Partial<Cliente>) => void;
  deleteClient: (id: string) => void;
  addObra: (clienteId: string, nombre: string, direccion: string, extra?: Partial<ObraCliente>) => ObraCliente | null;
  getClientById: (id: string) => Cliente | undefined;
}

export const useClientsStore = create<ClientsState>((set, get) => ({
  clients: loadClients(),

  setClients: (clients) => {
    saveClients(clients);
    set({ clients });
  },

  addClient: (razonSocial, extra = {}) => {
    const newClient = createNewClient(razonSocial, extra);
    const next = [...get().clients, newClient];
    saveClients(next);
    set({ clients: next });
    return newClient;
  },

  updateClient: (id, patch) => {
    const next = get().clients.map(c => {
      if (c.id === id) {
        return { ...c, ...patch, updatedAt: new Date().toISOString() };
      }
      return c;
    });
    saveClients(next);
    set({ clients: next });
  },

  deleteClient: (id) => {
    const next = get().clients.map(c => {
      if (c.id === id) {
        return { ...c, deleted: true, updatedAt: new Date().toISOString() };
      }
      return c;
    });
    saveClients(next);
    set({ clients: next });
  },

  addObra: (clienteId, nombre, direccion, extra = {}) => {
    const client = get().clients.find(c => c.id === clienteId);
    if (!client) return null;

    const newObra = createNewObra(clienteId, nombre, direccion, extra);
    const nextObras = [...(client.obras || []), newObra];

    get().updateClient(clienteId, { obras: nextObras });
    return newObra;
  },

  getClientById: (id) => get().clients.find(c => c.id === id),
}));
