import { useState } from 'react';
import api from './api';

export default function UsersManager({ usersList, setUsersList, updateData, currentUser }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // admin ou user

  const isAdmin = currentUser?.role === 'admin';

  const openCreateModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('user');
    setIsModalOpen(true);
  };

  const openEditModal = (userToEdit) => {
    setEditingUser(userToEdit);
    setName(userToEdit.name);
    setEmail(userToEdit.email);
    setPassword(''); // Deixar em branco por padrão na edição
    setRole(userToEdit.role || 'user');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return alert("Preencha o nome e o e-mail.");

    if (editingUser) {
      // MODO EDIÇÃO (PUT /api/users/:id)
      try {
        const response = await api.put(`/users/${editingUser.id}`, {
          originalEmail: editingUser.email,
          name: name.trim(),
          email: email.trim(),
          role: isAdmin ? role : editingUser.role,
          password: password.trim() || undefined,
          requesterRole: currentUser?.role,
          requesterEmail: currentUser?.email
        });

        const updatedUser = response.data.user;
        const updatedList = usersList.map(u => u.id === editingUser.id ? updatedUser : u);
        setUsersList(updatedList);
        if (updateData) updateData({ users: updatedList });

        alert("Usuário atualizado com sucesso!");
        setIsModalOpen(false);
      } catch (err) {
        console.error(err);
        const errMsg = err.response?.data?.error || "Erro ao atualizar usuário.";
        alert(errMsg);
      }
    } else {
      // MODO CRIAÇÃO
      if (!password.trim()) return alert("Defina uma senha para o novo usuário.");
      
      if (usersList.some(u => u.email.toLowerCase() === email.toLowerCase().trim())) {
        return alert("Este e-mail já está cadastrado.");
      }

      const newUser = {
        id: Date.now(),
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role
      };

      const updated = [...usersList, newUser];
      setUsersList(updated);
      if (updateData) updateData({ users: updated });
      setIsModalOpen(false);

      setName('');
      setEmail('');
      setPassword('');
      setRole('user');
    }
  };

  const handleDelete = (id) => {
    if (confirm("Tem certeza que deseja remover este usuário?")) {
      const userToDelete = usersList.find(u => u.id === id);
      if (userToDelete && userToDelete.email === currentUser?.email) {
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
          <p className="text-muted">Adicione, edite ou remova usuários do sistema.</p>
        </div>
        {isAdmin && (
          <button className="primary" onClick={openCreateModal}>
            + Novo Usuário
          </button>
        )}
      </div>

      <div className="card">
        <div className="table-responsive">
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
              {usersList.map(u => {
                const canEdit = isAdmin || u.email?.toLowerCase() === currentUser?.email?.toLowerCase();
                const canDelete = isAdmin && u.email?.toLowerCase() !== currentUser?.email?.toLowerCase();

                return (
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
                      <div className="flex gap-2">
                        {canEdit && (
                          <button 
                            className="btn-sm" 
                            style={{background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-color)'}} 
                            onClick={() => openEditModal(u)}
                          >
                            ✏️ Editar
                          </button>
                        )}
                        {canDelete && (
                          <button 
                            className="btn-sm btn-danger" 
                            style={{background: '#ef4444', color: '#fff'}} 
                            onClick={() => handleDelete(u.id)}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação / Edição */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-card" style={{padding: '2rem', maxWidth: '400px', width: '100%', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px'}}>
            <h3 style={{marginBottom: '1rem'}}>{editingUser ? 'Editar Usuário' : 'Cadastrar Usuário'}</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="input-group">
                <label>Nome Completo</label>
                <input required type="text" className="premium-input" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="input-group">
                <label>E-mail</label>
                <input required type="email" className="premium-input" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Senha {editingUser && <span className="text-muted text-xs">(Deixe em branco para não alterar)</span>}</label>
                <input 
                  type="password" 
                  className="premium-input" 
                  placeholder={editingUser ? "••••••••" : "Nova senha"} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required={!editingUser}
                />
              </div>
              <div className="input-group">
                <label>Nível de Acesso</label>
                <select 
                  className="premium-input" 
                  value={role} 
                  onChange={e => setRole(e.target.value)}
                  disabled={!isAdmin}
                >
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
