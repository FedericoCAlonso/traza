import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { createProject } from '../../lib/storage';
import { exportAllProjectData } from '../../lib/exporters';
import { useAuth } from '../../core/AuthContext';
import type { Project } from '../../types/index';

export function DashboardScreen() {
  const { user, logout } = useAuth();
  const { projects, addProject, selectProject, deleteProject, updateProject } = useProjectStore();
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const handleCreateProject = () => {
    const newProj = createProject('Nuevo Proyecto');
    addProject(newProj);
    setEditingProject(newProj);
  };

  const handleDuplicate = (p: Project) => {
    const duplicated = {
      ...p,
      id: Date.now().toString(),
      nombre: `${p.nombre} (Copia)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    addProject(duplicated);
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
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--sans)', color: 'var(--text)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: 'var(--text-h)' }}>📁 Mis Proyectos (Traza)</h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {user.photoURL && <img src={user.photoURL} alt="Avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />}
              <span style={{ fontSize: 14 }}>{user.displayName || user.email}</span>
              <button className="btn btn-ghost btn-sm" onClick={logout} style={{ marginLeft: 8 }}>Salir</button>
            </div>
          )}
          <button className="btn btn-acc" onClick={handleCreateProject} style={{ padding: '8px 16px', fontSize: 14 }}>
            + Nuevo Proyecto
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {projects.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-dim)', background: 'var(--surface-1)', borderRadius: 8 }}>
            No hay proyectos. ¡Crea uno nuevo para empezar!
          </div>
        ) : (
          projects.map(p => (
            <div key={p.id} style={{ background: 'var(--surface-1)', border: '1px solid var(--outline-var)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: 'var(--shadow-1)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-h)' }}>{p.nombre}</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: 4 }}>
                  Actualizado: {formatDate(p.updatedAt)}
                </div>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text)' }}>
                <div><strong>Cliente:</strong> {p.clienteNombre || 'S/D'}</div>
                <div><strong>Ubicación:</strong> {p.localizacionDireccion || 'S/D'} {p.localizacionCiudad ? `(${p.localizacionCiudad})` : ''}</div>
                <div><strong>Ambientes:</strong> {p.ambientes?.length || 0}</div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => selectProject(p.id)}>Abrir</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingProject(p)}>✏️ Editar</button>
                <button className="btn btn-ghost btn-sm" onClick={() => exportAllProjectData(p)}>📥 Exportar</button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDuplicate(p)}>📄 Duplicar</button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => { if(confirm('¿Eliminar proyecto?')) deleteProject(p.id) }}>🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>

      {editingProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <form onSubmit={handleSaveEdit} className="card" style={{ width: '100%', maxWidth: 500, background: 'var(--surface-1)', padding: 24, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ margin: 0 }}>Editar Proyecto</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>Nombre del Proyecto *</label>
                <input required className="input" value={editingProject.nombre} onChange={e => setEditingProject({...editingProject, nombre: e.target.value})} />
              </div>
              
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>Cliente (Nombre)</label>
                <input className="input" value={editingProject.clienteNombre || ''} onChange={e => setEditingProject({...editingProject, clienteNombre: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>Teléfono Cliente</label>
                <input className="input" value={editingProject.clienteTelefono || ''} onChange={e => setEditingProject({...editingProject, clienteTelefono: e.target.value})} />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>Email Cliente</label>
                <input type="email" className="input" value={editingProject.clienteEmail || ''} onChange={e => setEditingProject({...editingProject, clienteEmail: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>CUIT / DNI</label>
                <input className="input" value={editingProject.clienteCuit || ''} onChange={e => setEditingProject({...editingProject, clienteCuit: e.target.value})} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>Dirección de la obra / ubicación</label>
                <input className="input" value={editingProject.localizacionDireccion || ''} onChange={e => setEditingProject({...editingProject, localizacionDireccion: e.target.value})} />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>Ciudad</label>
                <input className="input" value={editingProject.localizacionCiudad || ''} onChange={e => setEditingProject({...editingProject, localizacionCiudad: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>Provincia</label>
                <input className="input" value={editingProject.localizacionProvincia || ''} onChange={e => setEditingProject({...editingProject, localizacionProvincia: e.target.value})} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>Descripción / Notas</label>
                <textarea className="input" style={{ resize: 'vertical', minHeight: 60 }} value={editingProject.descripcion || ''} onChange={e => setEditingProject({...editingProject, descripcion: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEditingProject(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
