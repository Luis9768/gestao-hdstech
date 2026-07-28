import { useState } from 'react';

export default function UsersManager({ usersList, setUsersList, updateData, currentUser }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // admin ou user

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!name || !email || !password) return alert("Preencha todos os campos");
    
    if (usersList.some(u => u.email === email)) {
      return alert("Este e-mail já está cadastrado.");
    }

    const newUser = {
      id: Date.now(),
      name,
      email,
      password,
      role
    };

    const updated = [...usersList, newUser];
    setUsersList(updated);
    if (updateData) updateData({ users: updated });
    setIsModalOpen(false);
    
    // Reset form
    setName('');
    setEmail('');
    setPassword('');
    setRole('user');
  };

  const handleDelete = (id) => {
    if (confirm("Tem certeza que deseja remover este usuário?")) {
      const userToDelete = usersList.find(u => u.id === id);
      if (userToDelete.email === currentUser.email) {
        return alert("Você não pode excluir sua própria conta.");
      }
      const updated = usersList.filter(u => u.id !== id);
      setUsersList(updated);
      if (updateData) updateData({ users: updated });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2>Gestão de Equipe</h2>
          <p className="text-muted">Adicione ou remova usuários do sistema.</p>
        </div>
        <button className="primary" onClick={() => setIsModalOpen(true)}>
          + Novo Usuário
        </button>
      </div>

      <div className="card">
        <table className="w-full" style={{textAlign: 'left', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{borderBottom: '1px solid var(--border-color)'}}>
              <th style={{padding: '12px'}}>Nome</th>
              <th style={{padding: '12px'}}>E-mail</th>
              <th style={{padding: '12px'}}>Perfil</th>
              <th style={{padding: '12px'}}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {usersList.map(u => (
              <tr key={u.id} style={{borderBottom: '1px solid var(--border-color)'}}>
                <td style={{padding: '12px'}}><strong>{u.name}</strong></td>
                <td style={{padding: '12px', color: 'var(--text-muted)'}}>{u.email}</td>
                <td style={{padding: '12px'}}>
                  <span style={{
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '0.8rem',
                    background: u.role === 'admin' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-color)',
                    color: u.role === 'admin' ? 'var(--primary-color)' : 'var(--text-muted)'
                  }}>
                    {u.role === 'admin' ? 'Administrador' : 'Usuário Comum'}
                  </span>
                </td>
                <td style={{padding: '12px'}}>
                  {u.email !== currentUser.email && (
                    <button style={{background: '#ef4444', color: '#fff', padding: '6px 12px', fontSize: '0.8rem'}} onClick={() => handleDelete(u.id)}>Remover</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-card" style={{padding: '2rem', maxWidth: '400px', width: '100%', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px'}}>
            <h3 style={{marginBottom: '1rem'}}>Cadastrar Usuário</h3>
            <form onSubmit={handleAddUser} className="flex flex-col gap-4">
              <div className="input-group">
                <label>Nome Completo</label>
                <input required type="text" className="premium-input" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="input-group">
                <label>E-mail</label>
                <input required type="email" className="premium-input" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Senha</label>
                <input required type="text" className="premium-input" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Nível de Acesso</label>
                <select className="premium-input" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="user">Usuário Comum</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} style={{flex: 1, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)'}}>Cancelar</button>
                <button type="submit" className="primary" style={{flex: 1}}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
