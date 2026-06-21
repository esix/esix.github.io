function t(r){return new Proxy(r,{get:(n,e)=>e in n?n[e]:()=>0})}export{t as s};
