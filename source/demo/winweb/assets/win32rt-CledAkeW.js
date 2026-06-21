import{G as W}from"./gdi-1S2BSem4.js";import{makeEnv as p}from"./cc-Bcio5Jke.js";const E=`
#define WM_DESTROY 2
#define WM_PAINT 15
#define WM_MOUSEMOVE 512
#define WM_LBUTTONDOWN 513
#define WM_LBUTTONUP 514
#define WM_RBUTTONDOWN 516
#define MK_LBUTTON 1
#define WHITE_BRUSH 0
#define LTGRAY_BRUSH 1
#define GRAY_BRUSH 2
#define BLACK_BRUSH 4
#define WHITE_PEN 6
#define BLACK_PEN 7
#define PS_SOLID 0
#define TRANSPARENT 1
#define OPAQUE 2
struct WNDCLASS { int style; int lpfnWndProc; int cbClsExtra; int cbWndExtra; int hInstance; int hIcon; int hCursor; int hbrBackground; int lpszMenuName; int lpszClassName; };
struct MSG { int hwnd; int message; int wParam; int lParam; int time; int x; int y; };
struct PAINTSTRUCT { int hdc; int fErase; int rcL; int rcT; int rcR; int rcB; int rsv1; int rsv2; };
struct RECT { int left; int top; int right; int bottom; };
int RegisterClass(struct WNDCLASS *wc);
int CreateWindow(int cls, int title, int style, int x, int y, int w, int h, int parent, int menu, int inst, int param);
int ShowWindow(int hwnd, int cmd);
int UpdateWindow(int hwnd);
int InvalidateRect(int hwnd, int rect, int erase);
int GetMessage(struct MSG *m, int hwnd, int mn, int mx);
int TranslateMessage(struct MSG *m);
int DispatchMessage(struct MSG *m);
int DefWindowProc(int hwnd, int msg, int wp, int lp);
int PostQuitMessage(int code);
int GetStockObject(int o);
int BeginPaint(int hwnd, struct PAINTSTRUCT *ps);
int EndPaint(int hwnd, struct PAINTSTRUCT *ps);
int TextOut(int hdc, int x, int y, int s, int len);
int Rectangle(int hdc, int l, int t, int r, int b);
int Ellipse(int hdc, int l, int t, int r, int b);
int GetClientRect(int hwnd, struct RECT *r);
int RGB(int r, int g, int b);
int CreatePen(int style, int width, int color);
int CreateSolidBrush(int color);
int SelectObject(int hdc, int obj);
int DeleteObject(int obj);
int SetTextColor(int hdc, int color);
int SetBkMode(int hdc, int mode);
int FillRect(int hdc, struct RECT *rc, int brush);
int MoveToEx(int hdc, int x, int y, int pt);
int LineTo(int hdc, int x, int y);
int GetDC(int hwnd);
int ReleaseDC(int hwnd, int hdc);
`,S=15;function C(l){let s=null,o=null,h=0,a=!1,T="";const r=new W(l,()=>s?new Uint8Array(s.buffer):new Uint8Array(0)),u=()=>new DataView(s.buffer),f=t=>{const e=new Uint8Array(s.buffer);let n="";for(;e[t];)n+=String.fromCharCode(e[t++]);return n},w=(t,e,n,i)=>{if(!o||!a)return 0;const c=o.get(h);return c?c(t,e,n,i)|0:0};return{shims:{RegisterClass:t=>(h=u().getInt32(t+4,!0),a=!0,T=f(u().getInt32(t+36,!0)),1),CreateWindow:(t,e,n,i,c,d,m)=>(l.bindDispatch((R,g,b,M)=>{w(R,g,b,M)}),l.create(f(e)||T||"Window",i>0?i:70,c>0?c:70,d>0?d:360,m>0?m:220)),ShowWindow:()=>1,UpdateWindow:t=>(w(t,S,0,0),1),InvalidateRect:t=>(w(t,S,0,0),1),GetMessage:()=>0,TranslateMessage:()=>0,DispatchMessage:()=>0,DefWindowProc:()=>0,PostQuitMessage:()=>0,GetStockObject:t=>r.getStockObject(t),BeginPaint:(t,e)=>{const n=r.windowDC(t);return u().setInt32(e,n,!0),n},EndPaint:()=>1,TextOut:(t,e,n,i)=>(r.textOut(t,e,n,f(i)),1),Rectangle:(t,e,n,i,c)=>(r.rectangle(t,e,n,i,c),1),Ellipse:(t,e,n,i,c)=>(r.ellipse(t,e,n,i,c),1),GetClientRect:(t,e)=>{const n=l.clientEl(t),i=n?parseInt(n.style.width):300,c=n?parseInt(n.style.height):200,d=u();return d.setInt32(e,0,!0),d.setInt32(e+4,0,!0),d.setInt32(e+8,i,!0),d.setInt32(e+12,c,!0),1},RGB:(t,e,n)=>t&255|(e&255)<<8|(n&255)<<16,CreatePen:(t,e,n)=>r.createPen(t,e,n),CreateSolidBrush:t=>r.createSolidBrush(t),SelectObject:(t,e)=>r.selectObject(t,e),DeleteObject:t=>r.deleteObject(t),SetTextColor:(t,e)=>(r.setTextColor(t,e),0),SetBkMode:(t,e)=>(r.setBkMode(t,e),0),FillRect:(t,e,n)=>{const i=u();return r.fillRect(t,i.getInt32(e,!0),i.getInt32(e+4,!0),i.getInt32(e+8,!0),i.getInt32(e+12,!0),n),1},MoveToEx:(t,e,n)=>(r.moveTo(t,e,n),1),LineTo:(t,e,n)=>(r.lineTo(t,e,n),1),GetDC:t=>r.windowDC(t),ReleaseDC:(t,e)=>(r.deleteDC(e),1)},setMemory:t=>{s=t},setTable:t=>{o=t}}}function O(l,s){const{env:o,memory:h}=p(s),a=C(l);return a.setMemory(h),Object.assign(o,a.shims),{env:o,setInstance:T=>a.setTable(T.exports.__indirect_function_table)}}function B(l){const s=C(l);return{env:s.shims,setInstance:o=>{s.setMemory(o.exports.memory),s.setTable(o.exports.__indirect_function_table)}}}export{E as WIN32_PRELUDE,O as makeWin32,B as makeWin32Lcc};
