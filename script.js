const API_URL = 'https://e4dmfbytp7.execute-api.us-east-1.amazonaws.com/prod/produtos';
let produtosCache = [];

// Elementos do modal
const overlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.querySelector('.modal-body');
const btnConfirm = document.getElementById('modal-confirm-btn');
const btnCancel = document.getElementById('modal-cancel-btn');

btnCancel.addEventListener('click', () => hideModal());

function showModal(title, bodyHTML, onConfirm) {
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHTML;
  btnConfirm.onclick = () => { onConfirm(); hideModal(); };
  overlay.classList.remove('hidden');
}

function hideModal() {
  overlay.classList.add('hidden');
  modalBody.innerHTML = '';
}

// Carrega todos os produtos
async function carregarProdutos() {
  try {
    const resp = await fetch(API_URL);
    if (!resp.ok) throw new Error('Erro ao carregar produtos');
    const data = await resp.json();
    produtosCache = Array.isArray(data) ? data : (data.produtos || []);

    const tbody = document.getElementById('produtos-lista');
    if (produtosCache.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">Nenhum produto cadastrado</td></tr>';
      return;
    }
    tbody.innerHTML = produtosCache.map(p => `
      <tr>
        <td>${p.id}</td>
        <td>${p.nome}</td>
        <td>R$ ${parseFloat(p.preco).toFixed(2)}</td>
        <td>${p.quantidade}</td>
        <td>
          <button class="btn-action" data-id="${p.id}" data-action="edit">Editar</button>
          <button class="btn-action" data-id="${p.id}" data-action="delete">Excluir</button>
        </td>
      </tr>
    `).join('');

    // Vincula eventos de editar/excluir
    tbody.querySelectorAll('.btn-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const prod = produtosCache.find(x => x.id === btn.dataset.id);
        if (btn.dataset.action === 'edit') showEditModal(prod);
        else showDeleteModal(prod);
      });
    });

  } catch (e) {
    console.error(e);
    alert('Erro ao carregar produtos');
  }
}

// Modal de edição
function showEditModal(produto) {
  const bodyHTML = `
    <div class="form-group">
      <label>ID</label>
      <input type="text" id="edit-id" value="${produto.id}" readonly>
    </div>
    <div class="form-group">
      <label>Nome</label>
      <input type="text" id="edit-nome" value="${produto.nome}">
    </div>
    <div class="form-group">
      <label>Preço</label>
      <input type="number" step="0.01" id="edit-preco" value="${produto.preco}">
    </div>
    <div class="form-group">
      <label>Quantidade</label>
      <input type="number" id="edit-quantidade" value="${produto.quantidade}">
    </div>
  `;
  showModal(`Editar Produto ${produto.id}`, bodyHTML, async () => {
    const updated = {
      nome: document.getElementById('edit-nome').value.trim(),
      preco: parseFloat(document.getElementById('edit-preco').value),
      quantidade: parseInt(document.getElementById('edit-quantidade').value)
    };
    await fetch(`${API_URL}/${produto.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    carregarProdutos();
  });
}

// Modal de exclusão
function showDeleteModal(produto) {
  const bodyHTML = `<p>Tem certeza que deseja excluir o produto <strong>${produto.id} – ${produto.nome}</strong>?</p>`;
  showModal('Confirmar Exclusão', bodyHTML, async () => {
    await fetch(`${API_URL}/${produto.id}`, { method: 'DELETE' });
    carregarProdutos();
  });
}

// Criar novo produto
async function cadastrarProduto() {
  const p = {
    id: document.getElementById('produtoId').value.trim(),
    nome: document.getElementById('produtoNome').value.trim(),
    preco: parseFloat(document.getElementById('produtoPreco').value),
    quantidade: parseInt(document.getElementById('produtoQuantidade').value)
  };
  if (!p.id || !p.nome) { alert('Preencha ID e Nome'); return; }
  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    });
    if (resp.status === 409) { alert('ID já existe'); return; }
    if (!resp.ok) throw new Error();
    carregarProdutos();
  } catch (e) {
    console.error(e);
    alert('Erro ao cadastrar produto');
  }
}

// Buscar por ID (renderiza só o produto encontrado)
async function buscarProduto() {
  const id = document.getElementById('searchId').value.trim();
  if (!id) { alert('Digite um ID para buscar'); return; }
  try {
    const resp = await fetch(`${API_URL}/${id}`);
    if (resp.status === 404) { alert('Produto não encontrado'); return; }
    if (!resp.ok) throw new Error();
    const produto = await resp.json();
    const tbody = document.getElementById('produtos-lista');
    tbody.innerHTML = `
      <tr>
        <td>${produto.id}</td>
        <td>${produto.nome}</td>
        <td>R$ ${parseFloat(produto.preco).toFixed(2)}</td>
        <td>${produto.quantidade}</td>
        <td>
          <button class="btn-action" data-id="${produto.id}" data-action="edit">Editar</button>
          <button class="btn-action" data-id="${produto.id}" data-action="delete">Excluir</button>
        </td>
      </tr>
    `;
    // Vincula eventos no resultado único
    tbody.querySelectorAll('.btn-action').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.action === 'edit') showEditModal(produto);
        else showDeleteModal(produto);
      });
    });
  } catch (e) {
    console.error(e);
    alert('Erro ao buscar produto');
  }
}

window.addEventListener('DOMContentLoaded', carregarProdutos);
