import{s as U}from"./wasm-env-KNF9QTGd.js";const z=`#ifndef _WASM_ASSERT_H
#define _WASM_ASSERT_H
extern void __assert(const char *, const char *, int);
#ifdef NDEBUG
#define assert(e) ((void)0)
#else
#define assert(e) ((e) ? (void)0 : __assert(#e, __FILE__, __LINE__))
#endif
#endif
`,k=`#ifndef _WASM_CTYPE_H
#define _WASM_CTYPE_H
int isalpha(int); int isdigit(int); int isalnum(int); int isspace(int);
int isprint(int); int isxdigit(int); int toupper(int); int tolower(int);
#endif
`,j=`#ifndef _WASM_ERRNO_H
#define _WASM_ERRNO_H
extern int errno;
#define EDOM   33
#define ERANGE 34
#endif
`,X=`#ifndef _WASM_FLOAT_H
#define _WASM_FLOAT_H
#define FLT_MAX  3.402823466e+38F
#define FLT_MIN  1.175494351e-38F
#define DBL_MAX  1.7976931348623157e+308
#define DBL_MIN  2.2250738585072014e-308
#define LDBL_MAX 1.7976931348623157e+308
#define DBL_DIG  15
#define FLT_DIG  6
#endif
`,Y=`/* libc.c - a minimal C library for the lcc-wasm self-hosting target.
 *
 * Compiled to wasm by lcc-wasm itself and amalgamated into rcc.wasm. The only
 * things it cannot do in pure wasm are real I/O and process exit, which it
 * reaches through a tiny host (JS) syscall layer:
 *
 *     long __read (int fd, void *buf, unsigned long n);   // <0 on error, 0 = EOF
 *     long __write(int fd, const void *buf, unsigned long n);
 *     void __exit (int code);
 *
 * Everything else (string/memory/malloc/qsort/stdio glue) is plain C here.
 */
#include <stddef.h>
#include <stdarg.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>

extern long __read(int, void *, unsigned long);
extern long __write(int, const void *, unsigned long);
extern void __exit(int);
int errno = 0;

/* ---------------- string / memory ---------------- */
void *memcpy(void *d, const void *s, size_t n) {
	char *dp = d; const char *sp = s;
	while (n--) *dp++ = *sp++;
	return d;
}
void *memmove(void *d, const void *s, size_t n) {
	char *dp = d; const char *sp = s;
	if (dp < sp) while (n--) *dp++ = *sp++;
	else { dp += n; sp += n; while (n--) *--dp = *--sp; }
	return d;
}
void *memset(void *d, int c, size_t n) {
	char *dp = d;
	while (n--) *dp++ = (char)c;
	return d;
}
int memcmp(const void *a, const void *b, size_t n) {
	const unsigned char *x = a, *y = b;
	while (n--) { if (*x != *y) return *x - *y; x++; y++; }
	return 0;
}
size_t strlen(const char *s) { const char *p = s; while (*p) p++; return p - s; }
int strcmp(const char *a, const char *b) {
	while (*a && *a == *b) { a++; b++; }
	return (unsigned char)*a - (unsigned char)*b;
}
int strncmp(const char *a, const char *b, size_t n) {
	while (n && *a && *a == *b) { a++; b++; n--; }
	return n == 0 ? 0 : (unsigned char)*a - (unsigned char)*b;
}
char *strcpy(char *d, const char *s) { char *r = d; while ((*d++ = *s++)) ; return r; }
char *strncpy(char *d, const char *s, size_t n) {
	char *r = d;
	while (n && (*d = *s)) { d++; s++; n--; }
	while (n--) *d++ = 0;
	return r;
}
char *strcat(char *d, const char *s) { char *r = d; while (*d) d++; while ((*d++ = *s++)) ; return r; }
char *strchr(const char *s, int c) {
	for (; *s; s++) if (*s == (char)c) return (char *)s;
	return c == 0 ? (char *)s : NULL;
}
char *strrchr(const char *s, int c) {
	const char *last = NULL;
	for (; *s; s++) if (*s == (char)c) last = s;
	return (char *)(c == 0 ? s : last);
}

/* ---------------- stdlib ---------------- */
/* bump allocator over a fixed heap window in linear memory */
#define HEAP_BASE 0x00200000u    /* 2 MiB: above static data, below the shadow stack */
static unsigned heapp = 0;

void *malloc(size_t n) {
	unsigned p;
	if (heapp == 0) heapp = HEAP_BASE;
	p = (heapp + 7u) & ~7u;        /* 8-byte align */
	heapp = p + (unsigned)n;
	return (void *)p;
}
void free(void *p) { (void)p; }    /* no-op: a single compile run leaks harmlessly */
void *calloc(size_t a, size_t b) { return memset(malloc(a * b), 0, a * b); }
void *realloc(void *p, size_t n) {
	void *q = malloc(n);
	if (p) memcpy(q, p, n);         /* over-copies; fine for a bump allocator */
	return q;
}
void exit(int code) { __exit(code); }
void abort(void) { __exit(134); }
int atoi(const char *s) {
	int n = 0, neg = 0;
	while (*s == ' ' || *s == '\\t') s++;
	if (*s == '-') { neg = 1; s++; } else if (*s == '+') s++;
	while (*s >= '0' && *s <= '9') n = n * 10 + (*s++ - '0');
	return neg ? -n : n;
}
int abs(int x) { return x < 0 ? -x : x; }

/* simple insertion-style qsort (stable enough, comparator via function pointer) */
void qsort(void *base, size_t n, size_t sz, int (*cmp)(const void *, const void *)) {
	char *a = base; size_t i, j;
	char tmp[256];
	for (i = 1; i < n; i++)
		for (j = i; j > 0 && cmp(a + (j - 1) * sz, a + j * sz) > 0; j--) {
			memcpy(tmp, a + (j - 1) * sz, sz);
			memcpy(a + (j - 1) * sz, a + j * sz, sz);
			memcpy(a + j * sz, tmp, sz);
		}
}

/* ---------------- stdio ---------------- */
struct __file { int fd; int eof; };
static struct __file _streams[3] = { {0, 0}, {1, 0}, {2, 0} };
FILE *stdin  = (FILE *)&_streams[0];
FILE *stdout = (FILE *)&_streams[1];
FILE *stderr = (FILE *)&_streams[2];

int fgetc(FILE *f) {
	struct __file *s = (struct __file *)f;
	unsigned char c;
	if (__read(s->fd, &c, 1) <= 0) { s->eof = 1; return -1; }
	return c;
}
int getc(FILE *f) { return fgetc(f); }
size_t fread(void *buf, size_t sz, size_t n, FILE *f) {
	struct __file *s = (struct __file *)f;
	long got = __read(s->fd, buf, sz * n);
	if (got <= 0) { s->eof = 1; return 0; }
	return (size_t)got / sz;
}
int fputc(int c, FILE *f) {
	struct __file *s = (struct __file *)f;
	char ch = (char)c;
	__write(s->fd, &ch, 1);
	return c;
}
int putc(int c, FILE *f) { return fputc(c, f); }
int putchar(int c) { return fputc(c, stdout); }
int fputs(const char *str, FILE *f) {
	struct __file *s = (struct __file *)f;
	__write(s->fd, str, strlen(str));
	return 0;
}
int puts(const char *str) { fputs(str, stdout); return fputc('\\n', stdout); }
size_t fwrite(const void *buf, size_t sz, size_t n, FILE *f) {
	struct __file *s = (struct __file *)f;
	return (size_t)__write(s->fd, buf, sz * n) / sz;
}
int feof(FILE *f) { return ((struct __file *)f)->eof; }
int fflush(FILE *f) { (void)f; return 0; }
int fclose(FILE *f) { (void)f; return 0; }
FILE *fopen(const char *path, const char *mode) { (void)path; (void)mode; return NULL; }
FILE *freopen(const char *path, const char *mode, FILE *f) { (void)path; (void)mode; return f; }

/* ---------------- printf family (minimal: %d %u %x %s %c %f %%) ---------------- */
static char *fmtu(char *p, unsigned v, unsigned base) {
	char t[16]; int i = 0;
	do { int d = v % base; t[i++] = d < 10 ? '0' + d : 'a' + d - 10; v /= base; } while (v);
	while (i) *p++ = t[--i];
	return p;
}
static int vformat(char *out, const char *fmt, va_list ap) {
	char *p = out;
	for (; *fmt; fmt++) {
		char num[24], *body = num;
		int len = 0, width = 0, zero = 0, i;
		if (*fmt != '%') { *p++ = *fmt; continue; }
		fmt++;
		while (*fmt=='-' || *fmt=='+' || *fmt==' ' || *fmt=='#' || *fmt=='0') {  /* flags */
			if (*fmt == '0') zero = 1;
			fmt++;
		}
		while (*fmt >= '0' && *fmt <= '9') width = width * 10 + (*fmt++ - '0');   /* field width */
		while (*fmt == 'l' || *fmt == 'h') fmt++;   /* length modifiers: long==int==32-bit here */
		switch (*fmt) {
		case 'd': { int v = va_arg(ap, int); char *q = num;
			    if (v < 0) { *q++ = '-'; len = fmtu(q, (unsigned)(-(long)v), 10) - num; }
			    else len = fmtu(q, (unsigned)v, 10) - num; break; }
		case 'u': len = fmtu(num, va_arg(ap, unsigned), 10) - num; break;
		case 'x': len = fmtu(num, va_arg(ap, unsigned), 16) - num; break;
		case 'c': num[0] = (char)va_arg(ap, int); len = 1; break;
		case 's': body = va_arg(ap, char *); len = (int)strlen(body); break;
		case '%': num[0] = '%'; len = 1; break;
		default:  num[0] = '%'; num[1] = *fmt; len = 2; break;
		}
		if (width > len) {                          /* left-pad to field width */
			int extra = width - len;
			char pad = zero ? '0' : ' ';
			if (zero && len > 0 && body[0] == '-') { *p++ = '-'; body++; len--; }
			for (i = 0; i < extra; i++) *p++ = pad;
		}
		for (i = 0; i < len; i++) *p++ = body[i];
	}
	*p = 0;
	return p - out;
}
int vsprintf(char *out, const char *fmt, va_list ap) { return vformat(out, fmt, ap); }
int sprintf(char *out, const char *fmt, ...) {
	va_list ap; int n;
	va_start(ap, fmt);
	n = vformat(out, fmt, ap);
	va_end(ap);
	return n;
}
int fprintf(FILE *f, const char *fmt, ...) {
	char buf[1024]; va_list ap; int n;
	va_start(ap, fmt);
	n = vformat(buf, fmt, ap);
	va_end(ap);
	fwrite(buf, 1, n, f);
	return n;
}
int printf(const char *fmt, ...) {
	char buf[1024]; va_list ap; int n;
	va_start(ap, fmt);
	n = vformat(buf, fmt, ap);
	va_end(ap);
	fwrite(buf, 1, n, stdout);
	return n;
}

/* assert() failure hook (the header's assert macro calls this) */
void __assert(const char *e, const char *file, int line) {
	char b[256]; char *p = b;
	char *s = "assertion failed: "; while (*s) *p++ = *s++;
	while (*e) *p++ = *e++; *p++ = ' '; *p++ = '(';
	while (*file) *p++ = *file++; *p++ = ')'; *p++ = '\\n'; *p = 0;
	fputs(b, stderr);
	__exit(134);
}

/* sscanf stub: the bootstrap passes no -metric= overrides, so reporting "no
   fields matched" makes type_init fall back to the default Interface metrics. */
int sscanf(const char *s, const char *fmt, ...) { (void)s; (void)fmt; return 0; }
int vsnprintf(char *out, size_t n, const char *fmt, va_list ap) { (void)n; return vformat(out, fmt, ap); }

/* ---- a few more libc bits lcc needs ---- */
char *fgets(char *s, int n, FILE *f) {
	int i = 0, c;
	while (i < n - 1 && (c = fgetc(f)) != -1) { s[i++] = (char)c; if (c == '\\n') break; }
	if (i == 0) return NULL;
	s[i] = 0;
	return s;
}
void rewind(FILE *f) { (void)f; }   /* seek unused at runtime (only the -g stab path) */

long strtol(const char *s, char **end, int base) {
	long n = 0; int neg = 0;
	while (*s == ' ' || *s == '\\t' || *s == '\\n') s++;
	if (*s == '-') { neg = 1; s++; } else if (*s == '+') s++;
	if (base == 0) {
		if (*s == '0' && (s[1] == 'x' || s[1] == 'X')) { base = 16; s += 2; }
		else if (*s == '0') { base = 8; s++; } else base = 10;
	} else if (base == 16 && *s == '0' && (s[1] == 'x' || s[1] == 'X')) s += 2;
	for (;;) {
		int d;
		if (*s >= '0' && *s <= '9') d = *s - '0';
		else if (*s >= 'a' && *s <= 'z') d = *s - 'a' + 10;
		else if (*s >= 'A' && *s <= 'Z') d = *s - 'A' + 10;
		else break;
		if (d >= base) break;
		n = n * base + d; s++;
	}
	if (end) *end = (char *)s;
	return neg ? -n : n;
}

double strtod(const char *s, char **end) {
	double r = 0.0; int neg = 0;
	while (*s == ' ' || *s == '\\t' || *s == '\\n') s++;
	if (*s == '-') { neg = 1; s++; } else if (*s == '+') s++;
	while (*s >= '0' && *s <= '9') { r = r * 10.0 + (*s - '0'); s++; }
	if (*s == '.') { double f = 0.1; s++; while (*s >= '0' && *s <= '9') { r += (*s - '0') * f; f *= 0.1; s++; } }
	if (*s == 'e' || *s == 'E') {
		int es = 0, en = 0; s++;
		if (*s == '-') { es = 1; s++; } else if (*s == '+') s++;
		while (*s >= '0' && *s <= '9') { en = en * 10 + (*s - '0'); s++; }
		while (en--) { if (es) r /= 10.0; else r *= 10.0; }
	}
	if (end) *end = (char *)s;
	return neg ? -r : r;
}
`,K=`#ifndef _WASM_LIMITS_H
#define _WASM_LIMITS_H
#define CHAR_BIT   8
#define SCHAR_MIN  (-128)
#define SCHAR_MAX  127
#define UCHAR_MAX  255
#define CHAR_MIN   (-128)
#define CHAR_MAX   127
#define SHRT_MIN   (-32768)
#define SHRT_MAX   32767
#define USHRT_MAX  65535
#define INT_MIN    (-2147483647-1)
#define INT_MAX    2147483647
#define UINT_MAX   4294967295u
#define LONG_MIN   (-2147483647L-1)
#define LONG_MAX   2147483647L
#define ULONG_MAX  4294967295uL
#endif
`,V=`/* stdarg.h for the lcc-wasm target.
 *
 * Matches the back end's varargs ABI: a variadic call marshals every argument
 * into an 8-byte slot in a shadow-stack buffer and passes a pointer to it; the
 * callee's fixed params live in that same buffer, so &last is a real address.
 * va_list is just a walking pointer; each va_arg advances one 8-byte slot.
 */
#ifndef _WASM_STDARG_H
#define _WASM_STDARG_H

typedef char *va_list;

#define va_start(ap, last) ((ap) = (va_list)&(last) + 8)
#define va_arg(ap, type)   (*(type *)(((ap) += 8) - 8))
#define va_end(ap)         ((void)0)
#define va_copy(dst, src)  ((dst) = (src))

#endif
`,q=`#ifndef _WASM_STDDEF_H
#define _WASM_STDDEF_H
typedef unsigned size_t;
typedef int ptrdiff_t;
#ifndef NULL
#define NULL ((void*)0)
#endif
#define offsetof(t, m) ((size_t)&(((t*)0)->m))
#endif
`,J=`#ifndef _WASM_STDIO_H
#define _WASM_STDIO_H
#include <stddef.h>
#include <stdarg.h>
typedef struct __file FILE;
extern FILE *stdin, *stdout, *stderr;
#define EOF (-1)
#define SEEK_SET 0
FILE *fopen(const char *, const char *);
FILE *freopen(const char *, const char *, FILE *);
int   fclose(FILE *);
size_t fread(void *, size_t, size_t, FILE *);
size_t fwrite(const void *, size_t, size_t, FILE *);
int   fgetc(FILE *);
int   getc(FILE *);
int   fputc(int, FILE *);
int   putc(int, FILE *);
int   putchar(int);
int   fputs(const char *, FILE *);
int   puts(const char *);
int   feof(FILE *);
int   fflush(FILE *);
int   sprintf(char *, const char *, ...);
int   printf(const char *, ...);
int   fprintf(FILE *, const char *, ...);
int   sscanf(const char *, const char *, ...);
char *fgets(char *, int, FILE *);
void  rewind(FILE *);
int   vsnprintf(char *, size_t, const char *, va_list);
int   vsprintf(char *, const char *, va_list);
#endif
`,Z=`#ifndef _WASM_STDLIB_H
#define _WASM_STDLIB_H
#include <stddef.h>
#define EXIT_SUCCESS 0
#define EXIT_FAILURE 1
void *malloc(size_t);
void  free(void *);
void *calloc(size_t, size_t);
void *realloc(void *, size_t);
void  exit(int);
void  abort(void);
int   atoi(const char *);
int   abs(int);
void  qsort(void *, size_t, size_t, int (*)(const void *, const void *));
long   strtol(const char *, char **, int);
double strtod(const char *, char **);
#endif
`,Q=`#ifndef _WASM_STRING_H
#define _WASM_STRING_H
#include <stddef.h>
void *memcpy(void *, const void *, size_t);
void *memmove(void *, const void *, size_t);
void *memset(void *, int, size_t);
int   memcmp(const void *, const void *, size_t);
size_t strlen(const char *);
int   strcmp(const char *, const char *);
int   strncmp(const char *, const char *, size_t);
char *strcpy(char *, const char *);
char *strncpy(char *, const char *, size_t);
char *strcat(char *, const char *);
char *strchr(const char *, int);
char *strrchr(const char *, int);
int   strcasecmp(const char *, const char *);              /* реализованы в libc-extra.c */
int   strncasecmp(const char *, const char *, size_t);
#endif
`,$=`#ifndef _WASM_TIME_H
#define _WASM_TIME_H
typedef long time_t;
typedef long clock_t;
#define CLOCKS_PER_SEC 1000
time_t time(time_t *);
clock_t clock(void);
#endif
`,nn=`/* commctrl.h — минимальный стаб (common controls не нужны: контролы у нас нативные). */
#ifndef WINWEB_COMMCTRL_H
#define WINWEB_COMMCTRL_H
#include <windows.h>
typedef struct { DWORD dwSize; DWORD dwICC; } INITCOMMONCONTROLSEX, *LPINITCOMMONCONTROLSEX;
#define ICC_STANDARD_CLASSES 0x00004000
BOOL InitCommonControlsEx(const INITCOMMONCONTROLSEX*);
#endif
`,tn=`/* dwmapi.h — минимальный стаб (оконные украшения Win11 в браузере не нужны). */
#ifndef WINWEB_DWMAPI_H
#define WINWEB_DWMAPI_H
#include <windows.h>
typedef LONG HRESULT;
#define DWMWA_WINDOW_CORNER_PREFERENCE 33
#define DWMWA_SYSTEMBACKDROP_TYPE 38
HRESULT DwmSetWindowAttribute(HWND, DWORD, const void*, DWORD);
#endif
`,en=`/* shellapi.h — минимальный стаб. */
#ifndef WINWEB_SHELLAPI_H
#define WINWEB_SHELLAPI_H
#include <windows.h>
#endif
`,sn=`/* windows.h — минимальный Win32 на include-пути.
 * Чужой исходник делает #include <windows.h> и собирается БЕЗ ПРАВОК.
 * Реализация — win32_impl.c (проекция на DOM-WM + Canvas). Сборка ANSI.
 */
#ifndef WINWEB_WINDOWS_H
#define WINWEB_WINDOWS_H

#include <stddef.h>
#include <stdint.h>

#define WINAPI
#define CALLBACK
#define CONST const
#ifndef TRUE
#define TRUE 1
#define FALSE 0
#endif
#define TEXT(x) x

typedef int            BOOL;
typedef unsigned char  BYTE;
typedef unsigned short WORD;
typedef unsigned int   DWORD;
typedef unsigned int   UINT;
typedef long           LONG;
typedef void           VOID;
typedef int            INT;
typedef short          SHORT;
typedef unsigned char  UCHAR;
typedef unsigned short USHORT;
typedef unsigned long  ULONG;
typedef float          FLOAT;
typedef uintptr_t      UINT_PTR;
typedef intptr_t       INT_PTR;
typedef intptr_t       LRESULT;
typedef uintptr_t      WPARAM;
typedef intptr_t       LPARAM;
typedef DWORD          COLORREF;
typedef char           CHAR, TCHAR;
typedef char          *LPSTR, *LPTSTR, *PSTR;
typedef const char    *LPCSTR, *LPCTSTR;
typedef void          *LPVOID;
typedef WORD           ATOM;

typedef void *HANDLE, *HWND, *HINSTANCE, *HDC, *HMENU, *HICON, *HCURSOR, *HBRUSH, *HPEN, *HGDIOBJ, *HBITMAP, *HFONT;
typedef wchar_t WCHAR;
typedef WCHAR *LPWSTR;
typedef const WCHAR *LPCWSTR;
typedef struct tagSIZE { LONG cx, cy; } SIZE, *LPSIZE;

typedef struct tagPOINT { LONG x, y; } POINT, *LPPOINT;
typedef struct tagRECT  { LONG left, top, right, bottom; } RECT, *LPRECT;
typedef struct tagMSG {
    HWND hwnd; UINT message; WPARAM wParam; LPARAM lParam; DWORD time; POINT pt;
} MSG, *LPMSG;

typedef LRESULT (CALLBACK *WNDPROC)(HWND, UINT, WPARAM, LPARAM);

typedef struct tagWNDCLASS {
    UINT style; WNDPROC lpfnWndProc; int cbClsExtra, cbWndExtra;
    HINSTANCE hInstance; HICON hIcon; HCURSOR hCursor; HBRUSH hbrBackground;
    LPCTSTR lpszMenuName, lpszClassName;
} WNDCLASS, *LPWNDCLASS;

typedef struct tagPAINTSTRUCT {
    HDC hdc; BOOL fErase; RECT rcPaint; BOOL fRestore, fIncUpdate; BYTE rgbReserved[32];
} PAINTSTRUCT, *LPPAINTSTRUCT;

#define RGB(r,g,b) ((COLORREF)((BYTE)(r) | ((BYTE)(g)<<8) | ((BYTE)(b)<<16)))
#define LOWORD(l) ((WORD)((DWORD)(l) & 0xffff))
#define HIWORD(l) ((WORD)(((DWORD)(l) >> 16) & 0xffff))
#define FAR
#define NEAR
#define PASCAL
#ifndef max
#define max(a,b) (((a) > (b)) ? (a) : (b))
#define min(a,b) (((a) < (b)) ? (a) : (b))
#endif
#define MAKEINTRESOURCE(i) ((LPCTSTR)(uintptr_t)(WORD)(i))

#define CS_VREDRAW 0x0001
#define CS_HREDRAW 0x0002
#define WS_OVERLAPPEDWINDOW 0x00CF0000
#define WS_CHILD       0x40000000
#define WS_VISIBLE     0x10000000
#define WS_VSCROLL     0x00200000
#define WS_HSCROLL     0x00100000
#define WS_BORDER      0x00800000
#define ES_MULTILINE   0x0004
#define ES_AUTOVSCROLL 0x0040
#define ES_AUTOHSCROLL 0x0080
#define ES_READONLY    0x0800
#define BS_PUSHBUTTON  0x0000
#define CW_USEDEFAULT ((int)0x80000000)
#define SW_SHOW 5
#define SW_SHOWNORMAL 1

#define WM_CREATE      0x0001
#define WM_DESTROY     0x0002
#define WM_SIZE        0x0005
#define WM_PAINT       0x000F
#define WM_CLOSE       0x0010
#define WM_COMMAND     0x0111
#define WM_TIMER       0x0113
#define WM_QUIT        0x0012
#define WM_MOUSEMOVE   0x0200
#define WM_LBUTTONDOWN 0x0201
#define WM_LBUTTONUP   0x0202
#define WM_RBUTTONDOWN 0x0204
#define WM_RBUTTONUP   0x0205

#define MK_LBUTTON 0x0001
#define MK_RBUTTON 0x0002

#define WHITE_BRUSH 0
#define GRAY_BRUSH  2
#define BLACK_BRUSH 4
#define IDI_APPLICATION ((LPCTSTR)32512)
#define IDC_ARROW       ((LPCTSTR)32512)
#define IDC_WAIT        ((LPCTSTR)32514)
#define MB_ICONERROR 0x00000010
#define MB_OK        0x00000000

/* user32 */
ATOM    RegisterClass(const WNDCLASS*);
HWND    CreateWindowEx(DWORD exStyle, LPCTSTR cls, LPCTSTR name, DWORD style,
                       int x, int y, int w, int h, HWND parent, HMENU menu, HINSTANCE inst, LPVOID param);
#define CreateWindow(cls,name,style,x,y,w,h,parent,menu,inst,param) \\
        CreateWindowEx(0,cls,name,style,x,y,w,h,parent,menu,inst,param)
BOOL    ShowWindow(HWND, int);
BOOL    UpdateWindow(HWND);
BOOL    GetMessage(LPMSG, HWND, UINT, UINT);
BOOL    TranslateMessage(const MSG*);
LRESULT DispatchMessage(const MSG*);
LRESULT DefWindowProc(HWND, UINT, WPARAM, LPARAM);
void    PostQuitMessage(int);
BOOL    InvalidateRect(HWND, const RECT*, BOOL);
BOOL    GetClientRect(HWND, LPRECT);
HICON   LoadIcon(HINSTANCE, LPCTSTR);
HBITMAP LoadBitmap(HINSTANCE, LPCTSTR);
BOOL    DrawIcon(HDC, int, int, HICON);
HCURSOR LoadCursor(HINSTANCE, LPCTSTR);
HCURSOR SetCursor(HCURSOR);
int     ShowCursor(BOOL);
int     MessageBox(HWND, LPCTSTR text, LPCTSTR caption, UINT type);
BOOL    SetWindowText(HWND, LPCSTR);
int     GetWindowText(HWND, LPSTR, int);
HDC     GetDC(HWND);
int     ReleaseDC(HWND, HDC);
typedef VOID (CALLBACK *TIMERPROC)(HWND, UINT, UINT_PTR, DWORD);
UINT_PTR SetTimer(HWND, UINT_PTR, UINT, TIMERPROC);
BOOL     KillTimer(HWND, UINT_PTR);

/* gdi32 */
HDC      BeginPaint(HWND, LPPAINTSTRUCT);
BOOL     EndPaint(HWND, const PAINTSTRUCT*);
HGDIOBJ  GetStockObject(int);
HBRUSH   CreateSolidBrush(COLORREF);
int      FillRect(HDC, const RECT*, HBRUSH);
BOOL     Rectangle(HDC, int, int, int, int);
BOOL     Ellipse(HDC, int, int, int, int);
COLORREF SetTextColor(HDC, COLORREF);
BOOL     TextOut(HDC, int x, int y, LPCTSTR, int len);
COLORREF SetPixel(HDC, int x, int y, COLORREF);
BOOL     MoveToEx(HDC, int x, int y, LPPOINT old);
BOOL     LineTo(HDC, int x, int y);

/* --- extra GDI/system constants --- */
#define SRCCOPY 0x00CC0020
#define PS_SOLID 0
#define TRANSPARENT 1
#define OPAQUE 2
#define BDR_RAISEDOUTER 0x0001
#define BDR_SUNKENOUTER 0x0002
#define BDR_RAISEDINNER 0x0004
#define BDR_SUNKENINNER 0x0008
#define EDGE_RAISED 0x0005
#define EDGE_SUNKEN 0x000A
#define EDGE_ETCHED 0x0006
#define EDGE_BUMP   0x0009
#define BF_LEFT 0x0001
#define BF_TOP 0x0002
#define BF_RIGHT 0x0004
#define BF_BOTTOM 0x0008
#define BF_RECT 0x000F
#define BF_MIDDLE 0x0800
#define BF_ADJUST 0x2000
#define FW_NORMAL 400
#define FW_BOLD 700
#define DEFAULT_CHARSET 1
#define OUT_DEFAULT_PRECIS 0
#define CLIP_DEFAULT_PRECIS 0
#define DEFAULT_QUALITY 0
#define CLEARTYPE_QUALITY 5
#define ANTIALIASED_QUALITY 4
#define DEFAULT_PITCH 0
#define VARIABLE_PITCH 2
#define FF_DONTCARE 0
#define FF_SWISS 0x20
#define SM_CXSCREEN 0
#define SM_CYSCREEN 1
#define SM_CYCAPTION 4
#define SM_CXBORDER 5
#define SM_CYBORDER 6
#define SM_CYMENU 15
#define MB_ICONHAND 0x0010
#define MF_BYCOMMAND 0x0000
#define MF_CHECKED 0x0008
#define MF_UNCHECKED 0x0000
#define MF_STRING 0x0000
#define MF_POPUP 0x0010
#define MF_SEPARATOR 0x0800
#define LAYOUT_RTL 1
/* stock pens (6-8) + extra brushes */
#define WHITE_PEN 6
#define BLACK_PEN 7
#define NULL_PEN  8
#define LTGRAY_BRUSH 1
#define DKGRAY_BRUSH 3
#define NULL_BRUSH 5
#define HOLLOW_BRUSH 5
#define DC_BRUSH 18
#define DC_PEN 19
/* system colors */
#define COLOR_WINDOW 5
#define COLOR_WINDOWTEXT 8
#define COLOR_BTNFACE 15
#define COLOR_3DFACE 15
/* font pitch/family/weight */
#define FIXED_PITCH 1
#define FF_MODERN 0x30
#define FW_SEMIBOLD 600
#define FW_HEAVY 900

typedef unsigned long long ULONGLONG;

/* --- more gdi32 --- */
HDC      CreateCompatibleDC(HDC);
HBITMAP  CreateCompatibleBitmap(HDC, int, int);
BOOL     BitBlt(HDC, int, int, int, int, HDC, int, int, DWORD);
BOOL     DeleteDC(HDC);
BOOL     DeleteObject(HGDIOBJ);
HGDIOBJ  SelectObject(HDC, HGDIOBJ);
HPEN     CreatePen(int, int, COLORREF);
HFONT    CreateFontW(int,int,int,int,int,DWORD,DWORD,DWORD,DWORD,DWORD,DWORD,DWORD,DWORD,LPCWSTR);
BOOL     DrawEdge(HDC, LPRECT, UINT, UINT);
BOOL     Polygon(HDC, const POINT*, int);
BOOL     Arc(HDC, int, int, int, int, int, int, int, int);
int      SetBkMode(HDC, int);
COLORREF SetBkColor(HDC, COLORREF);
DWORD    SetLayout(HDC, DWORD);
DWORD    GetLayout(HDC);
BOOL     TextOutW(HDC, int, int, LPCWSTR, int);
HBRUSH   GetSysColorBrush(int);
BOOL     GetTextExtentPoint32W(HDC, LPCWSTR, int, LPSIZE);

/* --- user32/system extras (utilities.c stubs) --- */
int       GetSystemMetrics(int);
ULONGLONG GetTickCount64(void);
BOOL      CheckMenuItem(HMENU, UINT, UINT);
BOOL      SetMenu(HWND, HMENU);
HMENU     CreateMenu(void);
HMENU     CreatePopupMenu(void);
BOOL      AppendMenu(HMENU, UINT, UINT_PTR, LPCSTR);
BOOL      DestroyWindow(HWND);

/* --- консоль --- */
#define STD_INPUT_HANDLE  ((DWORD)-10)
#define STD_OUTPUT_HANDLE ((DWORD)-11)
#define STD_ERROR_HANDLE  ((DWORD)-12)
BOOL      AllocConsole(void);
HANDLE    GetStdHandle(DWORD);
BOOL      WriteConsoleA(HANDLE, const void*, DWORD, DWORD*, void*);
BOOL      ReadConsoleA(HANDLE, void*, DWORD, DWORD*, void*);
BOOL      SetConsoleTitleA(LPCSTR);
UINT      GetDlgItemInt(HWND, int, BOOL*, BOOL);
int       LoadString(HINSTANCE, UINT, LPSTR, int);
void      ShellAbout(HWND, LPCSTR, LPCSTR, HICON);

/* --- RECT helpers (inline) --- */
static inline void SetRect(LPRECT r, int l, int t, int rr, int b) { r->left=l; r->top=t; r->right=rr; r->bottom=b; }
static inline void InflateRect(LPRECT r, int dx, int dy) { r->left-=dx; r->top-=dy; r->right+=dx; r->bottom+=dy; }
static inline void OffsetRect(LPRECT r, int dx, int dy) { r->left+=dx; r->right+=dx; r->top+=dy; r->bottom+=dy; }

#endif
`,rn=`/* windowsx.h — минимальный стаб (макросы-хелперы). */
#ifndef WINWEB_WINDOWSX_H
#define WINWEB_WINDOWSX_H
#include <windows.h>
#define GET_X_LPARAM(lp) ((int)(short)LOWORD(lp))
#define GET_Y_LPARAM(lp) ((int)(short)HIWORD(lp))
#endif
`;function W(e){const c=[];let t=0;for(;t<e.length;){const r=e[t];if(r===" "||r==="	"){let s=t;for(;s<e.length&&(e[s]===" "||e[s]==="	");)s++;c.push({t:"ws",v:e.slice(t,s)}),t=s;continue}if(/[A-Za-z_]/.test(r)){let s=t;for(;s<e.length&&/[A-Za-z0-9_]/.test(e[s]);)s++;c.push({t:"id",v:e.slice(t,s)}),t=s;continue}if(/[0-9]/.test(r)||r==="."&&/[0-9]/.test(e[t+1]||"")){let s=t;for(;s<e.length&&/[0-9a-fA-FxX.uUlL]/.test(e[s]);)s++;c.push({t:"num",v:e.slice(t,s)}),t=s;continue}if(r==='"'){let s=t+1;for(;s<e.length&&e[s]!=='"';)e[s]==="\\"&&s++,s++;s++,c.push({t:"str",v:e.slice(t,s)}),t=s;continue}if(r==="'"){let s=t+1;for(;s<e.length&&e[s]!=="'";)e[s]==="\\"&&s++,s++;s++,c.push({t:"chr",v:e.slice(t,s)}),t=s;continue}c.push({t:"op",v:r}),t++}return c}function cn(e){let c="",t=0;for(;t<e.length;){const r=e[t],s=e[t+1];if(r==='"'||r==="'"){const d=r;for(c+=r,t++;t<e.length&&e[t]!==d;){if(e[t]==="\\"){c+=e[t]+(e[t+1]??""),t+=2;continue}c+=e[t++]}c+=e[t]??"",t++;continue}if(r==="/"&&s==="/"){for(;t<e.length&&e[t]!==`
`;)t++;continue}if(r==="/"&&s==="*"){for(t+=2,c+=" ";t<e.length&&!(e[t]==="*"&&e[t+1]==="/");)e[t]===`
`&&(c+=`
`),t++;t+=2;continue}c+=r,t++}return c}function A(e,c={}){const t=c.includes??new Map,r=new Map;if(c.defines)for(const a of Object.keys(c.defines))r.set(a,{params:null,body:c.defines[a]});const s=c.onError??(()=>{}),d=[],f=(a,_)=>{const n=[];for(let i=0;i<a.length;i++){const o=a[i];if(o.t!=="id"||!r.has(o.v)||_.has(o.v)){n.push(o);continue}const p=r.get(o.v);if(p.params===null)n.push(...f(W(p.body),new Set([..._,o.v])));else{let u=i+1;for(;u<a.length&&a[u].t==="ws";)u++;if(a[u]?.v!=="("){n.push(o);continue}u++;const S=[];let E=[],w=1;for(;u<a.length&&w>0;u++){const O=a[u];if(O.v==="(")w++;else if(O.v===")"){if(w--,w===0)break}else if(O.v===","&&w===1){S.push(E),E=[];continue}E.push(O)}(E.length||S.length)&&S.push(E);const L=O=>{for(;O[0]?.t==="ws";)O.shift();for(;O[O.length-1]?.t==="ws";)O.pop();return O},m=S.map(O=>f(L(O),_)),G=W(p.body).flatMap(O=>{if(O.t==="id"){const B=p.params.indexOf(O.v);if(B>=0)return m[B]??[]}return[O]});n.push(...f(G,new Set([..._,o.v]))),i=u}}return n},T=a=>f(W(a),new Set).map(_=>_.v).join(""),R=a=>{let _=a.replace(/\bdefined\s*\(\s*(\w+)\s*\)/g,(i,o)=>r.has(o)?"1":"0").replace(/\bdefined\s+(\w+)/g,(i,o)=>r.has(o)?"1":"0");_=T(_);const n=W(_).filter(i=>i.t!=="ws").map(i=>i.t==="id"?"0":i.v);return on(n)?1:0},l=[],h=()=>l.length===0||l[l.length-1].active,C=a=>{const _=h();return{parent:_,active:_&&a,taken:_&&a}},N=(a,_)=>{if(_>64){s("cpp: #include nesting too deep");return}const n=cn(a.replace(/\\\r?\n/g,""));let i=[];const o=()=>{i.length&&(d.push(T(i.join(`
`))),i=[])};for(const p of n.split(`
`)){const u=p.replace(/^[ \t]+/,"");if(u[0]==="#"){o();const S=u.slice(1).replace(/^[ \t]+/,""),E=S.search(/[ \t]/),w=E<0?S:S.slice(0,E),L=(E<0?"":S.slice(E+1)).trim();switch(w){case"ifdef":l.push(C(r.has(L.match(/\w+/)?.[0]??"")));break;case"ifndef":l.push(C(!r.has(L.match(/\w+/)?.[0]??"")));break;case"if":l.push(C(R(L)!==0));break;case"elif":{const m=l[l.length-1];m&&(!m.taken&&m.parent&&R(L)!==0?(m.active=!0,m.taken=!0):m.active=!1);break}case"else":{const m=l[l.length-1];m&&(m.active=m.parent&&!m.taken,m.taken=!0);break}case"endif":l.pop();break;case"define":h()&&D(L);break;case"undef":h()&&r.delete(L.match(/\w+/)?.[0]??"");break;case"include":h()&&I(L,_);break;case"error":h()&&s("cpp: #error "+L);break}}else h()&&i.push(p)}o()},D=a=>{const _=a.match(/^(\w+)/);if(!_)return;const n=_[1];if(a[n.length]==="("){const i=a.indexOf(")"),o=a.slice(n.length+1,i).split(",").map(p=>p.trim()).filter(Boolean);r.set(n,{params:o,body:a.slice(i+1).trim()})}else r.set(n,{params:null,body:a.slice(n.length).trim()})},I=(a,_)=>{const n=a.match(/^[<"]([^>"]+)[>"]/);if(!n){s("cpp: malformed #include "+a);return}const i=n[1],o=t.get(i)??t.get(i.split("/").pop()||i);if(o===void 0){s("cpp: cannot find include "+i);return}N(o,_+1)};return N(e,0),d.join(`
`)+`
`}function on(e){let c=0;const t=()=>e[c],r=()=>e[c++],s=n=>(/^0[xX]/.test(n)?parseInt(n,16):parseInt(n,10))|0,d=()=>{const n=r();if(n==="("){const i=_();return r(),i}return n==="!"?d()?0:1:n==="~"?~d():n==="-"?-d():n==="+"?+d():s(n||"0")},f=(n,i,o)=>()=>{let p=n();for(;i.includes(t());){const u=r();p=o(p,n(),u)}return p},T=f(d,["*","/","%"],(n,i,o)=>o==="*"?n*i:o==="/"?i?n/i|0:0:i?n%i:0),R=f(T,["+","-"],(n,i,o)=>o==="+"?n+i:n-i),l=f(R,["<<",">>"],(n,i,o)=>o==="<<"?n<<i:n>>i),h=f(l,["<",">","<=",">="],(n,i,o)=>+(o==="<"?n<i:o===">"?n>i:o==="<="?n<=i:n>=i)),C=f(h,["==","!="],(n,i,o)=>+(o==="=="?n===i:n!==i)),N=f(C,["&"],(n,i)=>n&i),D=f(N,["^"],(n,i)=>n^i),I=f(D,["|"],(n,i)=>n|i),a=f(I,["&&"],(n,i)=>+(!!n&&!!i)),_=f(a,["||"],(n,i)=>+(!!n||!!i));return e=dn(e),_()|0}function dn(e){const c=new Set(["<<",">>","<=",">=","==","!=","&&","||"]),t=[];for(let r=0;r<e.length;r++){const s=e[r],d=e[r+1];d&&c.has(s+d)?(t.push(s+d),r++):t.push(s)}return t}const an=`/* windows.h — МИНИМАЛЬНЫЙ C89-чистый Win32-сабсет для компилятора lcc-wasm.
 * Это НЕ полный фасадный заголовок из ../../include (там wide-char/stdint/commctrl,
 * которые строгий C89/LCC не переварит). Здесь — ровно консольная поверхность cmd.
 * Функции объявлены без тел -> lcc эмитит (import "env" ...); их даёт TS-рантайм. */
#ifndef WINWEB_LCC_WINDOWS_H
#define WINWEB_LCC_WINDOWS_H

#define WINAPI
#define CALLBACK

typedef int            BOOL;
typedef unsigned int   DWORD;
typedef unsigned int   UINT;
typedef int            HANDLE;        /* у нас дескриптор = просто id консоли (i32) */
typedef void          *HINSTANCE;
typedef char          *LPSTR;
typedef const char    *LPCSTR;
typedef DWORD         *LPDWORD;
typedef void          *LPVOID;

#define TRUE  1
#define FALSE 0
#define STD_INPUT_HANDLE  (-10)
#define STD_OUTPUT_HANDLE (-11)
#define STD_ERROR_HANDLE  (-12)

/* консольный API — реализуется TS-рантаймом winweb (env-импорты) */
BOOL   AllocConsole(void);
BOOL   SetConsoleTitleA(LPCSTR title);
HANDLE GetStdHandle(DWORD which);
BOOL   WriteConsoleA(HANDLE h, LPCSTR buf, DWORD len, LPDWORD written, LPVOID reserved);

#endif
`,fn=`/* string.h — крошечные C89-реализации строковых функций для lcc-wasm.
 * static -> вкомпилируются прямо в модуль, никакой линковки с libc не нужно.
 * Покрывает ровно то, что зовёт cmd. strcasecmp здесь же (POSIX, не ISO). */
#ifndef WINWEB_LCC_STRING_H
#define WINWEB_LCC_STRING_H

static unsigned wstrlen_(const char *s) { const char *p = s; while (*p) p++; return (unsigned)(p - s); }
static char *wstrcpy_(char *d, const char *s) { char *r = d; while ((*d++ = *s++) != 0) ; return r; }
static char *wstrcat_(char *d, const char *s) { char *r = d; while (*d) d++; while ((*d++ = *s++) != 0) ; return r; }
static char *wstrchr_(const char *s, int c) { while (*s) { if (*s == (char)c) return (char *)s; s++; } return (c == 0) ? (char *)s : 0; }
static char *wstrrchr_(const char *s, int c) { const char *last = 0; do { if (*s == (char)c) last = s; } while (*s++); return (char *)last; }
static int wstrcmp_(const char *a, const char *b) { while (*a && *a == *b) { a++; b++; } return (unsigned char)*a - (unsigned char)*b; }
static void *wmemmove_(void *d, const void *s, unsigned n) { char *dd = (char *)d; const char *ss = (const char *)s; if (dd < ss) while (n--) *dd++ = *ss++; else { dd += n; ss += n; while (n--) *--dd = *--ss; } return d; }
static int wlower_(int c) { return (c >= 'A' && c <= 'Z') ? c + 32 : c; }
static int wstrcasecmp_(const char *a, const char *b) { while (*a && wlower_((unsigned char)*a) == wlower_((unsigned char)*b)) { a++; b++; } return wlower_((unsigned char)*a) - wlower_((unsigned char)*b); }

/* стандартные имена -> наши реализации */
#define strlen      wstrlen_
#define strcpy      wstrcpy_
#define strcat      wstrcat_
#define strchr      wstrchr_
#define strrchr     wstrrchr_
#define strcmp      wstrcmp_
#define memmove     wmemmove_
#define strcasecmp  wstrcasecmp_

#endif
`,ln=`/* windows.h — GUI-сабсет Win32 для компиляции оконных приложений компилятором lcc-wasm.
 * Раскладка структур СОВПАДАЕТ с шимами в src/cc/win32rt.ts (lpfnWndProc@4, lpszClassName@36,
 * PAINTSTRUCT.hdc@0). Функции объявлены без тел -> lcc эмитит (import "env" ...); их даёт
 * TS-фасад. Дескрипторы (HWND/HDC/...) — это просто i32-id в winweb. Строго C89. */
#ifndef _WINWEB_GUI_WINDOWS_H
#define _WINWEB_GUI_WINDOWS_H

/* сообщения / флаги */
#define WM_DESTROY 2
#define WM_PAINT 15
#define WM_MOUSEMOVE 512
#define WM_LBUTTONDOWN 513
#define WM_LBUTTONUP 514
#define WM_RBUTTONDOWN 516
#define MK_LBUTTON 1
/* стоковые объекты / перья / фон */
#define WHITE_BRUSH 0
#define LTGRAY_BRUSH 1
#define GRAY_BRUSH 2
#define BLACK_BRUSH 4
#define WHITE_PEN 6
#define BLACK_PEN 7
#define PS_SOLID 0
#define TRANSPARENT 1
#define OPAQUE 2

typedef int HWND, HDC, HINSTANCE, HBRUSH, HPEN, HGDIOBJ, HMENU;
typedef char *LPSTR;
typedef int (*WNDPROC)(HWND, int, int, int);

typedef struct WNDCLASS {
    int style; WNDPROC lpfnWndProc; int cbClsExtra; int cbWndExtra;
    HINSTANCE hInstance; int hIcon; int hCursor; HBRUSH hbrBackground;
    LPSTR lpszMenuName; LPSTR lpszClassName;
} WNDCLASS;
typedef struct MSG { HWND hwnd; int message; int wParam; int lParam; int time; int x; int y; } MSG;
typedef struct PAINTSTRUCT { HDC hdc; int fErase; int rcL; int rcT; int rcR; int rcB; int rsv1; int rsv2; } PAINTSTRUCT;
typedef struct RECT { int left; int top; int right; int bottom; } RECT;

/* USER32 */
int  RegisterClass(WNDCLASS *wc);
HWND CreateWindow(LPSTR cls, LPSTR title, int style, int x, int y, int w, int h, HWND parent, HMENU menu, HINSTANCE inst, int param);
int  ShowWindow(HWND hwnd, int cmd);
int  UpdateWindow(HWND hwnd);
int  InvalidateRect(HWND hwnd, int rect, int erase);
int  GetMessage(MSG *m, HWND hwnd, int mn, int mx);
int  TranslateMessage(MSG *m);
int  DispatchMessage(MSG *m);
int  DefWindowProc(HWND hwnd, int msg, int wp, int lp);
int  PostQuitMessage(int code);
int  GetClientRect(HWND hwnd, RECT *r);
HGDIOBJ GetStockObject(int o);
HDC  BeginPaint(HWND hwnd, PAINTSTRUCT *ps);
int  EndPaint(HWND hwnd, PAINTSTRUCT *ps);
HDC  GetDC(HWND hwnd);
int  ReleaseDC(HWND hwnd, HDC hdc);

/* GDI */
int  TextOut(HDC hdc, int x, int y, LPSTR s, int len);
int  Rectangle(HDC hdc, int l, int t, int r, int b);
int  Ellipse(HDC hdc, int l, int t, int r, int b);
int  RGB(int r, int g, int b);
HPEN CreatePen(int style, int width, int color);
HBRUSH CreateSolidBrush(int color);
HGDIOBJ SelectObject(HDC hdc, HGDIOBJ obj);
int  DeleteObject(HGDIOBJ obj);
int  SetTextColor(HDC hdc, int color);
int  SetBkMode(HDC hdc, int mode);
int  FillRect(HDC hdc, RECT *rc, HBRUSH brush);
int  MoveToEx(HDC hdc, int x, int y, int pt);
int  LineTo(HDC hdc, int x, int y);

#endif
`,_n=`/* libc-extra.c — функции libc, которых нет в lcc lib/wasm/libc.c.
 * Амальгамируется СРАЗУ ПОСЛЕ libc.c (vsnprintf, va_list уже в области видимости). */

int snprintf(char *out, unsigned long n, const char *fmt, ...) {
    va_list ap;
    int r;
    va_start(ap, fmt);
    r = vsnprintf(out, n, fmt, ap);
    va_end(ap);
    return r;
}

static int lc_(int c) { return (c >= 'A' && c <= 'Z') ? c + 32 : c; }
int strcasecmp(const char *a, const char *b) {
    int ca, cb;
    for (;;) {
        ca = lc_((unsigned char)*a++); cb = lc_((unsigned char)*b++);
        if (ca != cb) return ca - cb;
        if (!ca) return 0;
    }
}
int strncasecmp(const char *a, const char *b, unsigned long n) {
    int ca, cb;
    while (n--) {
        ca = lc_((unsigned char)*a++); cb = lc_((unsigned char)*b++);
        if (ca != cb) return ca - cb;
        if (!ca) return 0;
    }
    return 0;
}
`,hn=new Map([["windows.h",an],["string.h",fn]]),pn=new Map([["windows.h",ln]]),b=Object.assign({"../../tools/lcc/wasm-libc/assert.h":z,"../../tools/lcc/wasm-libc/ctype.h":k,"../../tools/lcc/wasm-libc/errno.h":j,"../../tools/lcc/wasm-libc/float.h":X,"../../tools/lcc/wasm-libc/libc.c":Y,"../../tools/lcc/wasm-libc/limits.h":K,"../../tools/lcc/wasm-libc/stdarg.h":V,"../../tools/lcc/wasm-libc/stddef.h":q,"../../tools/lcc/wasm-libc/stdio.h":J,"../../tools/lcc/wasm-libc/stdlib.h":Z,"../../tools/lcc/wasm-libc/string.h":Q,"../../tools/lcc/wasm-libc/time.h":$}),y=new Map;let P="";for(const e of Object.keys(b)){const c=e.split("/").pop()||e;c==="libc.c"?P=b[e]:c.endsWith(".h")&&y.set(c,b[e])}const x=Object.assign({"../../include/commctrl.h":nn,"../../include/dwmapi.h":tn,"../../include/shellapi.h":en,"../../include/windows.h":sn,"../../include/windowsx.h":rn}),F=new Map;for(const e of Object.keys(x))F.set(e.split("/").pop(),x[e]);const H=(e,c)=>`#ifndef _SHIM_${e}
#define _SHIM_${e}
${c}
#endif
`,un=new Map([["emscripten.h",H("EMSC",`#define EMSCRIPTEN_KEEPALIVE
#define emscripten_sleep(x)`)],["stdint.h",H("STDINT","typedef signed char int8_t; typedef unsigned char uint8_t; typedef short int16_t; typedef unsigned short uint16_t; typedef int int32_t; typedef unsigned int uint32_t; typedef long long int64_t; typedef unsigned long long uint64_t; typedef unsigned long uintptr_t; typedef long intptr_t;")],["stddef.h",H("STDDEF",`typedef unsigned long size_t; typedef long ptrdiff_t;
#ifndef NULL
#define NULL ((void*)0)
#endif
typedef unsigned short wchar_t;`)],["stdarg.h",H("STDARG",`typedef char *va_list;
#define va_start(ap,last) ((ap)=(va_list)&(last)+8)
#define va_arg(ap,t) (*(t*)(((ap)+=8)-8))
#define va_end(ap) ((void)0)
#define va_copy(d,s) ((d)=(s))`)]]);let M=null;async function g(){return M||(M=await(await fetch("/demo/winweb/lcc/rcc.wasm",{cache:"no-store"})).arrayBuffer()),M}function v(e,c){let t;const r=new TextEncoder().encode(c),s=[],d=[];let f=0;const T={__read:(n,i,o)=>{if(n!==0)return 0;const p=Math.min(o,r.length-f);return p<=0?0:(new Uint8Array(t.buffer).set(r.subarray(f,f+p),i),f+=p,p)},__write:(n,i,o)=>{const p=new Uint8Array(t.buffer,i,o);for(let u=0;u<o;u++)(n===1?s:d).push(p[u]);return o},__exit:n=>{throw{__exit:n}}},R=new WebAssembly.Instance(new WebAssembly.Module(e),{env:U(T)});t=R.exports.memory;const l=["rcc","-target=wasm-bin"],h=2031616,C=new DataView(t.buffer),N=new Uint8Array(t.buffer);let D=h;const I=[];for(const n of l){I.push(D);for(let i=0;i<n.length;i++)N[D+i]=n.charCodeAt(i);N[D+n.length]=0,D+=n.length+1}const a=D+7&-8;I.forEach((n,i)=>C.setUint32(a+i*4,n,!0));let _=0;try{R.exports.main(l.length,a)}catch(n){if(n.__exit===void 0)throw n;_=n.__exit}return{wasm:new Uint8Array(s),stderr:new TextDecoder().decode(new Uint8Array(d)),code:_}}async function Tn(e,c){const t=new Map(hn);if(c)for(const[R,l]of c)t.set(R,l);let r="";const s=A(e,{includes:t,onError:R=>{r+=R+`
`}});if(r)throw new Error(r.trim());const{wasm:d,stderr:f,code:T}=v(await g(),s);if(T!==0||d.length===0)throw new Error("rcc failed (code "+T+`):
`+(f||"(no output)"));return{wasm:d,stderr:f}}async function Rn(e){let c="";const t=A(P+`
`+e,{includes:y,onError:f=>{c+=f+`
`}});if(c)throw new Error(c.trim());const{wasm:r,stderr:s,code:d}=v(await g(),t);if(d!==0||r.length===0)throw new Error("rcc failed (code "+d+`):
`+(s||"(no output)"));return{wasm:r,stderr:s}}async function mn(e){let c="";const t=A(e,{includes:pn,onError:f=>{c+=f+`
`}});if(c)throw new Error(c.trim());const{wasm:r,stderr:s,code:d}=v(await g(),t);if(d!==0||r.length===0)throw new Error("rcc failed (code "+d+`):
`+(s||"(no output)"));return{wasm:r,stderr:s}}async function En(e,c){const t=new Map;for(const[l,h]of y)t.set(l,h);for(const[l,h]of un)t.set(l,h);for(const[l,h]of F)t.set(l,h);if(c)for(const[l,h]of c)t.set(l,h);const r=P+`
`+_n+`
`+e.join(`
`);let s="";const d=A(r,{includes:t,defines:{inline:"",__inline:"",__forceinline:""},onError:l=>{s+=l+`
`}});if(s)throw new Error(s.trim());const{wasm:f,stderr:T,code:R}=v(await g(),d);if(R!==0||f.length===0)throw new Error("rcc failed (code "+R+`):
`+(T||"(no output)"));return{wasm:f,stderr:T}}function Ln(e,c){let t;const r={__read:()=>0,__write:(d,f,T)=>{const R=new Uint8Array(t.buffer,f,T);let l="";for(let h=0;h<T;h++)l+=String.fromCharCode(R[h]);return c(d===2?l:l.replace(/\r?\n/g,`\r
`)),T},__exit:d=>{throw{__exit:d}}},s=new WebAssembly.Instance(new WebAssembly.Module(e),{env:U(r)});t=s.exports.memory;try{return s.exports.main()|0}catch(d){if(d.__exit===void 0)throw d;return d.__exit}}export{Tn as compileC,Rn as compileConsole,mn as compileGui,En as compileProject,Ln as runConsole};
