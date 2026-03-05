---
title: Симулятор PocketBook в браузере
date: 2026-03-05
layout: post
tags:
  - C
  - C++
  - emscripten
  - wasm
  - pocketbook
---

*Компилируем приложения для электронной книги PocketBook в WebAssembly и запускаем их прямо в браузере, не меняя исходный код*

[Репозиторий](https://github.com/esix/pocketbook-simulator)

<!-- screenshot -->
![Симулятор](screenshot.png)

<!--more-->

## Что такое PocketBook

PocketBook — это электронная книга на e-ink экране. У неё есть SDK под названием **InkView**, которое позволяет писать приложения на C/C++. SDK поставляется в виде заголовочного файла `inkview.h` и библиотеки. Приложения компилируются под ARM и запускаются на устройстве.

Разработка под реальное устройство не очень удобна: нужно каждый раз копировать бинарник на книгу, запускать, смотреть результат. Хотелось бы иметь возможность быстро проверить, как выглядит приложение прямо на компьютере.

Идея: взять [Emscripten](https://emscripten.org/), скомпилировать C/C++ код в WebAssembly, и реализовать InkView API на JavaScript с Canvas 2D. Тогда любое приложение, написанное под PocketBook, можно будет запустить в браузере без изменений в исходном коде.

## Архитектура

Симулятор состоит из трёх слоёв:

```
приложение на C/C++
        │  вызывает
        ▼
src/inkview.c          — тонкая обёртка на C, каждая функция InkView
                          пробрасывается в JS через макросы EM_JS
        │  вызывает
        ▼
simulator/inkview-emu.mjs  — реализация InkView API на JavaScript,
                              рисует в Canvas 2D
```

Приложение не знает, что работает в браузере. Оно вызывает `FillArea`, `DrawString`, `OpenFont` — как обычно, только вместо реального устройства под капотом оказывается браузерный холст.

## inkview.h — API для рисования

`inkview.h` — это большой заголовочный файл, описывающий всё, что умеет InkView. Вот что там есть.

### Экран и очистка

```c
int  ScreenWidth(void);
int  ScreenHeight(void);
void ClearScreen(void);
```

Стандартный экран PocketBook 6" — это 600×800 пикселей в портретной ориентации.

### Рисование примитивов

```c
void DrawPixel(int x, int y, int color);
void DrawLine(int x1, int y1, int x2, int y2, int color);
void DrawRect(int x, int y, int w, int h, int color);
void FillArea(int x, int y, int w, int h, int color);
void DrawCircle(int x0, int y0, int radius, int color);
void InvertAreaBW(int x, int y, int w, int h);
```

Цвет передаётся как `int` в формате `0xRRGGBB`. Поскольку экран e-ink — монохромный с несколькими уровнями серого, настоящие приложения используют оттенки серого: `BLACK = 0x000000`, `DGRAY = 0x555555`, `LGRAY = 0xaaaaaa`, `WHITE = 0xffffff`.

### Шрифты и текст

```c
ifont *OpenFont(const char *name, int size, int aa);
void   CloseFont(ifont *font);
void   SetFont(ifont *font, int color);
int    StringWidth(const char *str);
void   DrawString(int x, int y, const char *str);
void   DrawTextRect(int x, int y, int w, int h,
                    const char *text, int flags);
```

`OpenFont` возвращает указатель на шрифт. `SetFont` устанавливает активный шрифт и цвет текста. `DrawTextRect` умеет выравнивать текст по горизонтали и вертикали — флаги `ALIGN_LEFT`, `ALIGN_CENTER`, `ALIGN_RIGHT`, `VALIGN_TOP`, `VALIGN_MIDDLE`, `VALIGN_BOTTOM`.

### Обновление экрана

```c
void FullUpdate(void);
void PartialUpdate(int x, int y, int w, int h);
void PartialUpdateBW(int x, int y, int w, int h);
```

На реальном устройстве e-ink экран не обновляется сам по себе — нужно явно вызвать `FullUpdate` или `PartialUpdate`. `FullUpdate` делает полную перерисовку с характерным миганием. `PartialUpdate` быстрее, но оставляет артефакты.

### Таймеры

```c
void SetHardTimer(const char *name, iv_timerproc proc, int ms);
```

Устанавливает таймер с именем. Если таймер с таким именем уже есть — он перезаписывается. Это удобно для отмены: `SetHardTimer("my_timer", NULL, 0)` отменяет таймер.

### События

Приложение получает события через функцию-обработчик с сигнатурой `int handler(int type, int par1, int par2)`. Она регистрируется через `InkViewMain`:

```c
int main() {
    InkViewMain(handler);
    return 0;
}
```

Основные события:

| Константа | Описание |
|---|---|
| `EVT_INIT` | Приложение запущено |
| `EVT_SHOW` | Нужно нарисовать экран |
| `EVT_EXIT` | Приложение закрывается |
| `EVT_KEYPRESS` | Нажата кнопка, `par1` — код клавиши |
| `EVT_POINTERDOWN` | Касание экрана, `par1/par2` — координаты |
| `EVT_POINTERMOVE` | Движение пальца |
| `EVT_POINTERUP`   | Отпустили палец |
| `EVT_ORIENTATION` | Изменилась ориентация |

Коды кнопок: `KEY_UP`, `KEY_DOWN`, `KEY_LEFT`, `KEY_RIGHT`, `KEY_OK`, `KEY_BACK`, `KEY_PREV`, `KEY_NEXT` и другие.

## Emscripten

[Emscripten](https://emscripten.org/) — это компилятор, который превращает C/C++ код в WebAssembly. Он поставляется как замена `gcc`/`clang`: вместо `gcc main.c -o main` пишешь `emcc main.c -o main.mjs` и получаешь `.mjs` + `.wasm`, которые можно загрузить в браузере.

```sh
emcc -Iinclude -s WASM=1 app.c inkview.o \
     -o projects/app/index.mjs \
     -s EXPORTED_FUNCTIONS='["_main","_malloc"]' \
     -s EXPORTED_RUNTIME_METHODS='["UTF8ToString","stringToUTF8"]' \
     -s USE_FREETYPE=1 -s USE_ZLIB=1 \
     -s MODULARIZE=1 -s 'EXPORT_NAME="createPocketBookModule"' \
     -s EXPORT_ES6=1 -O3
```

Несколько ключевых флагов:

- `-s MODULARIZE=1` — вместо глобального модуля генерируется фабричная функция `createPocketBookModule()`. Это позволяет запускать несколько модулей на одной странице.
- `-s EXPORT_ES6=1` — выходной файл в формате ES-модуля, удобно импортировать через `import`.
- `-s INVOKE_RUN=0` — `main()` не вызывается автоматически при загрузке. Мы вызываем его сами, когда всё готово.
- `-s USE_FREETYPE=1` — подключает Freetype, скомпилированный под WASM. InkView использует Freetype для рендеринга шрифтов.
- `-O3` — оптимизация. Без неё `.wasm` будет раза в два больше.

### EM_JS — мост между C и JavaScript

Самая интересная часть — макрос `EM_JS`. Он позволяет прямо в C-файле написать тело JavaScript-функции, которая будет вызываться из C-кода:

```c
EM_JS(void, FillArea, (int x, int y, int w, int h, int color), {
    Module.api.FillArea(x, y, w, h, color);
});
```

Это объявляет C-функцию `FillArea`, тело которой — JavaScript. Когда C-код вызывает `FillArea(10, 20, 100, 50, 0)`, управление уходит в JS, где `Module.api` — это наш JavaScript-объект с реализацией симулятора.

Строки из C в JS передаются как указатели. Чтобы их прочитать, Emscripten предоставляет `UTF8ToString`:

```c
EM_JS(ifont*, jsOpenFont, (const char *name, int size, int aa), {
    var fontName = UTF8ToString(name);
    var font = Module.api.OpenFont(fontName, size, aa);
    // ...
    return ptr;
});
```

Обратно — `stringToUTF8` для записи строки в память WASM.

Структуры читаются напрямую из памяти WASM через `HEAP16`, `HEAP32`:

```c
// imenu: short type(2B) + short index(2B) + char* text(4B) + imenu* sub(4B)
EM_JS(void, OpenMenu, (imenu *menu_ptr, int pos, int x, int y, iv_menuhandler hproc), {
    var items = [];
    var ptr = menu_ptr;
    while (true) {
        var type  = HEAP16[ptr >> 1];
        var index = HEAP16[(ptr + 2) >> 1];
        var textP = HEAP32[(ptr + 4) >> 2];
        if (type === 0) break;
        items.push({ type, index, text: textP ? UTF8ToString(textP) : "" });
        ptr += 12;
    }
    Module.api.OpenMenu(items, x, y, hproc);
});
```

### Вызов C из JavaScript

В обратную сторону — вызов C-функций из JS — используется таблица функций WASM. Когда C-код передаёт указатель на функцию (например, обработчик событий или колбэк таймера), это индекс в таблице:

```js
// Вызов C-обработчика событий
Module.wasmTable.get(handlerPtr)(eventType, par1, par2);

// Вызов колбэка таймера
Module.wasmTable.get(timerProc)();
```

Именно так работает `SetHardTimer`: в JS создаётся `setTimeout`, который при срабатывании вызывает `wasmTable.get(tproc)()`.

## JavaScript-симулятор

`simulator/inkview-emu.mjs` — это ES-модуль, который реализует InkView API через Canvas 2D. Объект `api` содержит методы: `FillArea`, `DrawLine`, `DrawTextRect`, `OpenFont`, `SetFont`, `FullUpdate` и другие.

```js
function colorToCSS(color) {
    return `#${(color >>> 0).toString(16).padStart(6, '0')}`;
}

const api = {
    FillArea(x, y, w, h, color) {
        ctx.fillStyle = colorToCSS(color);
        ctx.fillRect(x, y, w, h);
    },

    SetFont(fontPtr, color) {
        const font = this._fontsByPtr.get(fontPtr);
        ctx.font = `${font.size}px "${font.name}"`;
        ctx.fillStyle = colorToCSS(color);
        this._currentColor = color;
    },

    DrawTextRect(x, y, w, h, text, flags) {
        // выравнивание текста по флагам ALIGN_* и VALIGN_*
        // ...
        ctx.fillText(text, tx, ty);
    },

    FullUpdate() {
        // на реальном устройстве — перерисовка e-ink
        // в браузере Canvas уже актуален, ничего делать не нужно
    },
};
```

Шрифты загружаются через CSS `@font-face`, файлы `.ttf` лежат в `simulator/fonts/`. Для рендеринга используется LiberationSans — свободный шрифт, совместимый с Arial.

## Makefile

Структура Makefile простая: одна цель на приложение.

```makefile
CC      = emcc
CFLAGS  = -Iinclude -s WASM=1 -s INVOKE_RUN=0
EXPORTED_FUNCTIONS = -s EXPORTED_FUNCTIONS='["_main","_malloc"]'
EXPORTED_RUNTIME   = -s EXPORTED_RUNTIME_METHODS='["UTF8ToString","wasmTable","lengthBytesUTF8","stringToUTF8"]'
ADDITIONAL_LIBS    = -s USE_FREETYPE=1 -s USE_ZLIB=1
MODULARIZE         = -s MODULARIZE=1 -s 'EXPORT_NAME="createPocketBookModule"' \
                     -s EXPORT_ES6=1 -O3

# Сначала компилируем общую библиотеку-обёртку
lib/inkview.o: src/inkview.c
	$(CC) $(CFLAGS) -c $< -o $@ $(ADDITIONAL_LIBS) \
	  $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME)

# Затем каждое приложение
calc: projects/calc/calcexe.c lib/inkview.o
	$(CC) $(CFLAGS) projects/calc/calcexe.c lib/inkview.o \
	  -o projects/$@/index.mjs \
	  $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME) \
	  $(ADDITIONAL_LIBS) $(MODULARIZE)
```

`lib/inkview.o` компилируется один раз и линкуется с каждым приложением. Важный момент: `inkview.o` нельзя упаковать в архив (`.a`) и линковать через `-l`. EM_JS-символы в `.o`-файле имеют тип `U` (undefined) и не разрешаются из архива — нужно передавать `.o` напрямую.

Для C++ проектов с несколькими файлами перечисляем их все:

```makefile
HELLOWORLD_SRC = projects/helloworld/src/main.cpp \
                 projects/helloworld/src/handler/eventHandler.cpp \
                 projects/helloworld/src/handler/menuHandler.cpp \
                 projects/helloworld/src/ui/basicView.cpp

helloworld: $(HELLOWORLD_SRC) lib/inkview.o
	$(CC) $(CFLAGS) \
	  -Iprojects/helloworld/src/handler \
	  -Iprojects/helloworld/src/ui \
	  $(HELLOWORLD_SRC) lib/inkview.o \
	  -o projects/$@/index.mjs \
	  $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME) \
	  $(ADDITIONAL_LIBS) $(MODULARIZE)
```

## Загрузка в браузере

В браузере модуль загружается и инициализируется через стандартный ES-импорт:

```js
import createPocketBookModule from './projects/calc/index.mjs';

const module = await createPocketBookModule({
    locateFile: (path) => `./projects/calc/${path}`,
});

// Подключаем наш API-объект
module.api = inkviewApi;

// Запускаем main()
module._main();
```

После `_main()` приложение вызывает `InkViewMain(handler)`, который сохраняет указатель на обработчик. Затем симулятор отправляет `EVT_INIT` и `EVT_SHOW`, и приложение начинает рисовать.

## Результат

В симуляторе работают несколько приложений:

- **demo01** — простая демка с рисованием
- **calc** — калькулятор с шрифтами и клавиатурным вводом
- **touch** — демонстрация pointer-событий
- **helloworld** — многофайловый C++ проект с заголовком, рисованием касаниями и выпадающим меню

Поворот экрана (0°/90°/180°/270°) работает через CSS-трансформацию канваса и передачу `EVT_ORIENTATION` в приложение. Навигация между приложениями — через URL-хэш: `#calc`, `#helloworld` и т.д.

Проект лежит на GitHub: [esix/pocketbook-simulator](https://github.com/esix/pocketbook-simulator)
