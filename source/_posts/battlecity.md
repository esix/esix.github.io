---
title: "Battle City по видеозвонку: пишем игру внутри FreeSWITCH"
date: 2026-04-16
layout: post
tags:
  - C++
  - gamedev
  - freeswitch
  - gstreamer
  - VoIP
  - retro
  - crazydev
---

Лет десять назад написал модуль для FreeSWITCH, который превращает обычный видеозвонок в мультиплеерную игру Battle City. Звонишь на номер 9999, видишь игровое поле, управляешь танком через цифровую клавиатуру телефона. Несколько игроков звонят — несколько танков на поле.

Проект пролежал на полке. Недавно решил его откопать, разобраться заново и довести до рабочего состояния.

- [Репозиторий](https://github.com/esix/mod_battlecity)

{% html5video auto 250px %}/assets/battlecity-play.webm{% endhtml5video %}

<!--more-->

## Идея

Всё просто: SIP-клиент (Linphone, MicroSIP, аппаратный IP-телефон) делает видеозвонок. FreeSWITCH принимает вызов и вместо обычной видеоконференции отдаёт картинку с игрой. Игрок нажимает кнопки на клавиатуре телефона — DTMF-тоны приходят на сервер и управляют танком.

Управление:
- **2** — вверх
- **8** — вниз
- **4** — влево
- **6** — вправо
- **5** — огонь

Нажал направление — танк поехал. Нажал ещё раз — остановился. Нажал другое направление — повернулся. Как на настоящей NES.

## FreeSWITCH и модули

[FreeSWITCH](https://freeswitch.com/) — это open-source софтсвитч. Обычно его используют для IP-телефонии: SIP-регистрация, маршрутизация звонков, IVR, конференции. Но архитектура модульная — можно написать свой модуль, который делает что угодно с вызовом.

Модуль FreeSWITCH — это shared library (`.so`), которая экспортирует определённую структуру:

```c
SWITCH_MODULE_DEFINITION(mod_battlecity, mod_battlecity_load, mod_battlecity_shutdown, NULL);
```

При загрузке вызывается `mod_battlecity_load`, где мы регистрируем dialplan-приложение:

```c
SWITCH_ADD_APP(app_interface, "play_battlecity", "play battlecity", 
               "play battlecity", play_battlecity_function, "<file>", SAF_NONE);
```

После этого в dialplan можно написать:

```xml
<extension name="battlecity">
  <condition field="destination_number" expression="^9999$">
    <action application="play_battlecity" data=""/>
  </condition>
</extension>
```

Звонок на 9999 попадает в нашу функцию `play_battlecity_function`. Дальше — дело техники.

## Архитектура

Внутри три слоя:

**Игровой мир** (`world.cpp`) — живёт в отдельном потоке, тикает каждые 40 мс. Стены, танки, пули, взрывы, коллизии. Поле 16×12 клеток. Четыре респауна по углам. Карта захардкожена — классика:

```c
static const char *world_map[] = {
  "R       ww    R ",
  "        ww      ",
  "    ww          ",
  "    ww          ",
  "ww  ww  wwww  ww",
  "ww  ww  wwww  ww",
  "ww  wwww  ww  ww",
  "ww  wwww  ww  ww",
  "          ww    ",
  "          ww    ",
  "R     ww      R ",
  "      ww        "
};
```

**Рендерер** (`renderer.cpp`) — рисует состояние мира в RGB-буфер 320×240. Каждому игроку свой ракурс: его танк — одним цветом, чужие — другим.

**Контроллер потока** (`stream-controller.cpp`) — связывает FreeSWITCH с игрой. Принимает DTMF, отдаёт видео и аудио.

## Текстуры в формате XPM

Спрайты хранятся в формате XPM (X PixMap) — это текстовый формат, который выглядит как массив строк на C. Его можно прямо `#include` в исходник:

```c
#include "resources/tank.xpm"
#include "resources/enemy_tank.xpm"
#include "resources/tiles.xpm"
#include "resources/bullet.xpm"
#include "resources/explosion.xpm"
```

XPM содержит палитру и пиксели:

```c
static const char *bullet[] = {
  "4 4 15 1",           // 4x4 пикселя, 15 цветов, 1 символ на пиксель
  "  c None",           // прозрачный
  ". c #A0A0A0",        // светло-серый
  // ...
  ";oO-",               // строки пикселей
  "+@&%",
  "$#*=",
  "  X."
};
```

При загрузке парсится палитра, формируется массив RGB-пикселей с маской прозрачности. При отрисовке — поворот текстуры на 0°/90°/180°/270° через преобразование координат, без отдельных спрайтов для каждого направления:

```cpp
switch(orientation) {
  case E_NORTH: oy = ty;      ox = tx;     break;
  case E_WEST : oy = inv_tx;  ox = ty;     break;
  case E_SOUTH: oy = inv_ty;  ox = inv_tx; break;
  case E_EAST : oy = tx;      ox = inv_ty; break;
}
```

## GStreamer: видео из ничего

Главный вопрос: как превратить RGB-буфер в H.264 видеопоток и отправить его по RTP?

Рассматривал варианты:
- **FFmpeg (libav)** — пришлось бы самому заниматься RTP-пакетизацией
- **Внутренние функции FreeSWITCH** — `mod_h26x` только пропускает готовый H.264, кодировать не умеет
- **GStreamer** — конвейерная модель, всё из коробки

Выбрал GStreamer. Конвейер описывается строкой:

```c
#define GST_PIPELINE_H264 \
  "x264enc pass=cbr bitrate=1024 byte-stream=true bframes=0 " \
  "key-int-max=5 tune=zerolatency speed-preset=ultrafast " \
  "! video/x-h264,stream-format=byte-stream,profile=baseline " \
  "! rtph264pay mtu=1200 config-interval=1"
```

На входе — `appsrc`, куда мы кладём сырые RGB-кадры. На выходе — `appsink`, откуда забираем готовые RTP-пакеты с H.264.

Механизм простой. GStreamer дёргает колбэк `cb_need_data` когда ему нужен следующий кадр:

```cpp
gboolean GstVideo::cb_need_data(GstElement *appsrc, guint unused_size, gpointer data) {
  GstVideo *gst_video = (GstVideo *)data;
  vector<char> video_data = gst_video->_provider->get_video_buffer();
  // ... создаём GstBuffer, копируем данные, пушим в appsrc
}
```

Когда кадр закодирован и запакован в RTP, срабатывает `on_new_sample_from_sink` — мы забираем пакет и отдаём FreeSWITCH'у.

## Хитрость с отправкой видео

Это оказалось самым сложным. FreeSWITCH v1.10 имеет несколько путей записи видео в RTP-сессию:

- `switch_core_session_write_video_frame()` — стандартный путь. Но он **не работает** для наших нужд: в режиме passthrough H.264 RTP-сокет создаётся, но пакеты не отправляются.
- Прямой UDP через `sendto()` — работает, но с чужим SSRC Linphone отвергает пакеты.
- `switch_rtp_write_raw()` — пишет в RTP-сокет FreeSWITCH, но тоже не подхватывает SSRC сессии.

Рабочий вариант нашёлся: **`switch_core_session_write_encoded_video_frame()`** с флагом `SFF_RAW_RTP_PARSE_FRAME`. Этот путь идёт через endpoint IO routine (`sofia_write_video_frame`), а в RTP-слое FreeSWITCH сам подставляет правильные SSRC, sequence number и payload type:

```c
if (switch_test_flag(frame, SFF_RAW_RTP_PARSE_FRAME)) {
    send_msg->header.version = 2;
    send_msg->header.m = frame->m;
    send_msg->header.ts = htonl(frame->timestamp);
    send_msg->header.ssrc = htonl(rtp_session->ssrc);
}
```

Это позволяет нам генерировать RTP-пакеты в GStreamer, а FreeSWITCH — исправлять заголовки перед отправкой. Клиент получает корректный поток.

## Многопоточность

В модуле живут несколько потоков:

1. **World thread** — обновляет игровой мир каждые 40 мс. Создаётся при загрузке модуля, один на все сессии.
2. **Session thread** — по одному на каждый вызов. Крутит main loop: читает аудио/видео фреймы, обрабатывает DTMF, пишет видео.
3. **GStreamer threads** — по два на сессию (appsrc need-data и appsink new-sample). Работают асинхронно.

Синхронизация — через `pthread_rwlock_t` на структурах мира. Чтение (рендерер, получение списка игроков) — shared lock. Запись (добавление/удаление игроков, пуль, взрывов) — exclusive lock:

```cpp
player_t World::add_player() {
  Respawn resp = get_free_respawn();
  player_t player(new Player(this, resp.get_x(), resp.get_y()));
  pthread_rwlock_wrlock(&_lock);
  _players.push_back(player);
  pthread_rwlock_unlock(&_lock);
  return player;
}
```

Владение объектами — через `std::shared_ptr`. Когда игрок вешает трубку, его shared_ptr удаляется из вектора, и если больше ссылок нет — объект уничтожается.

## Звуки

Аудио генерируется программно — синтез в реальном времени:

- **Выстрел** — нисходящий тон (800–1600 Гц), 160 мс
- **Взрыв** — белый шум, 300 мс  
- **Фоновый гул** — тихая синусоида 120 Гц

Сэмплы генерируются как 16-bit PCM, потом кодируются в A-law (G.711a) вручную и пишутся через `switch_core_session_write_frame()`. Почему вручную? Потому что `write_frame` с кодеком PCMA ожидает уже закодированные данные — FreeSWITCH не перекодирует на лету в этом пути.

```cpp
// A-law кодирование 16-bit PCM
for (int i = 0; i < 160; i++) {
  int16_t s = pcm_buf[i];
  int sign = 0;
  if (s < 0) { s = -s; sign = 0x80; }
  int exp = 0, mantissa;
  if (s >= 256) {
    int shifted = s >> 4;
    for (exp = 1; exp < 7 && shifted > 31; exp++) shifted >>= 1;
    mantissa = (s >> (exp + 3)) & 0x0F;
  } else {
    mantissa = s >> 4;
  }
  alaw_buf[i] = (sign | (exp << 4) | mantissa) ^ 0xD5;
}
```

## Docker

Есть Dockerfile, который собирает всё из исходников: spandsp, sofia-sip, FreeSWITCH, mod_battlecity. На Linux с `--network host` должно работать из коробки.

На macOS Docker Desktop не умеет маршрутизировать UDP от контейнера к хосту — RTP не доходит. Для разработки на маке собирал нативно.

## Что в итоге

{% html5video auto 250px %}/assets/battlecity-view.webm{% endhtml5video %}

Игра работает. Звонишь — видишь поле. Давишь кнопки — танк едет. Стреляешь — пуля летит, стена рушится, враг респаунится. Звонит второй игрок — на поле появляется второй танк.

Это, конечно, proof of concept. Но работающий. И демонстрирующий, что VoIP — это не только голос и видеоконференции. Это программируемая среда, в которой можно делать всё что угодно — от IVR-меню до игр в реальном времени.

[Репозиторий на GitHub](https://github.com/esix/mod_battlecity)
