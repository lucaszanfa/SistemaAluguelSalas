// common.js copied to assets and updated to use new CSS path
(function(){
  function buildHeader(){
    const header = document.createElement('header'); header.className='site-header';

    const navWrapper = document.createElement('div'); navWrapper.className = 'nav-wrapper';
    const nav = document.createElement('nav');
    nav.innerHTML = `
      <button onclick="location.href='/'">Início</button>
      <button onclick="location.href='/rooms.html'">Salas</button>
      <button onclick="location.href='/favorites.html'">Favoritos</button>
      <button onclick="location.href='/reservations.html'">Reservas</button>
    `;

    // menu button for small screens
    const menuBtn = document.createElement('button');
    menuBtn.className = 'menu-btn';
    menuBtn.innerHTML = '☰';
    menuBtn.addEventListener('click', ()=>{
      nav.classList.toggle('expanded');
    });
    navWrapper.appendChild(menuBtn);
    navWrapper.appendChild(nav);

    const logo = document.createElement('div'); logo.className='logo';
    logo.innerHTML = `<img src="/assets/images/logospace.png" alt="Logo"><div class="brand">ReservaSalas</div>`;
    logo.addEventListener('click', ()=>location.href='/');

    const right = document.createElement('div'); right.className='actions';
    const token = localStorage.getItem('token');
    if(token){
      const name = localStorage.getItem('userName') || ('Usuário '+token);
      right.innerHTML = `<span class="user-label">${name}</span><button id="logoutBtn" class="btn ghost">Sair</button>`;
      fetch(`/api/user/${token}`).then(r=>{ if(!r.ok) return; return r.json(); }).then(u=>{
        if(u && u.isAdmin){
          const adminBtn = document.createElement('button');
          adminBtn.textContent='Admin';
          adminBtn.className='btn primary light';
          adminBtn.addEventListener('click', ()=> location.href='/admin.html');
          right.appendChild(adminBtn);
        }
      }).catch(()=>{});
    } else {
      right.innerHTML = `
        <button id="registerBtn" class="btn ghost">Registrar</button>
        <button id="loginBtn" class="btn primary">Entrar</button>
      `;
    }

    header.appendChild(navWrapper);
    header.appendChild(logo);
    header.appendChild(right);
    return header;
  }

  function addHeader(){
    if(document.querySelector('.site-header')) return;
    const h = buildHeader(); document.body.insertBefore(h, document.body.firstChild);
    const loginBtn = document.getElementById('loginBtn'); if(loginBtn){ loginBtn.addEventListener('click', ()=>{ const box=document.getElementById('loginBox'); if(box){ box.style.display='block'; const first=box.querySelector('input'); if(first) first.focus(); } else location.href='/'; }); }
    const registerBtn = document.getElementById('registerBtn'); if(registerBtn){ registerBtn.addEventListener('click', ()=> location.href='/register.html'); }
    const logout = document.getElementById('logoutBtn'); if(logout) logout.addEventListener('click', ()=>{
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      location.reload();
    });
    ensureReservationModal();
  }

  const reservationModal = {
    wrapper: null,
    form: null,
    date: null,
    time: null,
    message: null,
    submit: null,
    onConfirm: null,
  };

  function ensureReservationModal(){
    if(reservationModal.wrapper) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'reservationModal';
    wrapper.innerHTML = `
      <div class="reservation-dialog">
        <button type="button" class="close-modal" aria-label="Fechar">&times;</button>
        <div class="reservation-header">
          <p class="eyebrow">Reserva rápida</p>
          <h3>Escolha a data e horário</h3>
          <p class="reservation-message muted"></p>
        </div>
        <form class="reservation-form">
          <label class="label" for="reservationDate">Data</label>
          <input id="reservationDate" type="date" required />
          <label class="label" for="reservationTime">Horário (opcional)</label>
          <input id="reservationTime" type="time" />
          <div class="modal-actions">
            <button type="button" class="btn ghost dark cancel-modal">Cancelar</button>
            <button type="submit" class="btn primary">Confirmar reserva</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(wrapper);
    reservationModal.wrapper = wrapper;
    reservationModal.form = wrapper.querySelector('form');
    reservationModal.date = wrapper.querySelector('#reservationDate');
    reservationModal.time = wrapper.querySelector('#reservationTime');
    reservationModal.message = wrapper.querySelector('.reservation-message');
    reservationModal.submit = wrapper.querySelector('button[type="submit"]');
    const closeButtons = wrapper.querySelectorAll('.close-modal, .cancel-modal');
    closeButtons.forEach(btn => btn.addEventListener('click', closeReservationModal));
    wrapper.addEventListener('click', (e)=>{ if(e.target === wrapper) closeReservationModal(); });
    reservationModal.form.addEventListener('submit', handleReservationSubmit);
    document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeReservationModal(); });
  }

  function handleReservationSubmit(e){
    e.preventDefault();
    if(!reservationModal.onConfirm) return;
    const date = reservationModal.date.value;
    const time = reservationModal.time.value;
    reservationModal.message.textContent = '';
    if(!date){
      reservationModal.message.textContent = 'Selecione uma data para continuar.';
      reservationModal.date.focus();
      return;
    }
    const payload = { date, time };
    reservationModal.submit.disabled = true;
    reservationModal.submit.textContent = 'Enviando...';
    const result = reservationModal.onConfirm(payload);
    if(result && typeof result.then === 'function'){
      result.finally(resetReservationSubmitState);
    } else {
      resetReservationSubmitState();
    }
  }

  function resetReservationSubmitState(){
    if(!reservationModal.submit) return;
    reservationModal.submit.disabled = false;
    reservationModal.submit.textContent = 'Confirmar reserva';
  }

  function showReservationModal(opts){
    ensureReservationModal();
    reservationModal.onConfirm = opts && typeof opts.onConfirm === 'function' ? opts.onConfirm : null;
    reservationModal.date.value = opts && opts.date ? opts.date : '';
    reservationModal.time.value = opts && opts.time ? opts.time : '';
    reservationModal.message.textContent = '';
    reservationModal.wrapper.classList.add('open');
    setTimeout(()=> reservationModal.date.focus(), 50);
  }

  function closeReservationModal(){
    if(!reservationModal.wrapper) return;
    reservationModal.wrapper.classList.remove('open');
    resetReservationSubmitState();
  }

  window.showReservationModal = showReservationModal;
  window.closeReservationModal = closeReservationModal;

  const l = document.createElement('link'); l.rel='stylesheet'; l.href='/assets/css/styles.css'; document.head.appendChild(l);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addHeader); else addHeader();

})();
