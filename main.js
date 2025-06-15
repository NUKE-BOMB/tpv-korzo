// Estado global
let stats = {entradas:0,botellas:0,personas:0,importe:0,porMetodo:{Efectivo:0,Tarjeta:0,Bizum:0}};
let history = [];
let catalog = JSON.parse(localStorage.getItem('catalog'))||{};
let compra = {entradas:0,botellas:{},personas:0,importe:0};

// Administración
function toggleAdminPanel(){
  const pin = prompt('Introduce PIN de administrador:');
  if(pin==='1234') document.getElementById('adminPanel').classList.toggle('hidden');
  else alert('PIN incorrecto');
}
function closeAdminPanel(){
  document.getElementById('adminPanel').classList.add('hidden');
}
function hideAllAdminSections(){
  ['statsSection','historySection','catalogSection'].forEach(id=>document.getElementById(id).classList.add('hidden'));
}
function showStatsSection(){hideAllAdminSections();renderStats();document.getElementById('statsSection').classList.remove('hidden');}
function showHistorySection(){hideAllAdminSections();renderHistory();document.getElementById('historySection').classList.remove('hidden');}
function showCatalogSection(){hideAllAdminSections();renderCatalogEditor();document.getElementById('catalogSection').classList.remove('hidden');}

// Render admin
function renderStats(){
  document.getElementById('statEntradas').innerText = stats.entradas;
  document.getElementById('statBotellas').innerText = stats.botellas;
  document.getElementById('statPersonas').innerText = stats.personas;
  document.getElementById('statImporte').innerText = stats.importe+'€';
  document.getElementById('statEfectivo').innerText = stats.porMetodo.Efectivo+'€';
  document.getElementById('statTarjeta').innerText = stats.porMetodo.Tarjeta+'€';
  document.getElementById('statBizum').innerText = stats.porMetodo.Bizum+'€';
}
function renderHistory(){
  const ul = document.getElementById('historyList'); ul.innerHTML = '';
  history.forEach(item=>{
    const li = document.createElement('li');
    li.textContent = `${item.fecha} – Entradas: ${item.entradas}, Botellas: ${JSON.stringify(item.botellas)}, E:${item.pagEfectivo}€, T:${item.pagTarjeta}€, B:${item.pagBizum}€, Total:${item.total}€`;
    ul.appendChild(li);
  });
}
function renderCatalogEditor(){
  const ul = document.getElementById('catalogEditor'); ul.innerHTML='';
  for(let name in catalog){
    const li = document.createElement('li');
    const inpName = document.createElement('input'); inpName.value = name;
    const inpPrice= document.createElement('input'); inpPrice.type='number'; inpPrice.value=catalog[name];
    const btnSave= document.createElement('button'); btnSave.textContent='Guardar';
    btnSave.onclick=()=>{
      const newName = inpName.value.trim(), newPrice=parseFloat(inpPrice.value);
      if(newName && newPrice>0){
        delete catalog[name]; catalog[newName]=newPrice;
        localStorage.setItem('catalog',JSON.stringify(catalog)); renderCatalogEditor();
      }
    };
    const btnDel=document.createElement('button'); btnDel.textContent='Eliminar';
    btnDel.onclick=()=>{
      delete catalog[name];
      localStorage.setItem('catalog',JSON.stringify(catalog)); renderCatalogEditor();
    };
    li.append(inpName,inpPrice,btnSave,btnDel);
    ul.appendChild(li);
  }
}

// Venta UI
function showEntradas(){document.getElementById('entradas').classList.remove('hidden');document.getElementById('botellas').classList.add('hidden');}
function showBotellas(){document.getElementById('botellas').classList.remove('hidden');document.getElementById('entradas').classList.add('hidden');renderBotellas();}
function cambiarPersonas(d){compra.entradas = Math.max(0,compra.entradas + d); updateTotals();}
function renderBotellas(){
  const c=document.getElementById('listaBotellas'); c.innerHTML='';
  for(let name in catalog){
    const price=catalog[name], qty=compra.botellas[name]||0;
    const div=document.createElement('div'); div.className='botella-item';
    div.innerHTML=`<span>${name} (${price}€)</span><span>`
      +`<button onclick="cambiarBotella('${name}',-1)">-</button>${qty}`
      +`<button onclick="cambiarBotella('${name}',1)">+</button></span>`;
    c.appendChild(div);
  }
}

// Actualizar totales
function cambiarBotella(name,d){
  compra.botellas[name] = Math.max(0,(compra.botellas[name]||0)+d);
  updateTotals(); renderBotellas();
}
function updateTotals(){
  let totalB=0, impB=0;
  for(let name in compra.botellas){
    totalB += compra.botellas[name];
    impB += catalog[name]*compra.botellas[name];
  }
  compra.personas = compra.entradas + totalB*4;
  compra.importe = compra.entradas*10 + impB;
  document.getElementById('totalBotellas').innerText = 'Botellas: '+totalB;
  document.getElementById('totalPersonas').innerText='Personas totales (incluye botellas): '+compra.personas;
  document.getElementById('precioTotal').innerText='Precio Total: '+compra.importe+'€';
  document.getElementById('totalPago').innerText=compra.importe;
}

// Finalizar compra con split pago y ticket mejorado
function finalizarCompra(){
  updateTotals();
  const efe= parseFloat(document.getElementById('pagEfectivo').value)||0;
  const tar= parseFloat(document.getElementById('pagTarjeta').value)||0;
  const biz= parseFloat(document.getElementById('pagBizum').value)||0;
  if(Math.abs((efe+tar+biz)-compra.importe)>0.01){
    alert('La suma de pagos debe igualar el importe total'); return;
  }
  const fecha=new Date().toLocaleString(), total=compra.importe;
  history.push({fecha,entradas:compra.entradas,botellas:{...compra.botellas},pagEfectivo:efe,pagTarjeta:tar,pagBizum:biz,total});
  stats.entradas+=compra.entradas; stats.botellas+=Object.values(compra.botellas).reduce((a,b)=>a+b,0);
  stats.personas+=compra.personas; stats.importe+=compra.importe;
  stats.porMetodo.Efectivo+=efe; stats.porMetodo.Tarjeta+=tar; stats.porMetodo.Bizum+=biz;
  // ticket HTML
  const html = `<html><head><title>Ticket</title>
    <style>
      body{font-family:Arial,sans-serif;margin:20px;color:#000;}
      h1{font-size:24px;border-bottom:1px solid #000;padding-bottom:5px;}
      p,li{font-size:16px;margin:5px 0;}
      .small{font-size:14px;color:#555;}
    </style>
  </head><body>
    <h1>Ticket de Compra</h1>
    <p class="small">Fecha: ${fecha}</p>
    <p>Entradas: ${compra.entradas} × 10€ = ${compra.entradas*10}€</p>
    <p>Botellas:</p><ul>
      ${Object.entries(compra.botellas).filter(([n,q])=>q>0).map(([n,q])=>
        `<li>${n}: ${q} × ${catalog[n]}€ = ${q*catalog[n]}€</li>`).join('')}
    </ul>
    <p>Métodos de pago:</p><ul>
      <li>Efectivo: ${efe}€</li>
      <li>Tarjeta: ${tar}€</li>
      <li>Bizum: ${biz}€</li>
    </ul>
    <p><strong>Total: ${total}€</strong></p>
  </body></html>`;
  const w=window.open('','_blank');
  w.document.write(html); w.print(); w.close();
  compra={entradas:0,botellas:{},personas:0,importe:0};
  updateTotals(); renderBotellas();
  document.getElementById('pagEfectivo').value=0;
  document.getElementById('pagTarjeta').value=0;
  document.getElementById('pagBizum').value=0;
}

// Cerrar caja

function closeCaja(){
  const fecha=new Date().toLocaleString();
  const summary = `Cierre de Caja
Fecha: ${fecha}
Entradas: ${stats.entradas}
Botellas: ${stats.botellas}
Personas: ${stats.personas}
Importe: ${stats.importe}€

Por Método:
Efectivo: ${stats.porMetodo.Efectivo}€
Tarjeta: ${stats.porMetodo.Tarjeta}€
Bizum: ${stats.porMetodo.Bizum}€`;
  const w=window.open('','_blank');
  w.document.write('<pre>'+summary+'</pre>'); w.print(); w.close();
  stats={entradas:0,botellas:0,personas:0,importe:0,porMetodo:{Efectivo:0,Tarjeta:0,Bizum:0}};
  history=[]; renderStats();
}


// Catálogo
function addBotella(){
  const name=document.getElementById('newBotName').value.trim();
  const price=parseFloat(document.getElementById('newBotPrice').value);
  if(name&&price>0){ catalog[name]=price; localStorage.setItem('catalog',JSON.stringify(catalog)); renderCatalogEditor(); }
  document.getElementById('newBotName').value=''; document.getElementById('newBotPrice').value='';
}

// Init
updateTotals(); renderCatalogEditor();


function clearZero(input){
  if(input.value === "0") input.value = "";
}
