import React, { useState, useRef } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { useClientsStore } from '../../store/useClientsStore';
import { createProject, exportBackupJSON, parseBackupJSON } from '../../lib/storage';
import { exportAllProjectData } from '../../lib/exporters';
import { useAuth } from '../../core/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { ConfigModal } from '../ConfigModal';
import { SyncModal } from '../SyncModal';
import { Modal } from '../Modal';
import { F } from '../Field';
import type { Project } from '../../types/index';
import { 
  FolderKanban, 
  Plus, 
  LogOut, 
  FolderOpen, 
  Pencil, 
  Download, 
  Copy, 
  Trash2, 
  User as UserIcon, 
  MapPin, 
  Layers, 
  Calendar,
  Sun,
  Moon,
  Monitor,
  Upload,
  HardDrive,
  Settings,
  Cloud,
  Building,
  Send
} from 'lucide-react';
import { enviarAlCotizador } from '../../lib/export/cotizadorBridge';

export function DashboardScreen() {
  const { user, logout } = useAuth();
  const { themeMode, toggleTheme } = useTheme();
  const { 
    projects, 
    addProject, 
    selectProject, 
    deleteProject, 
    updateProject, 
    duplicateProject,
    importProjects 
  } = useProjectStore();

  const { clients, addClient, addObra, getClientById } = useClientsStore();

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedObraId, setSelectedObraId] = useState<string>('');
  const [newClientName, setNewClientName] = useState('');
  const [showNewClientInput, setShowNewClientInput] = useState(false);
  const [newObraName, setNewObraName] = useState('');
  const [newObraAddress, setNewObraAddress] = useState('');
  const [showNewObraInput, setShowNewObraInput] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenCreateModal = () => {
    const newProj = createProject('Nuevo Relevamiento');
    setSelectedClientId('');
    setSelectedObraId('');
    setShowNewClientInput(false);
    setShowNewObraInput(false);
    setEditingProject(newProj);
  };

  const handleEditProject = (p: Project) => {
    setSelectedClientId(p.clienteId || '');
    setSelectedObraId(p.obraId || '');
    setShowNewClientInput(false);
    setShowNewObraInput(false);
    setEditingProject(p);
  };

  const handleDuplicate = (p: Project) => {
    duplicateProject(p.id);
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    if (!clientId) {
      setSelectedObraId('');
      return;
    }
    const client = getClientById(clientId);
    if (client && editingProject) {
      setEditingProject({
        ...editingProject,
        clienteId: client.id,
        clienteNombre: client.razonSocial || client.nombre,
        clienteTelefono: client.telefono || '',
        clienteEmail: client.email || '',
        clienteCuit: client.cuitDni || client.cuit || '',
        localizacionDireccion: client.direccion || editingProject.localizacionDireccion,
        localizacionCiudad: client.localidad || editingProject.localizacionCiudad,
        localizacionProvincia: client.provincia || editingProject.localizacionProvincia,
      });
      // Seleccionar primera obra si existe
      if (client.obras && client.obras.length > 0) {
        setSelectedObraId(client.obras[0].id);
      } else {
        setSelectedObraId('');
      }
    }
  };

  const handleObraSelect = (obraId: string) => {
    setSelectedObraId(obraId);
    const client = getClientById(selectedClientId);
    const obra = client?.obras?.find(o => o.id === obraId);
    if (obra && editingProject) {
      setEditingProject({
        ...editingProject,
        obraId: obra.id,
        localizacionDireccion: obra.direccion || editingProject.localizacionDireccion,
        localizacionCiudad: obra.localidad || editingProject.localizacionCiudad,
        localizacionProvincia: obra.provincia || editingProject.localizacionProvincia,
      });
    }
  };

  const handleCreateQuickClient = () => {
    if (!newClientName.trim()) return;
    const created = addClient(newClientName.trim());
    setSelectedClientId(created.id);
    setShowNewClientInput(false);
    setNewClientName('');
    handleClientSelect(created.id);
  };

  const handleCreateQuickObra = () => {
    if (!selectedClientId || !newObraName.trim()) return;
    const created = addObra(selectedClientId, newObraName.trim(), newObraAddress.trim());
    if (created) {
      setSelectedObraId(created.id);
      setShowNewObraInput(false);
      setNewObraName('');
      setNewObraAddress('');
      handleObraSelect(created.id);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) {
      const isNew = !projects.some(p => p.id === editingProject.id);
      const toSave = {
        ...editingProject,
        clienteId: selectedClientId || editingProject.clienteId,
        obraId: selectedObraId || editingProject.obraId,
        updatedAt: Date.now()
      };

      if (isNew) {
        addProject(toSave);
      } else {
        updateProject(editingProject.id, () => toSave);
      }
      setEditingProject(null);
    }
  };

  const handleBackupExport = () => {
    exportBackupJSON(projects);
  };

  const handleBackupImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await parseBackupJSON(file);
      if (confirm(`Se importarán ${imported.length} proyecto(s). ¿Continuar?`)) {
        importProjects(imported);
      }
    } catch (err: any) {
      alert(`Error al importar backup: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendToCotizador = async (p: Project) => {
    const client = getClientById(p.clienteId);
    const obra = client?.obras?.find(o => o.id === p.obraId);
    const res = await enviarAlCotizador(p, client, obra);
    if (confirm(`${res.message}\n\n¿Deseas abrir el Cotizador ahora para ver el presupuesto?`)) {
      window.open(res.urlCotizador, '_blank');
    }
  };

  const formatDate = (ms: number) => new Date(ms).toLocaleDateString();
  const selectedClient = getClientById(selectedClientId);

  const activeProjects = projects.filter(p => !p.deleted);
  const activeClients = clients.filter(c => !c.deleted);

  return (
    <div className="dashboard-screen">
      <div className="dashboard-container">
        {/* Hidden file input for JSON restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".json,application/json"
        style={{ display: 'none' }}
      />

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--r-sm)',
              background: 'var(--primary-container)',
              color: 'var(--on-primary-container)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FolderKanban size={26} />
          </div>
          <div>
            <h1 className="m3-headline-small" style={{ margin: 0, color: 'var(--on-surface)' }}>
              Relevamientos & Planos
            </h1>
            <p className="m3-label-medium" style={{ margin: 0, color: 'var(--on-surface-var)' }}>
              {activeProjects.length} relevamiento{activeProjects.length === 1 ? '' : 's'} · {activeClients.length} cliente{activeClients.length === 1 ? '' : 's'} · Suite ieBA
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Cloud sync button */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowSyncModal(true)}
            title="Sincronización Descentralizada (Google Drive, Local, JSON)"
          >
            <Cloud size={16} />
            <span className="hide-mobile">Sincronización</span>
          </button>

          {/* Theme switcher */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={toggleTheme}
            title={`Tema actual: ${themeMode === 'system' ? 'Sistema' : themeMode === 'dark' ? 'Oscuro' : 'Claro'}`}
          >
            {themeMode === 'system' && <Monitor size={16} />}
            {themeMode === 'dark' && <Moon size={16} />}
            {themeMode === 'light' && <Sun size={16} />}
          </button>

          {/* Config button */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowConfigModal(true)}
            title="Configuración de Traza y Perfil"
          >
            <Settings size={16} />
            <span className="hide-mobile">Configuración</span>
          </button>

          {/* Backup buttons */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleBackupExport}
            title="Descargar copia de seguridad JSON"
          >
            <Download size={16} />
            <span className="hide-mobile">Backup</span>
          </button>

          <button
            className="btn btn-ghost btn-sm"
            onClick={handleBackupImportClick}
            title="Restaurar backup JSON"
          >
            <Upload size={16} />
            <span className="hide-mobile">Restaurar</span>
          </button>

          {/* User profile / Logout */}
          {user && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--surface-container)',
                padding: '4px 12px 4px 6px',
                borderRadius: 'var(--r-full)',
                border: '1px solid var(--outline-var)',
              }}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" style={{ width: 26, height: 26, borderRadius: '50%' }} />
              ) : (
                <UserIcon size={16} style={{ color: 'var(--primary)' }} />
              )}
              <span className="m3-label-large" style={{ color: 'var(--on-surface)', fontSize: 13 }}>
                {user.displayName || user.email}
              </span>
              <button
                className="btn btn-ghost btn-xs btn-icon"
                onClick={logout}
                title="Cerrar sesión"
                style={{ width: '26px', height: '26px' }}
              >
                <LogOut size={13} />
              </button>
            </div>
          )}

          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={18} />
            <span>Nuevo Relevamiento</span>
          </button>
        </div>
      </div>

      {/* Grid de Proyectos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 350px), 1fr))', gap: '1.5rem' }}>
        {activeProjects.length === 0 ? (
          <div
            className="empty-state"
            style={{
              gridColumn: '1 / -1',
              background: 'var(--surface-container-low)',
              borderRadius: 'var(--r-lg)',
              border: '1px dashed var(--outline)',
              padding: '4rem 2rem',
            }}
          >
            <HardDrive size={48} style={{ opacity: 0.5, color: 'var(--primary)' }} />
            <div className="m3-title-medium" style={{ color: 'var(--on-surface)' }}>
              No hay relevamientos guardados
            </div>
            <div className="m3-body-small" style={{ color: 'var(--on-surface-var)', textAlign: 'center', maxWidth: 420 }}>
              Creá un nuevo croquis para comenzar a relevar ambientes, paredes y circuitos o sincronizá con tu Google Drive.
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button className="btn btn-acc" onClick={handleOpenCreateModal}>
                <Plus size={18} />
                <span>Crear Relevamiento</span>
              </button>
              <button className="btn btn-ghost" onClick={() => setShowSyncModal(true)}>
                <Cloud size={16} />
                <span>Sincronizar con Drive</span>
              </button>
            </div>
          </div>
        ) : (
          activeProjects.map((p) => {
            const client = getClientById(p.clienteId);
            const obra = client?.obras?.find(o => o.id === p.obraId);

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  background: 'var(--surface-container)',
                  borderRadius: 'var(--r)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  border: '1px solid var(--outline-var)',
                  transition: 'transform .2s ease, box-shadow .2s ease',
                }}
              >
                <div>
                  <h3 className="m3-title-large" style={{ margin: 0, color: 'var(--on-surface)' }}>
                    {p.nombre}
                  </h3>
                  <div
                    className="m3-label-small"
                    style={{
                      color: 'var(--on-surface-var)',
                      marginTop: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Calendar size={12} />
                    <span>Actualizado: {formatDate(p.updatedAt)}</span>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--on-surface-var)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    background: 'var(--surface-container-low)',
                    padding: '10px 12px',
                    borderRadius: 'var(--r-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserIcon size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span>
                      <strong style={{ color: 'var(--on-surface)' }}>Cliente:</strong>{' '}
                      {client ? (client.razonSocial || client.nombre) : (p.clienteNombre || 'Sin asignar')}
                    </span>
                  </div>

                  {obra && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      <span>
                        <strong style={{ color: 'var(--on-surface)' }}>Obra:</strong> {obra.nombre}
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span>
                      <strong style={{ color: 'var(--on-surface)' }}>Ubicación:</strong>{' '}
                      {p.localizacionDireccion || 'Sin especificar'} {p.localizacionCiudad ? `(${p.localizacionCiudad})` : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span>
                      <strong style={{ color: 'var(--on-surface)' }}>Ambientes:</strong> {p.ambientes?.length || 0}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: '1 1 90px' }}
                    onClick={() => selectProject(p.id)}
                    title="Abrir editor de croquis"
                  >
                    <FolderOpen size={16} />
                    <span>Abrir</span>
                  </button>

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleSendToCotizador(p)}
                    title="Enviar cómputo de materiales al Cotizador"
                    style={{ color: 'var(--primary)' }}
                  >
                    <Send size={14} />
                    <span className="hide-mobile">Cotizar</span>
                  </button>

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleEditProject(p)}
                    title="Editar datos del proyecto"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => exportAllProjectData(p)}
                    title="Exportar planos e informes"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDuplicate(p)}
                    title="Duplicar proyecto"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      if (confirm(`¿Eliminar relevamiento "${p.nombre}"?`)) deleteProject(p.id);
                    }}
                    title="Eliminar relevamiento"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal M3 para Crear / Editar Proyecto con Selector de Clientes y Obras */}
      {editingProject && (
        <Modal
          isOpen={true}
          onClose={() => setEditingProject(null)}
          title={projects.some(p => p.id === editingProject.id) ? "Editar Relevamiento" : "Nuevo Relevamiento"}
          maxWidth="620px"
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setEditingProject(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveEdit}
              >
                Guardar
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <F label="Nombre del Relevamiento / Plano *">
                  <input
                    required
                    type="text"
                    value={editingProject.nombre}
                    onChange={(e) => setEditingProject({ ...editingProject, nombre: e.target.value })}
                    placeholder="Ej: Croquis Eléctrico - Planta Baja"
                  />
                </F>
              </div>

              {/* Selector de Cliente */}
              <div style={{ gridColumn: '1 / -1' }}>
                <F label="Cliente Asociado (Suite ieBA)">
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={selectedClientId}
                      onChange={(e) => handleClientSelect(e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">-- Seleccionar de mis Clientes --</option>
                      {activeClients.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.razonSocial || c.nombre || c.nombreFantasia || 'Cliente sin nombre'} {c.cuitDni ? `(${c.cuitDni})` : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowNewClientInput(!showNewClientInput)}
                      title="Crear nuevo cliente rápido"
                    >
                      <Plus size={16} />
                      <span>{showNewClientInput ? 'Cancelar' : 'Nuevo'}</span>
                    </button>
                  </div>
                </F>

                {showNewClientInput && (
                  <div style={{ marginTop: '8px', padding: '10px', background: 'var(--surface-container-high)', borderRadius: 'var(--r-sm)', display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Nombre / Razón Social del nuevo cliente"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn btn-primary btn-sm" onClick={handleCreateQuickClient}>
                      Agregar Cliente
                    </button>
                  </div>
                )}
              </div>

              {/* Selector de Obra del Cliente */}
              {selectedClientId && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <F label="Obra / Inmueble del Cliente">
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        value={selectedObraId}
                        onChange={(e) => handleObraSelect(e.target.value)}
                        style={{ flex: 1 }}
                      >
                        <option value="">-- Seleccionar Obra --</option>
                        {selectedClient?.obras?.map(o => (
                          <option key={o.id} value={o.id}>
                            {o.nombre} ({o.direccion})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setShowNewObraInput(!showNewObraInput)}
                        title="Crear nueva obra para este cliente"
                      >
                        <Plus size={16} />
                        <span>{showNewObraInput ? 'Cancelar' : 'Nueva Obra'}</span>
                      </button>
                    </div>
                  </F>

                  {showNewObraInput && (
                    <div style={{ marginTop: '8px', padding: '10px', background: 'var(--surface-container-high)', borderRadius: 'var(--r-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Nombre de la Obra (ej: Depto 4B, Local Centro)"
                        value={newObraName}
                        onChange={(e) => setNewObraName(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          placeholder="Dirección física de la obra"
                          value={newObraAddress}
                          onChange={(e) => setNewObraAddress(e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <button type="button" className="btn btn-primary btn-sm" onClick={handleCreateQuickObra}>
                          Guardar Obra
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ gridColumn: '1 / -1' }}>
                <F label="Dirección de la Instalación">
                  <input
                    type="text"
                    value={editingProject.localizacionDireccion || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, localizacionDireccion: e.target.value })}
                  />
                </F>
              </div>

              <div>
                <F label="Ciudad">
                  <input
                    type="text"
                    value={editingProject.localizacionCiudad || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, localizacionCiudad: e.target.value })}
                  />
                </F>
              </div>
              <div>
                <F label="Provincia">
                  <input
                    type="text"
                    value={editingProject.localizacionProvincia || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, localizacionProvincia: e.target.value })}
                  />
                </F>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <F label="Descripción / Notas del Relevamiento">
                  <textarea
                    rows={2}
                    value={editingProject.descripcion || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, descripcion: e.target.value })}
                  />
                </F>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal M3 de Configuración General de la Suite */}
      <ConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />

      {/* Modal M3 de Sincronización Descentralizada */}
      <SyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
      />
      </div>
    </div>
  );
}
