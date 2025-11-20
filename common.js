// common.js - injeta cabeçalho e lida com login básico via localStorage
(function(){
  function buildHeader(){
    const header = document.createElement('header'); header.className='site-header';
    const left = document.createElement('div'); left.innerHTML = `<div class="logo">ReservaSalas</div>`;
    const nav = document.createElement('nav');
    // use buttons for main actions; admin button is added later if user is admin
    nav.innerHTML = `
      <button onclick="location.href='/'">Início</button>
      <button onclick="location.href='/rooms.html'">Salas</button>
      <button onclick="location.href='/favorites.html'">Favoritos</button>
      <button onclick="location.href='/reservations.html'">Reservas</button>
    `;
    const right = document.createElement('div');
    const token = localStorage.getItem('token');
    if(token){
      // fetch user to check admin
      const name = localStorage.getItem('userName') || ('Usuário '+token);
      right.innerHTML = `<span style="margin-right:12px;font-weight:600">${name}</span><button id="logoutBtn" class="btn">Sair</button>`;
      // check admin status and add admin button if applicable
      fetch(`/api/user/${token}`).then(r=>{
        if(!r.ok) return;
        return r.json();
      }).then(u=>{
        if(!u) return;
        if(u.isAdmin){
          const adminBtn = document.createElement('button');
          adminBtn.textContent = 'Admin';
          adminBtn.className = 'btn';
          adminBtn.style.marginLeft = '10px';
          adminBtn.addEventListener('click', ()=> location.href = '/admin.html');
          nav.appendChild(adminBtn);
        }
      }).catch(()=>{});
    } else {
      right.innerHTML = `<button id="loginBtn" class="btn primary">Entrar</button>`;
    }
    header.appendChild(left);
    header.appendChild(nav);
    header.appendChild(right);
    return header;
  }

  function addHeader(){
    // evitar duplicar
    if(document.querySelector('.site-header')) return;
    const h = buildHeader();
    document.body.insertBefore(h, document.body.firstChild);
    if(document.getElementById('loginBtn')){
      document.getElementById('loginBtn').addEventListener('click', ()=>{
        // if page has an inline login box, open it; otherwise go to home
        const box = document.getElementById('loginBox');
        if(box){ box.style.display = 'block'; const first = box.querySelector('input'); if(first) first.focus(); }
        else location.href = '/';
      });
    }
    if(document.getElementById('logoutBtn')){
      document.getElementById('logoutBtn').addEventListener('click', ()=>{ localStorage.removeItem('token'); localStorage.removeItem('userName'); location.reload(); });
    }
  }

  // injeta estilo principal
  const l = document.createElement('link'); l.rel='stylesheet'; l.href='/styles.css'; document.head.appendChild(l);
  // construir header no DOM pronto
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addHeader); else addHeader();

})();
