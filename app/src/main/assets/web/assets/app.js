/* HỘI CHỢ LAB — interactive client app, independent of any server/database */
(function(){
'use strict';
const E=window.HoiChoEngine;
const KEY='hoi-cho-lab.market-day.v2';
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const esc=(x)=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const vnd=E.vnd, fmt=n=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(n), money=n=>vnd(Number.isFinite(n)?Math.round(n):0);
let state=E.sample(),cart=[],undoStack=[],pendingConfirm=null,toastTimer=null,storedWarn=false,currentPage='dashboard';
function toast(msg,error=false){const el=$('#toast');el.textContent=msg;el.className='toast show'+(error?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.className='toast',4200)}
function load(){try{const raw=localStorage.getItem(KEY);if(raw){let s=E.parseStored(raw);if(s)state=s;else storedWarn=true;}}catch(e){storedWarn=true;}}
function save(){state.schemaVersion=2;state.updatedAt=new Date().toISOString();try{E.validate(state);localStorage.setItem(KEY,JSON.stringify(state));return true}catch(e){toast('Không lưu được dữ liệu: '+e.message,true);return false}}
function snapshot(){undoStack.push(E.clone(state));if(undoStack.length>15)undoStack.shift()}
function undo(){if(!undoStack.length){toast('Chưa có thay đổi nào để hoàn tác.');return}state=undoStack.pop();save();renderAll();toast('Đã hoàn tác giả định gần nhất.')}
function confirmAction(title,text,action){pendingConfirm=action;$('#confirmTitle').textContent=title;$('#confirmText').textContent=text;$('#confirmBackdrop').hidden=false;$('#confirmCancel').focus()}
function closeConfirm(){pendingConfirm=null;$('#confirmBackdrop').hidden=true}
function go(page){
 if(!document.getElementById('page-'+page))return;
 currentPage=page;$$('.page').forEach(el=>el.classList.toggle('active',el.id==='page-'+page));
 $$('.nav-item').forEach(el=>{const active=el.dataset.page===page;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')});
 const names={dashboard:'TỔNG QUAN',products:'SẢN PHẨM & CHI PHÍ',scenarios:'KỊCH BẢN',breakeven:'BREAK-EVEN LAB',sales:'BÁN THỬ',insights:'GỢI Ý CẢI THIỆN',pitch:'TRÌNH BÀY'};
 $('#currentPageName').textContent=names[page];document.title='HỘI CHỢ LAB — '+names[page];closeMenu();window.scrollTo({top:0,behavior:'instant'});
 const hash={dashboard:'#tong-quan',products:'#san-pham',scenarios:'#kich-ban',breakeven:'#hoa-von',sales:'#ban-thu',insights:'#goi-y',pitch:'#trinh-bay'}[page];if(location.hash!==hash)history.replaceState(null,'',hash);
}
function closeMenu(){$('#sidebar').classList.remove('open');$('#mobileScrim').hidden=true;$('#menuToggle').setAttribute('aria-expanded','false')}
function num(v){const x=Number(v);return Number.isFinite(x)?x:NaN}
function setField(type,id,field,value){const target=(type==='product'?state.products:type==='cost'?state.fixedCosts:state.scenarios).find(x=>x.id===id);if(!target)return;
 let val=field==='name'||field==='note'?String(value).trim():num(value);
 if(typeof val==='string'){if(field==='name'&&!val){renderAll();toast('Tên không được để trống.',true);return}val=val.slice(0,100)}
 else if(!Number.isFinite(val)||val<0||val>1e9 || (field==='rate'&&val>100)||(['expected','visitors','price','cost','amount'].includes(field)&&!Number.isSafeInteger(val))){renderAll();toast('Dữ liệu nhập chưa hợp lệ. Kiểm tra số nguyên không âm và tỷ lệ 0–100%.',true);return}
 if(target[field]===val)return;
 snapshot();target[field]=val;
 if(!save()){state=undoStack.pop();renderAll();return}
 renderAll();toast('Đã lưu giả định trên trình duyệt này.');
}
function fixedAmountUpdate(total,{takeSnapshot=true}={}){
 if(!Number.isSafeInteger(total)||total<0||total>1e9){toast('Chi phí phải là số nguyên không âm.',true);return}
 if(total===E.fixed(state))return;
 const arr=state.fixedCosts;if(!arr.length)return;
 if(takeSnapshot)snapshot();
 const original=arr.map(c=>c.amount),origSum=original.reduce((s,n)=>s+n,0);
 const calc=origSum?original.map(v=>Math.floor(total*v/origSum)):arr.map((_,i)=>i===0?total:0);
 let remaining=total-calc.reduce((a,b)=>a+b,0);const order=original.map((v,i)=>({i,rem:origSum?total*v%origSum:0})).sort((a,b)=>b.rem-a.rem||a.i-b.i);
 for(let i=0;i<remaining;i++)calc[order[i%order.length].i]++;
 arr.forEach((c,i)=>c.amount=calc[i]);save();renderAll();
}
function totals(){const p=E.planned(state);return {p,sc:state.scenarios.map(v=>E.scenario(state,v)),sale:E.sales(state)}}
function showDashboard({p,sc,sale}){
 $('#kpiRevenue').textContent=money(p.revenue);$('#kpiVariable').textContent=money(p.variable);$('#kpiFixed').textContent=money(p.fixed);$('#kpiProfit').textContent=money(p.profit);
 $('#kpiProfit').classList.toggle('negative',p.profit<0);$('#heroBE').textContent=p.breakEven==null?'—':fmt(p.breakEven);$('#sidebarBE').textContent=p.breakEven==null?'—':fmt(p.breakEven);
 $('#heroBEMeta').textContent=p.breakEven==null?'Không thể xác định hòa vốn với giả định hiện tại':`Theo cơ cấu ${state.products.map(x=>x.expected).join(' : ')}`;
 $('#heroBEFoot').textContent=p.weightedMargin==null?'Cần nhập số phần dự kiến dương':`Lãi gộp bình quân ${money(p.weightedMargin)} / phần`;
 $('#heroBEProgress').style.width=p.breakEven===null?'0%':Math.min(100,p.quantity/(p.breakEven||1)*100)+'%';
 $('#soldQty').innerHTML=fmt(sale.quantity)+' <small>phần</small>';$('#soldRevenue').textContent=money(sale.revenue);
 $('#soldProgress').style.width=p.quantity?Math.min(100,sale.quantity/p.quantity*100)+'%':'0%';
 $('#soldHelper').textContent=sale.orderCount?`${sale.orderCount} đơn đã lưu · số liệu bán thử không cộng vào dự báo.`:'Chưa có đơn nào. Dữ liệu bán thử tách riêng phần dự báo.';
 $('#mixCount').innerHTML=fmt(p.quantity)+'<small>phần dự kiến</small>';
 const colors=['#245044','#F36B3F','#F5C85B','#81B4A2','#8D6D58','#B6A4CF'];let pct=0;const stops=[];
 const legend=state.products.map((prod,i)=>{const share=p.quantity?prod.expected/p.quantity*100:0;const prev=pct;pct+=share;stops.push(`${colors[i%colors.length]} ${prev}% ${pct}%`);return `<div class="mix-legend-row"><i class="mix-dot" style="background:${colors[i%colors.length]}"></i><span>${esc(prod.name)}</span><b>${fmt(prod.expected)}</b></div>`});
 $('#mixRing').style.background=p.quantity?`conic-gradient(${stops.join(',')})`:'#E8DCCB';$('#mixLegend').innerHTML=legend.join('');
 $('#scenarioSummary').innerHTML=sc.map((x,i)=>`<article class="scenario-mini"><div><span class="badge-line"><i class="${i?'base':''}"></i> ${esc(x.name)}</span><p>${fmt(x.buyers)} phần dự kiến · ${fmt(x.rate)}% tỷ lệ mua</p></div><strong class="${x.profit<0?'negative':''}">${money(x.profit)}</strong></article>`).join('');
}
function showProducts({p}){
 $('#productRows').innerHTML=state.products.map(x=>`<tr><td><input aria-label="Tên sản phẩm ${esc(x.name)}" class="editable" data-type="product" data-id="${esc(x.id)}" data-field="name" value="${esc(x.name)}" maxlength="100"></td><td><input aria-label="Giá bán ${esc(x.name)}" class="editable" data-type="product" data-id="${esc(x.id)}" data-field="price" type="number" min="0" step="1000" value="${x.price}"></td><td><input aria-label="Biến phí ${esc(x.name)}" class="editable" data-type="product" data-id="${esc(x.id)}" data-field="cost" type="number" min="0" step="1000" value="${x.cost}"></td><td><input aria-label="Số phần dự kiến ${esc(x.name)}" class="editable" data-type="product" data-id="${esc(x.id)}" data-field="expected" type="number" min="0" step="1" value="${x.expected}"></td><td class="${x.price-x.cost<0?'negative':''}">${money(x.price-x.cost)}</td></tr>`).join('');
 $('#fixedTotal').textContent=money(p.fixed);
 $('#fixedCostRows').innerHTML=state.fixedCosts.map((x,i)=>`<div class="cost-row"><label>TÊN KHOẢN CHI<input class="editable" data-type="cost" data-id="${esc(x.id)}" data-field="name" value="${esc(x.name)}" aria-label="Tên khoản chi ${i+1}" maxlength="100"></label><label>SỐ TIỀN (VND)<input class="editable amount" data-type="cost" data-id="${esc(x.id)}" data-field="amount" type="number" min="0" step="1000" value="${x.amount}" aria-label="Số tiền khoản ${i+1}"></label><label>GHI CHÚ<input class="editable" data-type="cost" data-id="${esc(x.id)}" data-field="note" value="${esc(x.note)}" aria-label="Ghi chú khoản ${i+1}" maxlength="100"></label><button class="remove-cost" type="button" data-remove-cost="${esc(x.id)}" aria-label="Xóa khoản chi ${esc(x.name)}" ${i<3?'disabled title="Khoản BTC mặc định"':''}>×</button></div>`).join('');
}
function showScenarios({sc}){
 $('#scenarioEditorGrid').innerHTML=sc.map((x,i)=>`<article class="scenario-card"><div class="kicker">${i?'KỊCH BẢN 02 / CƠ SỞ':'KỊCH BẢN 01 / THẬN TRỌNG'}</div><h2>${esc(x.name)}</h2><p>${i?'Ước tính của nhóm':'Lượng khách thấp'}</p><div class="scenario-inputs"><label>Lượt khách<input class="editable" data-type="scenario" data-id="${esc(x.id)}" data-field="visitors" type="number" min="0" step="1" value="${x.visitors}"></label><label>Tỷ lệ mua (%)<input class="editable" data-type="scenario" data-id="${esc(x.id)}" data-field="rate" type="number" min="0" max="100" step="0.5" value="${x.rate}"></label></div><div class="scenario-headline"><div><span>Khách mua / phần dự kiến</span><strong>${fmt(x.buyers)}</strong></div><div style="text-align:right"><span>Lợi nhuận</span><strong class="${x.profit<0?'negative':'positive'}">${money(x.profit)}</strong></div></div><div class="scenario-allocation">${x.items.map(y=>`<span>${esc(y.name)}: ${fmt(y.quantity)}</span>`).join('')}</div></article>`).join('');
 const labels=['Doanh thu','Biến phí','Cố định','Lợi nhuận'];const fields=['revenue','variable','fixed','profit'];
 const trows=labels.map((label,i)=>`<tr><td>${label}</td><td>${money(sc[0][fields[i]])}</td><td>${money(sc[1][fields[i]])}</td></tr>`).join('');
 $('#scenarioTable').innerHTML=`<table class="comparative-table"><thead><tr><th>CHỈ TIÊU</th><th>THẬN TRỌNG</th><th>CƠ SỞ</th></tr></thead><tbody><tr><td>Số phần</td><td>${sc[0].buyers}</td><td>${sc[1].buyers}</td></tr>${trows}</tbody></table>`;
 $('#scenarioChart').innerHTML=compareBars(sc);
 const d=sc[1].profit-sc[0].profit;$('#scenarioDelta').innerHTML=E.totalExpected(state)===0?'<strong>Chưa có cơ cấu sản phẩm để phân bổ</strong><p>Hãy nhập ít nhất một số phần dự kiến dương tại Sản phẩm & chi phí. Hiện số khách mua chưa thể phân bổ thành số phần sản phẩm.</p>':`<strong>Chênh lệch lợi nhuận: ${money(d)}</strong><p>Kịch bản Cơ sở so với Thận trọng: ${fmt(sc[1].buyers-sc[0].buyers)} phần, chênh lệch doanh thu ${money(sc[1].revenue-sc[0].revenue)}. Đây là dự báo theo giả định hiện tại.</p>`;
}
function compareBars(sc){
 const values=sc.flatMap(x=>[x.revenue,x.variable+x.fixed,x.profit]);
 const minimum=Math.min(0,...values),maximum=Math.max(1,...values);const range=maximum-minimum;
 const W=840,H=340,L=142,R=75,plotWidth=W-L-R;
 const xValue=v=>L+((v-minimum)/range)*plotWidth,zeroX=xValue(0);
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Biểu đồ doanh thu, tổng chi phí và lợi nhuận. Thanh âm nằm bên trái trục không."><g font-family="Arial,sans-serif" font-size="12">`;
 svg+=`<line x1="${zeroX}" y1="17" x2="${zeroX}" y2="290" stroke="#867A66" stroke-width="1.6" stroke-dasharray="3 3"/>`;
 sc.forEach((x,i)=>{
   const y=37+i*130;
   svg+=`<text x="10" y="${y+28}" font-size="13" font-weight="bold" fill="#193A32">${esc(x.name)}</text>`;
   const series=[x.revenue,x.variable+x.fixed,x.profit];
   series.forEach((v,j)=>{
     const yy=y+j*29,barEnd=xValue(v),bx=Math.min(zeroX,barEnd),bw=Math.abs(barEnd-zeroX);
     const color=v<0?'#AA3333':['#245044','#F36B3F','#B59B74'][j];
     svg+=`<rect x="${bx}" y="${yy-10}" rx="2" width="${Math.max(1,bw)}" height="18" fill="${color}"/>`;
     const tx=v<0?Math.max(25,bx-6):Math.min(W-4,barEnd+6),anchor=v<0?'end':'start';
     svg+=`<text x="${tx}" y="${yy+3}" text-anchor="${anchor}" font-size="11" fill="${v<0?'#AA3333':'#193A32'}">${esc(money(v))}</text>`;
   });
 });
 svg+=`<g transform="translate(142,325)"><rect width="10" height="10" fill="#245044"/><text x="15" y="9">Doanh thu</text><rect x="145" width="10" height="10" fill="#F36B3F"/><text x="160" y="9">Tổng chi phí</text><rect x="300" width="10" height="10" fill="#B59B74"/><text x="315" y="9">Lợi nhuận (đỏ nếu âm)</text></g></g></svg>`;
 return svg;
}
function showBreakEven({p,sc}){
 $('#labFixed').value=Math.min(1500000,p.fixed);$('#labFixedNumber').value=p.fixed;$('#labFixedValue').textContent=money(p.fixed);
 const rate=state.scenarios[1].rate;$('#labRate').value=rate;$('#labRateNumber').value=rate;$('#labRateValue').textContent=fmt(rate)+'%';
 $('#labBE').innerHTML=(p.breakEven==null?'—':fmt(p.breakEven))+' <span>phần</span>';
 $('#labMargin').textContent=p.weightedMargin==null?'Không có tỷ trọng sản phẩm để tính':`Lãi gộp bình quân ${money(p.weightedMargin)} / phần`;
 $('#labMeter').style.width=p.breakEven==null?'0%':Math.min(100,sc[1].buyers/Math.max(1,p.breakEven)*100)+'%';
 $('#labResult').textContent=p.breakEven==null?'Không thể hòa vốn với cơ cấu hiện tại':`${sc[1].buyers} phần kịch bản Cơ sở • ${sc[1].distance>=0?'cao hơn':'thấp hơn'} điểm hòa vốn ${Math.abs(sc[1].distance)} phần`;
 $('#labMethod').textContent=p.breakEven==null?'Cần số phần dự kiến dương và lãi gộp bình quân dương.':`ceil(${fmt(p.fixed)} × ${fmt(p.quantity)} / ${fmt(p.contribution)}) = ${fmt(p.breakEven)} phần. Đây là mốc theo cơ cấu sản phẩm dự kiến.`;
 $('#breakEvenChart').innerHTML=breakLine(p,sc[1].buyers);
}
function breakLine(p,buyers){
 const W=880,H=316,L=72,R=30,T=25,B=44;const maxx=Math.max(80,Math.ceil(Math.max(p.breakEven||0,buyers)*1.55/10)*10);const margin=p.weightedMargin||0;
 const ys=[-p.fixed, maxx*margin-p.fixed,0],ymin=Math.min(...ys),ymax=Math.max(...ys);if(ymax===ymin)ymax+=1;
 const sx=x=>L+x/maxx*(W-L-R),sy=y=>H-B-(y-ymin)/(ymax-ymin)*(H-T-B);
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Đường lợi nhuận dự kiến theo số phần bán lý thuyết"><g font-family="Arial,sans-serif" font-size="12" fill="#77695A">`;
 for(let i=0;i<=4;i++){const v=ymin+(ymax-ymin)*i/4,y=sy(v);svg+=`<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" stroke="#E8DCCB" stroke-dasharray="3 4"/><text x="${L-8}" y="${y+3}" text-anchor="end" font-size="10">${esc(fmt(Math.round(v/1000)))}k</text>`}
 svg+=`<line x1="${L}" x2="${W-R}" y1="${sy(0)}" y2="${sy(0)}" stroke="#A38D6D" stroke-width="1.6"/><path d="M ${sx(0)} ${sy(-p.fixed)} L ${sx(maxx)} ${sy(maxx*margin-p.fixed)}" stroke="#245044" stroke-width="4" fill="none" stroke-linecap="round"/>`;
 if(p.breakEven!=null&&p.breakEven<=maxx){svg+=`<line x1="${sx(p.breakEven)}" y1="${T}" x2="${sx(p.breakEven)}" y2="${H-B}" stroke="#F36B3F" stroke-width="2" stroke-dasharray="5 5"/><circle cx="${sx(p.breakEven)}" cy="${sy(p.breakEven*margin-p.fixed)}" r="6" fill="#F36B3F"/><text x="${Math.min(W-R-140,sx(p.breakEven)+9)}" y="${T+9}" fill="#9B4C32" font-weight="bold">Hòa vốn: ${fmt(p.breakEven)} phần</text>`}
 svg+=`<text x="${L}" y="${H-11}" font-size="11">0 phần</text><text x="${W-R}" y="${H-11}" font-size="11" text-anchor="end">${fmt(maxx)} phần bán</text><text x="${L}" y="12" font-size="11">Lãi/lỗ (nghìn đồng)</text></g></svg>`;return svg;
}
function showSales({sale}){
 const opts=state.products.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');const old=$('#saleProduct').value;
 $('#saleProduct').innerHTML=opts;if(state.products.some(p=>p.id===old))$('#saleProduct').value=old;
 const filter=$('#orderFilter').value;$('#orderFilter').innerHTML='<option value="all">Tất cả sản phẩm</option>'+opts;if(state.products.some(p=>p.id===filter))$('#orderFilter').value=filter;
 $('#quickProducts').innerHTML=state.products.slice(0,6).map(p=>`<button type="button" class="quick-product ${p.id===$('#saleProduct').value?'active':''}" data-quick="${esc(p.id)}"><span>${esc(p.name)}</span><small>${money(p.price)} / phần</small></button>`).join('');
 $('#saleCount').textContent=fmt(sale.orderCount);$('#salePieceCount').textContent=fmt(sale.quantity);$('#saleTurnover').textContent=money(sale.revenue);
 renderCart();renderHistory();
}
function renderCart(){
 const qty=cart.reduce((n,x)=>n+x.quantity,0);$('#cartBadge').textContent=`${qty} phần`;let total=0;
 $('#cartItems').innerHTML=cart.length?cart.map(x=>{const p=state.products.find(y=>y.id===x.id);if(!p)return '';const amount=p.price*x.quantity;total+=amount;return `<div class="cart-row"><div><strong>${esc(p.name)} × ${fmt(x.quantity)}</strong><small>${money(p.price)} / phần</small></div><div><b>${money(amount)}</b><button type="button" data-cart-remove="${esc(x.id)}" aria-label="Bỏ ${esc(p.name)} khỏi giỏ">×</button></div></div>`}).join(''):'<div class="empty-state">Giỏ hàng chưa có sản phẩm. Chọn món và số lượng phía trên.</div>';
 $('#cartTotal').textContent=money(total);$('#saveSale').disabled=!cart.length;
}
function renderHistory(){const filter=$('#orderFilter').value;const orders=state.orders.filter(o=>filter==='all'||o.items.some(i=>i.productId===filter));
 $('#saleHistory').innerHTML=orders.length?orders.slice().reverse().map(o=>`<article class="order-card"><div class="order-head"><div><strong>MÃ ĐƠN ${esc(o.id.slice(0,8).toUpperCase())}</strong><time datetime="${esc(o.createdAt)}">${new Date(o.createdAt).toLocaleString('vi-VN')}</time></div><div class="order-amount"><b>${money(o.totalRevenueVnd)}</b><button type="button" data-order-delete="${esc(o.id)}" aria-label="Xóa đơn ${esc(o.id.slice(0,8))}">Xóa</button></div></div><p>${o.items.map(i=>`${esc(i.productNameSnapshot)} × ${fmt(i.quantity)}`).join(' · ')}</p></article>`).join(''):'<div class="empty-state">Chưa có đơn phù hợp. Lưu một đơn để thấy lịch sử ở đây.</div>';
}
function showInsights(){
 $('#insightsList').innerHTML=E.insight(state).map((x,i)=>`<article class="insight-item"><span>GỢI Ý ${String(i+1).padStart(2,'0')} / ${esc(x.kind.toUpperCase())}</span><h2>${esc(x.title)}</h2><p>${esc(x.detail)}</p><div class="insight-assumption">Điều kiện: ${esc(x.assumption)}</div>${x.action?`<button type="button" class="button button-outline button-small" data-insight="${i}">Thử giả định này ↗</button>`:''}</article>`).join('');
}
function showPitch({p,sc}){
 const products=state.products.map(x=>`<li>${esc(x.name)} — ${money(x.price)} / phần, ${fmt(x.expected)} phần dự kiến</li>`).join('');
 $('#pitchCanvas').innerHTML=`<div class="pitch-cover"><div><div class="kicker" style="color:#F5C85B">HỘI CHỢ CUỐI TUẦN / KẾ HOẠCH KINH TẾ</div><h2>Lên kế hoạch rõ.<br><em>Bán hàng tự tin.</em></h2><p>Một góc nhìn tổng hợp, minh bạch về sản phẩm, chi phí và khả năng hòa vốn của gian hàng.</p></div><div class="pitch-stamp" aria-hidden="true">✳</div></div><div class="pitch-content"><div class="pitch-kpis"><div class="pitch-kpi"><span>Vốn chi phí cố định</span><strong>${money(p.fixed)}</strong></div><div class="pitch-kpi"><span>Mốc hòa vốn lý thuyết</span><strong>${p.breakEven==null?'Chưa xác định':fmt(p.breakEven)+' phần'}</strong></div><div class="pitch-kpi"><span>Lợi nhuận khi bán đủ</span><strong>${money(p.profit)}</strong></div></div><div class="pitch-columns"><section class="pitch-tile"><div class="kicker">01 / THỰC ĐƠN</div><h3>Sản phẩm & cơ cấu</h3><ul>${products}</ul><p>Tổng dự kiến: ${fmt(p.quantity)} phần · Lãi gộp bình quân ${p.weightedMargin==null?'không xác định':money(p.weightedMargin)}/phần.</p></section><section class="pitch-tile"><div class="kicker">02 / SO SÁNH</div><h3>Hai kịch bản</h3><p><strong>Thận trọng:</strong> ${fmt(sc[0].buyers)} phần, doanh thu ${money(sc[0].revenue)}, lợi nhuận ${money(sc[0].profit)}.</p><p><strong>Cơ sở:</strong> ${fmt(sc[1].buyers)} phần, doanh thu ${money(sc[1].revenue)}, lợi nhuận ${money(sc[1].profit)}.</p></section><section class="pitch-tile"><div class="kicker">03 / CHI PHÍ</div><h3>Các khoản cố định</h3><ul>${state.fixedCosts.map(x=>`<li>${esc(x.name)}: ${money(x.amount)}</li>`).join('')}</ul></section><section class="pitch-tile"><div class="kicker">04 / KẾT LUẬN</div><h3>Điểm cần nhớ</h3><p>${p.breakEven==null?'Cơ cấu hiện tại không đủ điều kiện tính điểm hòa vốn.':`Theo cơ cấu hiện tại, cần tối thiểu ${fmt(p.breakEven)} phần để bù ${money(p.fixed)} chi phí cố định.`}</p><p>Kịch bản Cơ sở tạo ${money(sc[1].profit-sc[0].profit)} lợi nhuận chênh lệch so với kịch bản Thận trọng. Các con số không phải kết quả kinh doanh thực tế.</p></section></div></div><div class="pitch-footer">HỘI CHỢ LAB · DỮ LIỆU BTC VÀ GIẢ ĐỊNH CÓ THỂ KIỂM CHỨNG · ${new Date().toLocaleDateString('vi-VN')}</div>`;
}
function renderAll(){const t=totals();showDashboard(t);showProducts(t);showScenarios(t);showBreakEven(t);showSales(t);showInsights();showPitch(t)}
function handleInsight(i){const suggestion=E.insight(state)[i];if(!suggestion?.action)return;const a=suggestion.action;snapshot();
 if(a.type==='price'||a.type==='cost'){const p=state.products.find(x=>x.id===a.id);if(p)p[a.type]+=a.delta}
 else if(a.type==='rate'){const s=state.scenarios.find(x=>x.id===a.id);if(s)s.rate=Math.min(100,s.rate+a.delta)}
 if(save()){renderAll();go('breakeven');toast('Đã áp dụng giả định. Có thể hoàn tác ở Break-even Lab.')}else {state=undoStack.pop();renderAll()}
}
function androidSaveText(name,mime,content){
 try{
  if(window.HCAndroid && typeof window.HCAndroid.saveText === 'function'){
    window.HCAndroid.saveText(name,mime,content);
    return true;
  }
 }catch(e){toast('Không mở được chức năng lưu tệp: '+e.message,true);return true}
 return false;
}
function exportJSON(){
 const file={exportedAt:new Date().toISOString(),application:'hoi-cho-lab',schemaVersion:2,state:E.clone(state)};
 const payload=JSON.stringify(file,null,2);
 if(androidSaveText('hoi-cho-lab-sao-luu.json','application/json',payload))return;
 const url=URL.createObjectURL(new Blob([payload],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='hoi-cho-lab-sao-luu.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
 toast('Đã tạo bản sao JSON. Lưu file tại nơi an toàn.');
}
async function importJSON(input){
 const file=input.files?.[0];if(!file)return;
 try{
  if(file.size>1024*1024)throw Error('File JSON quá lớn (tối đa 1 MB).');
  const json=JSON.parse(await file.text());if(json.application!=='hoi-cho-lab'||json.schemaVersion!==2)throw Error('File không thuộc phiên bản sao lưu HỘI CHỢ LAB v2.');
  E.validate(json.state);const incoming=E.clone(json.state);
  confirmAction('Khôi phục bản sao JSON?','Tất cả giả định và lịch sử đơn hiện hành trên trình duyệt này sẽ bị thay thế bằng dữ liệu từ file. Hãy xuất JSON hiện tại trước nếu muốn giữ bản cũ.',()=>{
   const previous=state;state=incoming;cart=[];
   if(!save()){state=previous;renderAll();return}
   undoStack=[];renderAll();toast('Đã nhập và xác thực bản sao JSON.');
  });
 }catch(e){toast('Không thể nhập JSON: '+e.message,true)}finally{input.value=''}
}
function csvOrders(){
 const rows=[['Mã đơn','Ngày giờ','Sản phẩm','Số lượng','Giá tại thời điểm bán','Biến phí tại thời điểm bán','Thành tiền']];
 for(const o of state.orders)for(const i of o.items)rows.push([o.id,o.createdAt,i.productNameSnapshot,i.quantity,i.unitPriceSnapshot,i.variableCostSnapshot,i.lineRevenue]);
 const csv='\ufeff'+rows.map(row=>row.map(val=>'"'+String(val).replace(/"/g,'""')+'"').join(',')).join('\r\n');
 if(androidSaveText('hoi-cho-lab-don-ban-thu.csv','text/csv',csv))return;
 const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=u;a.download='hoi-cho-lab-don-ban-thu.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1200);
 toast('Đã xuất file CSV danh sách đơn.');
}
/** Visual-only response; does not modify application state or financial values. */
function attachMicroInteractions(){
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 document.addEventListener('pointerdown',event=>{
  if(event.button!==0 || reduced?.matches)return;
  const target=event.target instanceof Element?event.target:null;
  if(!target)return;
  const control=target.closest('.button, .nav-item, .quick-product, .link-action, .remove-cost, .order-amount button, .cart-row button, .menu-toggle');
  if(control && !control.matches(':disabled')){
   const rect=control.getBoundingClientRect();
   if(rect.width && rect.height){
    const ripple=document.createElement('span'); ripple.className='tap-ripple';ripple.setAttribute('aria-hidden','true');
    ripple.style.left=(event.clientX-rect.left)+'px'; ripple.style.top=(event.clientY-rect.top)+'px';
    const distance=Math.hypot(rect.width,rect.height);ripple.style.setProperty('--ripple-scale',String(Math.max(8,distance/9)));
    control.querySelectorAll(':scope > .tap-ripple').forEach(node=>node.remove());
    control.appendChild(ripple);ripple.addEventListener('animationend',()=>ripple.remove(),{once:true});
   }
  }
  const row=target.closest('.ledger-table tbody tr, .comparative-table tbody tr, .cost-row');
  if(row){row.classList.add('row-tapped');window.setTimeout(()=>row.classList.remove('row-tapped'),280)}
 },{capture:true});
}
function events(){
 document.addEventListener('click',e=>{const brand=e.target.closest('a.brand');if(brand){e.preventDefault();go('dashboard');return}const nav=e.target.closest('[data-page]');if(nav){go(nav.dataset.page);return}const route=e.target.closest('[data-goto]');if(route){go(route.dataset.goto);return}
 const quick=e.target.closest('[data-quick]');if(quick){$('#saleProduct').value=quick.dataset.quick;$$('.quick-product').forEach(x=>x.classList.toggle('active',x.dataset.quick===quick.dataset.quick));$('#saleQuantity').focus();return}
 const remove=e.target.closest('[data-cart-remove]');if(remove){cart=cart.filter(x=>x.id!==remove.dataset.cartRemove);renderCart();return}
 const deleteOrder=e.target.closest('[data-order-delete]');if(deleteOrder){const id=deleteOrder.dataset.orderDelete;confirmAction('Xóa đơn bán thử?','Đơn này sẽ được xóa khỏi trình duyệt, doanh thu và số phần bán thử được tính lại. Không thể hoàn tác.',()=>{state.orders=state.orders.filter(o=>o.id!==id);save();renderAll();toast('Đã xóa đơn và cập nhật số liệu.')});return}
 const deleteCost=e.target.closest('[data-remove-cost]');if(deleteCost){const id=deleteCost.dataset.removeCost;confirmAction('Xóa khoản chi?','Khoản chi bổ sung này sẽ bị xóa và tổng chi phí được tính lại.',()=>{snapshot();state.fixedCosts=state.fixedCosts.filter(x=>x.id!==id);save();renderAll();toast('Đã xóa khoản chi.')});return}
 const insight=e.target.closest('[data-insight]');if(insight){handleInsight(Number(insight.dataset.insight));return}
 });
 $$('#sidebar .nav-item').forEach(x=>x.addEventListener('click',()=>go(x.dataset.page)));
 $('#menuToggle').addEventListener('click',()=>{const open=!$('#sidebar').classList.contains('open');$('#sidebar').classList.toggle('open',open);$('#mobileScrim').hidden=!open;$('#menuToggle').setAttribute('aria-expanded',String(open))});$('#mobileScrim').addEventListener('click',closeMenu);
 $('#confirmCancel').addEventListener('click',closeConfirm);$('#confirmAccept').addEventListener('click',()=>{const action=pendingConfirm;closeConfirm();if(action)action()});$('#confirmBackdrop').addEventListener('click',e=>{if(e.target.id==='confirmBackdrop')closeConfirm()});document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#confirmBackdrop').hidden)closeConfirm();else closeMenu()}});
 $('#resetSample').addEventListener('click',()=>confirmAction('Nạp dữ liệu mẫu BTC?','Khôi phục ba sản phẩm, chi phí cố định và hai kịch bản gốc. Lịch sử đơn bán thử vẫn được giữ nguyên.',()=>{const orders=state.orders;state=E.sample();state.orders=orders;cart=[];undoStack=[];save();renderAll();toast('Đã nạp dữ liệu mẫu, giữ nguyên lịch sử đơn bán thử.')}));
 document.addEventListener('change',e=>{const inp=e.target.closest('.editable');if(inp){setField(inp.dataset.type,inp.dataset.id,inp.dataset.field,inp.value)}if(e.target.id==='orderFilter')renderHistory()});
 $('#addFixed').addEventListener('click',()=>{if(state.fixedCosts.length>=100){toast('Đã đạt giới hạn số khoản chi.',true);return}snapshot();state.fixedCosts.push({id:'custom-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),name:'Khoản chi mới',amount:0,note:'Chi phí bổ sung'});save();renderAll();toast('Đã thêm khoản chi, hãy sửa tên và số tiền.')});
 $('#undoAssumption').addEventListener('click',undo);
 $('#labFixed').addEventListener('pointerdown',snapshot);$('#labFixed').addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowRight','ArrowLeft','PageUp','PageDown','Home','End'].includes(e.key))snapshot()});
 $('#labFixed').addEventListener('input',e=>fixedAmountUpdate(Number(e.target.value),{takeSnapshot:false}));
 $('#labFixedNumber').addEventListener('change',e=>fixedAmountUpdate(Number(e.target.value)));
 $('#labRate').addEventListener('pointerdown',snapshot);$('#labRate').addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowRight','ArrowLeft','Home','End'].includes(e.key))snapshot()});
 $('#labRate').addEventListener('input',e=>{const val=Number(e.target.value);if(!Number.isFinite(val)||val<0||val>100)return;state.scenarios[1].rate=val;save();renderAll()});
 $('#labRateNumber').addEventListener('change',e=>setField('scenario',state.scenarios[1].id,'rate',e.target.value));
 $('#addToCart').addEventListener('submit',e=>{e.preventDefault();$('#saleError').textContent='';const id=$('#saleProduct').value,quantity=Number($('#saleQuantity').value);if(!state.products.some(p=>p.id===id)||!Number.isSafeInteger(quantity)||quantity<1||quantity>100000){$('#saleError').textContent='Chọn sản phẩm và nhập số phần nguyên từ 1 đến 100.000.';return}const row=cart.find(x=>x.id===id);if(row){if(row.quantity+quantity>100000){$('#saleError').textContent='Số lượng trong một đơn vượt giới hạn.';return}row.quantity+=quantity}else cart.push({id,quantity});renderCart();toast('Đã thêm vào đơn nháp.');});
 $('#saveSale').addEventListener('click',()=>{if(!cart.length)return;$('#saveSale').disabled=true;try{const order=E.createOrder(state,cart);if(state.orders.length>=2000)throw Error('Lịch sử đã đầy. Hãy xuất CSV trước khi lưu thêm.');state.orders.push(order);if(!save()){state.orders.pop();return}cart=[];renderAll();toast('Đã lưu đơn bán thử thành công.')}catch(err){$('#saleError').textContent=err.message;toast(err.message,true)}finally{$('#saveSale').disabled=!cart.length}});
 $('#exportCSV').addEventListener('click',csvOrders);$('#exportJSON').addEventListener('click',exportJSON);$('#importJSON').addEventListener('change',e=>importJSON(e.target));$('#printPitch').addEventListener('click',()=>{if(window.HCAndroid && typeof window.HCAndroid.printPage==='function')window.HCAndroid.printPage();else window.print()});$('#saleProduct').addEventListener('change',()=>$$('.quick-product').forEach(x=>x.classList.toggle('active',x.dataset.quick===$('#saleProduct').value)));
}
function start(){load();attachMicroInteractions();events();renderAll();const hashmap={'#tong-quan':'dashboard','#san-pham':'products','#kich-ban':'scenarios','#hoa-von':'breakeven','#ban-thu':'sales','#goi-y':'insights','#trinh-bay':'pitch'};go(hashmap[location.hash]||'dashboard');if(storedWarn)setTimeout(()=>toast('Dữ liệu cũ không đọc được. Đang dùng dữ liệu mẫu; chưa ghi đè bản lưu cũ.',true),400)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
