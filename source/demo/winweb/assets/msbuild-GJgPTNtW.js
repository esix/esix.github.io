import{compileProject as f}from"./lcc-Dp4rBBFO.js";import"./wasm-env-KNF9QTGd.js";const g={ico:"image/x-icon",bmp:"image/bmp",png:"image/png",cur:"image/x-icon"};async function x(r,c,a,w){const m=await r.readText(`${c}\\${a}`);if(m==null)return w(`  cannot read ${a}\r
`),null;const s=[];for(const t of m.split(`
`)){const i=/^\s*(\d+)\s+(ICON|BITMAP|RCDATA)\s+"([^"]+)"/i.exec(t);if(!i)continue;const d=await r.readFile(`${c}\\${i[3].replace(/\//g,"\\")}`);if(!d)return w(`  cannot read resource ${i[3]}\r
`),null;s.push({id:+i[1],mime:g[i[3].split(".").pop().toLowerCase()]||"application/octet-stream",bytes:d})}let e=`typedef struct { int id; const char* mime; const unsigned char* data; int len; } WinwebRes;
`;s.forEach((t,i)=>{e+=`static const unsigned char res_${i}[] = {${Array.from(t.bytes).join(",")}};
`}),e+=`static const WinwebRes winweb_res[] = {
`,s.forEach((t,i)=>{e+=`  {${t.id}, "${t.mime}", res_${i}, sizeof res_${i}},
`}),e+=`};
const WinwebRes* winweb_res_table(void){ return winweb_res; }
`,e+=`int winweb_res_n(void){ return ${s.length}; }
`;const l=(t,i)=>`${t}{
  switch(i){
${s.map((d,u)=>`    case ${u}: return ${i(u)};
`).join("")}  }
  return 0;
}
`;return e+=l("int winweb_res_id_at(int i)",t=>String(s[t].id)),e+=l("const char* winweb_res_mime_at(int i)",t=>`"${s[t].mime}"`),e+=l("const unsigned char* winweb_res_data_at(int i)",t=>`res_${t}`),e+=l("int winweb_res_len_at(int i)",t=>`sizeof res_${t}`),e}async function S(r,c,a){const w=await r.readdir(c).catch(()=>[]),m=w.find(n=>n.name.toLowerCase().endsWith(".vcxproj"));if(!m)return a(`MSBuild: no .vcxproj in ${c}\r
`),{code:1};const s=await r.readText(`${c}\\${m.name}`)??"",e=/<ProjectName>([^<]+)<\/ProjectName>/.exec(s)?.[1]||m.name.replace(/\.vcxproj$/i,""),l=/<SubSystem>([^<]+)<\/SubSystem>/.exec(s)?.[1]||"",t=/<SystemTool>([^<]+)<\/SystemTool>/.exec(s)?.[1]||"",i=/console/i.test(l)||/true/i.test(t),d=[...s.matchAll(/<ClCompile\s+Include="([^"]+)"/g)].map(n=>n[1].replace(/\//g,"\\")),u=[...s.matchAll(/<ResourceCompile\s+Include="([^"]+)"/g)].map(n=>n[1].replace(/\//g,"\\"));a(`MSBuild ${e}: ${d.length} source(s)${u.length?`, ${u.length} .rc`:""}\r
`);const h=[];for(const n of d){const o=await r.readText(`${c}\\${n}`);if(o==null)return a(`  error: cannot read ${n}\r
`),{code:1};h.push(o)}for(const n of u){const o=await x(r,c,n,a);if(o==null)return{code:1};h.push(o)}const _=new Map;for(const n of w)if(n.name.toLowerCase().endsWith(".h")){const o=await r.readText(`${c}\\${n.name}`);if(o!=null){const b="_VFSG_"+n.name.replace(/\W/g,"_").toUpperCase();_.set(n.name,`#ifndef ${b}
#define ${b}
${o}
#endif
`)}}let $;try{({wasm:$}=await f(h,_))}catch(n){return a(`  ${String(n.message).split(`
`).slice(0,5).join(`\r
  `)}\r
  Build FAILED.\r
`),{code:1}}let p;return i?(await r.mkdir("C:\\Windows").catch(()=>{}),await r.mkdir("C:\\Windows\\System32").catch(()=>{}),p=`C:\\Windows\\System32\\${e}.wasm`):(await r.mkdir("C:\\Program Files").catch(()=>{}),await r.mkdir(`C:\\Program Files\\${e}`).catch(()=>{}),p=`C:\\Program Files\\${e}\\${e}.wasm`),await r.writeFile(p,$),a(`  ${e}.wasm -> ${p} (${$.length} bytes)\r
  Build succeeded.\r
`),{code:0,wasm:$,name:e}}export{S as buildProject};
