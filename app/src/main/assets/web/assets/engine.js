/* HỘI CHỢ LAB — deterministic, dependency-free financial calculation engine.
   Amounts are integer VND, product quantities are integer pieces. */
(function (global) {
'use strict';
const SAMPLE = Object.freeze({
  schemaVersion: 2,
  products: [
    {id:'tra-chanh',name:'Trà chanh',price:20000,cost:8000,expected:80},
    {id:'cacao-da',name:'Cacao đá',price:25000,cost:11000,expected:55},
    {id:'banh-quy',name:'Bánh quy gói',price:15000,cost:7000,expected:60}
  ],
  fixedCosts:[
    {id:'thue-gian',name:'Phí thuê gian',amount:300000,note:'Một ngày hội chợ'},
    {id:'trang-tri',name:'Trang trí và bảng giá',amount:150000,note:'Chi một lần'},
    {id:'du-phong',name:'Đá, ly và khăn giấy dự phòng',amount:100000,note:'Ước tính cho ngày bán'}
  ],
  scenarios:[
    {id:'than-trong',name:'Thận trọng',visitors:100,rate:55,note:'Lượng khách thấp'},
    {id:'co-so',name:'Cơ sở',visitors:150,rate:65,note:'Ước tính của nhóm'}
  ],
  orders:[],preferences:{},updatedAt:null
});
const clone=o=>JSON.parse(JSON.stringify(o));
function sample(){return clone(SAMPLE)}
function whole(v){return Number.isSafeInteger(v)&&v>=0}
function finiteMoney(v){return whole(v)&&v<=1e9}
function validate(s){
 if(!s||s.schemaVersion!==2||!Array.isArray(s.products)||!Array.isArray(s.fixedCosts)||!Array.isArray(s.scenarios)||!Array.isArray(s.orders))throw Error('Dữ liệu lưu không hợp lệ.');
 if(!s.products.length || s.products.length>40)throw Error('Cần ít nhất một sản phẩm (tối đa 40).');
 const ids=new Set();
 for(const p of s.products){if(!p.id||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||!finiteMoney(p.price)||!finiteMoney(p.cost)||!whole(p.expected)||p.expected>1e6)throw Error('Dữ liệu sản phẩm không hợp lệ.');ids.add(p.id)}
 if(s.fixedCosts.length>100)throw Error('Quá nhiều khoản chi phí.');
 for(const c of s.fixedCosts){if(!c.id||typeof c.name!=='string'||!c.name.trim()||!finiteMoney(c.amount))throw Error('Khoản chi phí không hợp lệ.')}
 if(s.scenarios.length!==2)throw Error('Cần đúng hai kịch bản.');
 for(const v of s.scenarios){if(!whole(v.visitors)||v.visitors>1e6||!Number.isFinite(v.rate)||v.rate<0||v.rate>100)throw Error('Giả định kịch bản không hợp lệ.')}
 if(s.orders.length>2000)throw Error('Lịch sử vượt giới hạn lưu trữ cục bộ.');
 for(const o of s.orders){
   if(!o||typeof o.id!=='string'||!o.id||typeof o.createdAt!=='string'||!Array.isArray(o.items)||o.items.length<1||o.items.length>40)throw Error('Lịch sử đơn không hợp lệ.');
   for(const i of o.items){
     if(!i||typeof i.productId!=='string'||typeof i.productNameSnapshot!=='string'||!i.productNameSnapshot||!finiteMoney(i.unitPriceSnapshot)||!finiteMoney(i.variableCostSnapshot)||!whole(i.quantity)||i.quantity<1||i.quantity>100000)throw Error('Chi tiết đơn không hợp lệ.');
     if(i.lineRevenue!==i.quantity*i.unitPriceSnapshot)throw Error('Thành tiền đơn không khớp số lượng và đơn giá.');
   }
   if(o.totalRevenueVnd!==o.items.reduce((sum,i)=>sum+i.lineRevenue,0)||o.totalQuantity!==o.items.reduce((sum,i)=>sum+i.quantity,0))throw Error('Tổng đơn không hợp lệ.');
 }
 return true;
}
function fixed(s){return s.fixedCosts.reduce((sum,c)=>sum+c.amount,0)}
function totalExpected(s){return s.products.reduce((sum,p)=>sum+p.expected,0)}
function planned(s){
 const revenue=s.products.reduce((t,p)=>t+p.expected*p.price,0);
 const variable=s.products.reduce((t,p)=>t+p.expected*p.cost,0);
 const contribution=revenue-variable;
 const qty=totalExpected(s);
 const fixedCost=fixed(s);
 const weightedMargin=qty>0?contribution/qty:null;
 let breakEven=null;
 if(qty>0&&contribution>0)breakEven=Math.ceil(fixedCost*qty/contribution);
 return {quantity:qty,revenue,variable,contribution,fixed:fixedCost,profit:contribution-fixedCost,weightedMargin,breakEven};
}
function allocate(qty,products){
 if(!whole(qty))throw Error('Số khách mua không hợp lệ.');
 const weights=products.map(p=>p.expected);
 const total=weights.reduce((a,b)=>a+b,0);
 if(total===0)return products.map(()=>0);
 const rows=weights.map((w,i)=>{const numerator=qty*w;return {i,numerator,parts:Math.floor(numerator/total),remainder:numerator%total}});
 const remaining=qty-rows.reduce((s,r)=>s+r.parts,0);
 rows.sort((a,b)=>b.remainder-a.remainder||a.i-b.i);
 for(let i=0;i<remaining;i++)rows[i].parts++;
 rows.sort((a,b)=>a.i-b.i);
 return rows.map(r=>r.parts);
}
function scenario(s,v){
 const buyers=Math.round(v.visitors*v.rate/100);
 const quantities=allocate(buyers,s.products);
 const items=s.products.map((p,i)=>({...p,quantity:quantities[i],revenue:quantities[i]*p.price,variable:quantities[i]*p.cost}));
 const revenue=items.reduce((sum,i)=>sum+i.revenue,0);
 const variable=items.reduce((sum,i)=>sum+i.variable,0);
 const contribution=revenue-variable;
 const fixedCost=fixed(s);
 const breakeven=planned(s).breakEven;
 return {id:v.id,name:v.name,visitors:v.visitors,rate:v.rate,buyers,items,revenue,variable,contribution,fixed:fixedCost,profit:contribution-fixedCost,breakEven:breakeven,distance:breakeven==null?null:buyers-breakeven};
}
function sales(s){
 const orders=s.orders;
 return {orderCount:orders.length,quantity:orders.reduce((n,o)=>n+o.items.reduce((a,x)=>a+x.quantity,0),0),revenue:orders.reduce((n,o)=>n+o.items.reduce((a,x)=>a+x.quantity*x.unitPriceSnapshot,0),0),variable:orders.reduce((n,o)=>n+o.items.reduce((a,x)=>a+x.quantity*x.variableCostSnapshot,0),0)};
}
function createOrder(s,cart){
 if(!Array.isArray(cart)||!cart.length)throw Error('Chọn ít nhất một sản phẩm.');
 const items=cart.map(x=>{
   const p=s.products.find(y=>y.id===x.id);
   if(!p||!Number.isSafeInteger(x.quantity)||x.quantity<1||x.quantity>100000)throw Error('Sản phẩm hoặc số phần không hợp lệ.');
   return {productId:p.id,productNameSnapshot:p.name,unitPriceSnapshot:p.price,variableCostSnapshot:p.cost,quantity:x.quantity,lineRevenue:p.price*x.quantity};
 });
 const id=(global.crypto&&typeof global.crypto.randomUUID==='function')?global.crypto.randomUUID():`order-${Date.now()}-${Math.random().toString(36).slice(2)}`;
 return {id,createdAt:new Date().toISOString(),items,status:'trial',totalQuantity:items.reduce((a,x)=>a+x.quantity,0),totalRevenueVnd:items.reduce((a,x)=>a+x.lineRevenue,0)};
}
function insight(s){
 const p=planned(s),sc=s.scenarios.map(v=>scenario(s,v)),out=[];
 const top=[...s.products].sort((a,b)=>(b.price-b.cost)-(a.price-a.cost))[0];
 if(top)out.push({kind:'margin',title:`${top.name} có lãi gộp/phần cao nhất`,detail:`Mỗi phần đóng góp ${vnd(top.price-top.cost)} trước chi phí cố định.`,assumption:'Dựa trên giá bán và biến phí hiện tại.',action:null});
 for(const x of sc)if(x.profit<0)out.push({kind:'risk',title:`Kịch bản ${x.name.toLowerCase()} đang lỗ`,detail:`Lợi nhuận mô phỏng ${vnd(x.profit)} theo ${x.buyers} khách mua.`,assumption:'Giả định một khách mua một phần.',action:null});
 const candidate=s.products.find(x=>x.expected>0);
 if(candidate){const gain=sc[1].items.find(i=>i.id===candidate.id)?.quantity*1000||0;out.push({kind:'price',title:`Thử tăng giá ${candidate.name} thêm 1.000đ`,detail:`Ở kịch bản Cơ sở, lợi nhuận tăng ${vnd(gain)} nếu lượng bán không đổi.`,assumption:'Chưa xét phản ứng của khách với giá mới.',action:{type:'price',id:candidate.id,delta:1000}})}
 const second=s.products.find(x=>x.expected>0&&x.cost>=500);
 if(second){const saving=sc[1].items.find(i=>i.id===second.id)?.quantity*500||0;out.push({kind:'cost',title:`Thử giảm biến phí ${second.name} 500đ`,detail:`Ở kịch bản Cơ sở, lợi nhuận tăng ${vnd(saving)} nếu chất lượng và lượng bán không đổi.`,assumption:'Chỉ áp dụng nếu thực tế có thể tiết giảm chi phí.',action:{type:'cost',id:second.id,delta:-500}})}
 const base=s.scenarios[1];
 if(base.rate<100){const nextRate=Math.min(100,base.rate+5);const now=sc[1],newer=scenario(s,{...base,rate:nextRate});out.push({kind:'conversion',title:`Thử tăng tỷ lệ mua lên ${nextRate}%`,detail:`Lợi nhuận mô phỏng thay đổi ${vnd(newer.profit-now.profit)} (từ ${now.buyers} lên ${newer.buyers} phần).`,assumption:'Giữ nguyên lượt khách và cơ cấu sản phẩm.',action:{type:'rate',id:base.id,delta:nextRate-base.rate}})}
 return out;
}
function vnd(n){return new Intl.NumberFormat('vi-VN').format(n)+'đ'}
function percent(n){return new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(n)+'%'}
function parseStored(data){try{const s=JSON.parse(data);validate(s);return s}catch(e){return null}}
const api={sample,clone,validate,fixed,totalExpected,planned,allocate,scenario,sales,createOrder,insight,vnd,percent,parseStored};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
global.HoiChoEngine=api;
})(typeof window!=='undefined'?window:globalThis);
