import { useAuth } from '../../core/AuthContext';

export function LoginScreen() {
  const { signInWithGoogle } = useAuth();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)'
    }}>
      <div style={{
        background: 'var(--surface-1)',
        padding: '3rem',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-2)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h1 style={{ margin: '0 0 1rem 0', color: 'var(--primary)' }}>Traza</h1>
        <p style={{ color: 'var(--text-dim)', marginBottom: '2rem' }}>
          Iniciá sesión para acceder a tus proyectos y sincronizarlos en la nube.
        </p>

        <button 
          onClick={signInWithGoogle}
          style={{
            background: 'white',
            color: '#333',
            border: '1px solid #ccc',
            padding: '12px 24px',
            fontSize: '16px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            width: '100%',
            fontWeight: 500
          }}
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: 18, height: 18 }} />
          Ingresar con Google
        </button>
      </div>
    </div>
  );
}
