---
title: "Chicken Chase: старая Windows-игра в браузере"
date: 2026-10-07
layout: post
tags:
  - javascript
  - gamedev
  - retro
  - reverse-engineering
---

Портировал **Chicken Chase**, старую Windows-игру на PopCap Sexy framework, в браузер. Это фермерская аркада: выращиваешь кур, собираешь яйца и защищаешь хозяйство от ворон и других неприятностей.

- [Играть](https://esix.github.io/demo/chicken-chase/)
- [Исходники](https://github.com/esix/chicken-chase)

![Chicken Chase в браузере](screenshot.png)

<!--more-->

Игровая логика перенесена из декомпилированного оригинала на JavaScript функция за функцией. Сама игра рисуется на `canvas`, а диалоги и меню сделаны на HTML и CSS. Получился самостоятельный браузерный порт: без виртуальной машины и без запуска старого Windows-приложения.
