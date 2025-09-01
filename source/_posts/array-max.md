title: Поиск максимума в массиве без if
layout: post
date: 2022-08-26
tags:
- crazydev
- C++
- javascript
---

*Попробуем написать поиск максимума в массиве без использования IF*

[C++ version](https://gist.github.com/esix/23df0a0c7cfc0fdccccdbb3f61c9eb4a)

[JS version](https://gist.github.com/esix/2ec60ef68b1553ad81654f125e10486d)

<!--more-->

## Найдем максимум из двух чисел

Воспользумся замечательным свойством

```
|a - b| = a - b, если a >= b
        = b - a, если a < b
```

Таким образом

```
|a - b| + a + b = a - b + a + b = 2a, если a >= b
                = b - a + a + b = 2b, если a < b
```

Итого будем пользоваться формулой
```
max(a, b) = (|a - b| + a + b) / 2
```

Или в коде
```c++
int max(int a, int b) 
{
    return (absolute(a - b) + a + b) / 2;
}
```

## Модуль числа

Можно просто вычислить 
```
|a| = √a²
```

Но для целых чисел придется преобразовывать во float и обратно, могут быть переполнения и прочие неприятности.
Поэтому лучше пожонглируем битами
```
|a| = sign(a) * a
```

Отрицательные будут умножены на `-1` и станут положительными, положительные на `1` и останутся неизмененными
```
int absolute(int a)
{
    return a * sign(a);
}
```

## Знак числа

Тут без if обойтись сложнее 

Создадим вспомогательную функцию
```
sign_helper(a) = (a >> 31) & 1
```
Она берет самый старший бит, где в 32-битном числе хранится знак.

Таким образом

- `sign_helper(a) = 1`, если `a < 0`, т.е. для отрицательных чисел
- `sign_helper(a) = 0`, если `a = 0`, для нуля
- `sign_helper(a) = 0`, если `a > 0`, для положительных

Сам знак числа вычислим через небольшую арифметику
```
sign(a) = 1 - (sign_helper(a - 1) + sign_helper(a));

  a      sign_helper(a)      sign_helper(a - 1)      sign_helper(a - 1) + sign_helper(a)
---------------------------------------------------------------------------------------
 -1          1                     1                              2
  0          0                     1                              1
  1          0                     0                              0
```

Так мы научились отделять `0` от положительных чисел и получили `2`, `1` и `0`

Сам знак числа получается отнятием от `1` этого значения:

- `1 - 2 = -1`, для отрицательных
- `1 - 1 = 0`, для нуля
- `1 - 2 = -1`, для положительных

Весь код
```
int sign_helper(int a) 
{            // 0 when a >= 0; 1 when a < 0
    return (a >> 31) & 1;
}

int sign(int a) 
{
    return 1 - (sign_helper(a - 1)  + sign_helper(a));
}
```

Хотя кажется, что для функции `absolute` нам не нужно явно отличать `0` от не нуля, но такая точность понадобится дальше


## Итерация по массиву

У нас есть массив, например, такой:
```
    int arr[] = {1, 2, 17, 0, -4};
```

Надо по нему проитерироваться, но при этом нельзя использовать `if`. А ведь цикл `for` неявно содержит `if` в условии выхода.

Поэтому будем итерироваться рекурсивно

Нам понадобится длина массива
```
int len = sizeof(arr) / sizeof(arr[0])
```

И напишем примерно нашу функцию
```
int rec(int *arr, int len, int i, int accumulator)
{
    return rec(arr, len, i + 1, max(accumulator, arr[i]));
}
```
Эта функция, разумеется, упадет по stack overflow.

Надо каким-то образом, если `i == len` выйти из функции, вернув `accumulator`

Заметим, что
- `sign(len - i - 1) = 0` на последнем шаге, когда `i = len - 1`
- `sign(len - i - 1) = 1` когда шаг не последний

Объявим массив из двух указателей на функции.
```
typedef int (*t_rec)(int *, int, int, int);                         // function type we will use

int empty(int *arr, int len, int i, int accumulator) 
{
    return accumulator;
}

t_rec nexts[2] = {&empty, &rec}; 
```


По индексу `0` будет лежать указатель на функцию, возвращающую аккумулятор, а по индексу `1` - указатель на саму рекурсивную функцию

Будем брать следующую функцию из этого массива по индексу `sign(len - i - 1)`

```
int rec(int *arr, int len, int i, int accumulator) 
{
    t_rec nexts[2] = {&empty, &rec};
    t_rec next = nexts[sign(len - i - 1)];
    return (*next)(arr, len, i + 1, max(accumulator, arr[i]));
}
```

Теперь надо вызывать правильно эту фунцию. В качестве начального значения аккумулятора передадим минимальное значение для int: `std::numeric_limits<int>::min()`

```
int max_arr(int* arr, int len) 
{
    return rec(arr, len, 0,  std::numeric_limits<int>::min());
}
```


## Весь код
```c++
#include <iostream>
#include <vector>
#include <limits>       // std::numeric_limits
using namespace std;

int sign_helper(int a) 
{            // 0 when a >= 0; 1 when a < 0
    return (a >> 31) & 1;
}

int sign(int a) 
{
    return 1 - (sign_helper(a - 1)  + sign_helper(a));
}

int absolute(int a) 
{
    return a * sign(a);
}

int max(int a, int b) 
{
    return (absolute(a - b) + a + b) / 2;
}


typedef int (*t_rec)(int *, int, int, int);                         // function type we will use

int empty(int *arr, int len, int i, int accumulator) 
{
    return accumulator;
}

int rec(int *arr, int len, int i, int accumulator) 
{
    t_rec nexts[2] = {&empty, &rec};                                 // will recursively call one of these functions
    t_rec next = nexts[sign(len - i - 1)];                           // this one is either empty or rec
    return (*next)(arr, len, i + 1, max(accumulator, arr[i]));
}

int max_arr(int* arr, int len) 
{
    return rec(arr, len, 0,  std::numeric_limits<int>::min());
}


int main()
{
    int arr[] = {1, 2, 17, 0, -4};
    cout<< max_arr(arr, sizeof(arr) / sizeof(arr[0]));
    return 0;
}
```


## Вариант на javascript

```javascript
const sign_helper = a => (a >> 31) & 1;
const sign = a => 1 - (sign_helper(a - 1)  + sign_helper(a));
const absolute = a => a * sign(a);
const max = (a, b) => (absolute(a - b) + a + b) / 2;
const empty = (arr, i, accumulator) => accumulator;
const rec = (arr, i, accumulator) => {
    const nexts = [empty, rec];
    const next = nexts[sign(arr.length - i - 1)];
    return next(arr, i + 1, max(accumulator, arr[i]));
}
const maxArr = arr => rec(arr, 0,  -0x7fffffff);

console.log(maxArr([-3, 5, 19, 7, 123, 11, -3, 0]));
```
