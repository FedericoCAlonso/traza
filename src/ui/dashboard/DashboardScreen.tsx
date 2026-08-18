import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { createProject } from '../../lib/storage';
import { exportAllProjectData } from '../../lib/exporters';
import { useAuth } from '../../core/AuthContext';
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
  Calendar 
} from 'lucide-react';

export function DashboardScreen() {
  const { user, logout } = useAuth();
  const { projects, addProject, selectProject, deleteProject, updateProject, duplicateProject } = useProjectStore();
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const handleCreateProject = () => {
    const newProj = createProject('Nuevo Proyecto');
    addProject(newProj);
    setEditingProject(newProj);
  };

  const handleDuplicate = (p: Project) => {
    duplicateProject(p.id);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) {
      updateProject(editingProject.id, () => ({ ...editingProject, updatedAt: Date.now() }));
      setEditingProject(null);
    }
  };

  const formatDate = (ms: number) => new Date(ms).toLocaleDateString();

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--sans)', color: 'var(--on-surface)' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--r-sm)',
              background: 'var(--primary-container)',
              color: 'var(--on-primary-container)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FolderKanban size={24} />
          </div>
          <div>
            <h1 className="m3-headline-small" style={{ margin: 0, color: 'var(--on-surface)' }}>
              Mis Proyectos
            </h1>
            <p className="m3-label-medium" style={{ margin: 0, color: 'var(--on-surface-var)' }}>
              {projects.length} proyecto{projects.length === 1 ? '' : 's'} en total
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--surface-container)',
                padding: '6px 14px 6px 8px',
                borderRadius: 'var(--r-full)',
                border: '1px solid var(--outline-var)',
              }}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" style={{ width: 28, height: 28, borderRadius: '50%' }} />
              ) : (
                <UserIcon size={18} style={{ color: 'var(--primary)' }} />
              )}
              <span className="m3-label-large" style={{ color: 'var(--on-surface)' }}>
                {user.displayName || user.email}
              </span>
              <button
                className="btn btn-ghost btn-xs btn-icon"
                onClick={logout}
                title="Cerrar sesión"
                style={{ width: '28px', height: '28px', marginLeft: 4 }}
              >
                <LogOut size={14} />
              </button>
            </div>
          )}

          <button className="btn btn-primary" onClick={handleCreateProject}>
            <Plus size={18} />
            <span>Nuevo Proyecto</span>
          </button>
        </div>
      </div>

      {/* Grid de Proyectos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '1.5rem' }}>
        {projects.length === 0 ? (
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
            <FolderKanban size={48} style={{ opacity: 0.5, color: 'var(--primary)' }} />
            <div className="m3-title-medium" style={{ color: 'var(--on-surface)' }}>
              No hay proyectos guardados
            </div>
            <div className="m3-body-small" style={{ color: 'var(--on-surface-var)', textAlign: 'center', maxWidth: 400 }}>
              Creá un nuevo proyecto para comenzar a relevar ambientes, trazar muros y diagramar circuitos eléctricos.
            </div>
            <button className="btn btn-acc" onClick={handleCreateProject} style={{ marginTop: '8px' }}>
              <Plus size={18} />
              <span>Crear mi primer proyecto</span>
            </button>
          </div>
        ) : (
          projects.map((p) => (
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
                    <strong style={{ color: 'var(--on-surface)' }}>Cliente:</strong> {p.clienteNombre || 'Sin especificar'}
                  </span>
                </div>
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
                  style={{ flex: '1 1 100px' }}
                  onClick={() => selectProject(p.id)}
                  title="Abrir editor"
                >
                  <FolderOpen size={16} />
                  <span>Abrir</span>
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setEditingProject(p)}
                  title="Editar datos del proyecto"
                >
                  <Pencil size={14} />
                  <span className="hide-mobile">Editar</span>
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => exportAllProjectData(p)}
                  title="Exportar informes y planos"
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
                    if (confirm(`¿Eliminar proyecto "${p.nombre}"?`)) deleteProject(p.id);
                  }}
                  title="Eliminar proyecto"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal M3 para Editar Proyecto */}
      {editingProject && (
        <Modal
          isOpen={true}
          onClose={() => setEditingProject(null)}
          title="Editar Proyecto"
          maxWidth="560px"
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setEditingProject(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  updateProject(editingProject.id, () => ({ ...editingProject, updatedAt: Date.now() }));
                  setEditingProject(null);
                }}
              >
                Guardar Cambios
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <F label="Nombre del Proyecto *">
                  <input
                    required
                    type="text"
                    value={editingProject.nombre}
                    onChange={(e) => setEditingProject({ ...editingProject, nombre: e.target.value })}
                  />
                </F>
              </div>

              <div>
                <F label="Cliente (Nombre)">
                  <input
                    type="text"
                    value={editingProject.clienteNombre || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, clienteNombre: e.target.value })}
                  />
                </F>
              </div>
              <div>
                <F label="Teléfono Cliente">
                  <input
                    type="text"
                    value={editingProject.clienteTelefono || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, clienteTelefono: e.target.value })}
                  />
                </F>
              </div>

              <div>
                <F label="Email Cliente">
                  <input
                    type="email"
                    value={editingProject.clienteEmail || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, clienteEmail: e.target.value })}
                  />
                </F>
              </div>
              <div>
                <F label="CUIT / DNI">
                  <input
                    type="text"
                    value={editingProject.clienteCuit || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, clienteCuit: e.target.value })}
                  />
                </F>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <F label="Dirección de la Obra">
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
                <F label="Descripción / Notas">
                  <textarea
                    rows={3}
                    value={editingProject.descripcion || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, descripcion: e.target.value })}
                  />
                </F>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
