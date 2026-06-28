// tabs
(function() {
  var widgets = document.querySelectorAll('[data-negbin-tabs]');

  widgets.forEach(function(widget, widgetIndex) {
    var tabList = widget.querySelector('.negbin-tabs-list');
    var panels = Array.prototype.slice.call(widget.querySelectorAll('.negbin-tab-panel'));

    if (!tabList || panels.length === 0) return;

    var buttons = panels.map(function(panel, index) {
      var title = panel.getAttribute('data-tab-title') || ('Tab ' + (index + 1));
      var button = document.createElement('button');
      var tabId = 'negbin-tabs-' + widgetIndex + '-tab-' + index;
      var panelId = 'negbin-tabs-' + widgetIndex + '-panel-' + index;

      button.type = 'button';
      button.className = 'negbin-tab-button';
      button.id = tabId;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', panelId);
      button.textContent = title;

      panel.id = panelId;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tabId);
      panel.setAttribute('tabindex', '0');

      tabList.appendChild(button);
      return button;
    });

    function activate(index, focusButton) {
      buttons.forEach(function(button, buttonIndex) {
        var active = buttonIndex === index;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
        button.setAttribute('tabindex', active ? '0' : '-1');
        panels[buttonIndex].hidden = !active;
      });

      if (focusButton) buttons[index].focus();
    }

    buttons.forEach(function(button, index) {
      button.addEventListener('click', function() {
        activate(index, false);
      });

      button.addEventListener('keydown', function(event) {
        var nextIndex = index;

        if (event.key === 'ArrowRight') {
          nextIndex = (index + 1) % buttons.length;
        } else if (event.key === 'ArrowLeft') {
          nextIndex = (index + buttons.length - 1) % buttons.length;
        } else if (event.key === 'Home') {
          nextIndex = 0;
        } else if (event.key === 'End') {
          nextIndex = buttons.length - 1;
        } else {
          return;
        }

        event.preventDefault();
        activate(nextIndex, true);
      });
    });

    activate(0, false);
  });

})();


(function () {
  var widgets = document.querySelectorAll('[data-negbin-converter]');

  function explainNegbin(value) {
    var digits = value.split('');
    var terms = [];
    var sum = 0;

    for (var i = 0; i < digits.length; i++) {
      var bit = Number(digits[i]);
      var power = digits.length - 1 - i;
      var weight = Math.pow(-2, power);
      var contribution = bit * weight;

      terms.push(bit + '⋅(' + weight + ')');
      sum += contribution;
    }

    return value + '₋₂ = ' + terms.join(' + ') + ' = ' + sum;
  }

  widgets.forEach(function (widget) {
    var decimalInput = widget.querySelector('[data-decimal-input]');
    var negbinInput = widget.querySelector('[data-negbin-input]');
    var result = widget.querySelector('[data-converter-result]');
    var note = widget.querySelector('[data-converter-note]');

    if (!decimalInput || !negbinInput || !result || !note) return;

    function setError(message) {
      result.textContent = '';
      note.textContent = message;
      widget.classList.add('has-error');
    }

    function setValue(decimalValue, negbinValue) {
      decimalInput.value = String(decimalValue);
      negbinInput.value = negbinValue;
      result.textContent = decimalValue + '₁₀ = ' + negbinValue + '₋₂';
      note.textContent = explainNegbin(negbinValue);
      widget.classList.remove('has-error');
    }

    decimalInput.addEventListener('input', function () {
      var value = Number(decimalInput.value);

      if (!Number.isInteger(value)) {
        setError('Введите целое десятичное число.');
        return;
      }

      setValue(value, intToNegbin(value));
    });

    negbinInput.addEventListener('input', function () {
      var value = negbinInput.value.trim();

      if (!/^[01]+$/.test(value)) {
        setError('В минусдвоичной записи могут быть только 0 и 1.');
        return;
      }

      setValue(negbinToInt(value), value.replace(/^0+(?=.)/, ''));
    });

    setValue(Number(decimalInput.value || 0), intToNegbin(Number(decimalInput.value || 0)));
  });
}());


(function () {
  var widgets = document.querySelectorAll('[data-negbin-compare-widget]');

  function normalizeNegbin(value) {
    return value.replace(/^0+(?=.)/, '') || '0';
  }

  function signOf(value) {
    if (value === '0') return 0;
    return value.length % 2 === 1 ? 1 : -1;
  }

  function signText(sign) {
    if (sign > 0) return 'положительное';
    if (sign < 0) return 'отрицательное';
    return 'ноль';
  }

  function compareNegbin(a, b) {
    var order = cmp(a, b);

    if (a === b) {
      return { order: order, reason: 'Записи после удаления ведущих нулей совпадают.' };
    }

    var signA = signOf(a);
    var signB = signOf(b);

    if (signA !== signB) {
      return {
        order: order,
        reason: a + ' - ' + signText(signA) + ', ' + b + ' - ' + signText(signB) + '.'
      };
    }

    if (a.length !== b.length) {
      var positive = signA > 0;

      return {
        order: order,
        reason: positive
          ? 'Оба числа положительные: более длинная запись больше.'
          : 'Оба числа отрицательные: более длинная запись меньше.'
      };
    }

    for (var i = 0; i < a.length; i++) {
      if (a[i] === b[i]) continue;

      var power = a.length - 1 - i;
      var positiveWeight = power % 2 === 0;

      return {
        order: order,
        reason: 'Первое отличие в разряде (-2)^' + power + '. Его вес ' + (positiveWeight ? 'положительный' : 'отрицательный') + '.'
      };
    }

    return { order: 0, reason: 'Записи совпадают.' };
  }

  widgets.forEach(function (widget) {
    var inputA = widget.querySelector('[data-compare-a]');
    var inputB = widget.querySelector('[data-compare-b]');
    var result = widget.querySelector('[data-compare-result]');
    var note = widget.querySelector('[data-compare-note]');

    if (!inputA || !inputB || !result || !note) return;

    function setError(message) {
      result.textContent = '';
      note.textContent = message;
      widget.classList.add('has-error');
    }

    function render() {
      var a = inputA.value.trim();
      var b = inputB.value.trim();

      if (!/^[01]+$/.test(a) || !/^[01]+$/.test(b)) {
        setError('В минусдвоичной записи могут быть только 0 и 1.');
        return;
      }

      a = normalizeNegbin(a);
      b = normalizeNegbin(b);

      var comparison = compareNegbin(a, b);
      var symbol = comparison.order < 0 ? '<' : comparison.order > 0 ? '>' : '=';

      result.textContent = a + '₋₂ ' + symbol + ' ' + b + '₋₂';
      note.textContent = comparison.reason + ' Проверка: ' + negbinToInt(a) + ' ' + symbol + ' ' + negbinToInt(b) + '.';
      widget.classList.remove('has-error');
    }

    inputA.addEventListener('input', render);
    inputB.addEventListener('input', render);
    render();
  });
}());


(function () {
  var widgets = document.querySelectorAll('[data-negbin-neg-widget]');

  function normalizeNegbin(value) {
    return value.replace(/^0+(?=.)/, '') || '0';
  }

  function explainRules(value) {
    var steps = [];

    for (var i = value.length - 1; i >= 0; i--) {
      if (value[i] === '0') {
        steps.push('0 -> 0');
      } else {
        var left = i > 0 ? value[i - 1] : '0';
        steps.push(left + '1 -> ' + (left === '1' ? '01' : '11'));
        i--;
      }
    }

    return 'Правило справа налево: ' + steps.reverse().join(', ') + '.';
  }

  widgets.forEach(function (widget) {
    var input = widget.querySelector('[data-neg-input]');
    var output = widget.querySelector('[data-neg-output]');
    var result = widget.querySelector('[data-neg-result]');
    var note = widget.querySelector('[data-neg-note]');

    if (!input || !output || !result || !note) return;

    function setError(message) {
      output.value = '';
      result.textContent = '';
      note.textContent = message;
      widget.classList.add('has-error');
    }

    function render() {
      var rawValue = input.value.trim();

      if (!/^[01]+$/.test(rawValue)) {
        setError('В минусдвоичной записи могут быть только 0 и 1.');
        return;
      }

      var value = normalizeNegbin(rawValue);
      var negated = neg(value);
      var decimal = negbinToInt(value);
      var negatedDecimal = negbinToInt(negated);

      output.value = negated;
      result.textContent = value + '₋₂ = ' + decimal + '₁₀, ' + negated + '₋₂ = ' + negatedDecimal + '₁₀';
      note.textContent = explainRules(value);
      widget.classList.remove('has-error');
    }

    input.addEventListener('input', render);
    render();
  });
}());


(function () {
  var widgets = document.querySelectorAll('[data-negbin-mul-widget]');

  function normalizeNegbin(value) {
    return value.replace(/^0+(?=.)/, '') || '0';
  }

  function getPartials(a, b) {
    var partials = [];
    var sum = '0';
    var shift = '';

    for (var i = b.length - 1; i >= 0; i--) {
      if (b[i] === '1') {
        var partial = normalizeNegbin(a + shift);
        sum = add(sum, partial);
        partials.push({
          bit: b.length - 1 - i,
          value: partial,
          decimal: negbinToInt(partial),
          sum: sum,
          sumDecimal: negbinToInt(sum)
        });
      }

      shift += '0';
    }

    return partials;
  }

  widgets.forEach(function (widget) {
    var inputA = widget.querySelector('[data-mul-a]');
    var inputB = widget.querySelector('[data-mul-b]');
    var result = widget.querySelector('[data-mul-result]');
    var steps = widget.querySelector('[data-mul-steps]');
    var note = widget.querySelector('[data-mul-note]');

    if (!inputA || !inputB || !result || !steps || !note) return;

    function setError(message) {
      result.textContent = '';
      steps.innerHTML = '';
      note.textContent = message;
      widget.classList.add('has-error');
    }

    function render() {
      var a = inputA.value.trim();
      var b = inputB.value.trim();

      if (!/^[01]+$/.test(a) || !/^[01]+$/.test(b)) {
        setError('В минусдвоичной записи могут быть только 0 и 1.');
        return;
      }

      a = normalizeNegbin(a);
      b = normalizeNegbin(b);

      var product = mul(a, b);
      var partials = getPartials(a, b);
      var rows = partials.map(function (partial) {
        return '<tr><td>' + partial.bit + '</td><td>' + partial.value + '₋₂</td><td>' + partial.decimal + '</td><td>' + partial.sum + '₋₂</td></tr>';
      }).join('');

      if (partials.length === 0) {
        rows = '<tr><td colspan="4">Все цифры второго множителя равны 0.</td></tr>';
      }

      result.textContent = a + '₋₂ × ' + b + '₋₂ = ' + product + '₋₂ = ' + negbinToInt(product) + '₁₀';
      steps.innerHTML = '<table><thead><tr><th>Разряд</th><th>Частичное</th><th>Значение</th><th>Сумма</th></tr></thead><tbody>' + rows + '</tbody></table>';
      note.textContent = 'Проверка: ' + negbinToInt(a) + ' × ' + negbinToInt(b) + ' = ' + (negbinToInt(a) * negbinToInt(b)) + '.';
      widget.classList.remove('has-error');
    }

    inputA.addEventListener('input', render);
    inputB.addEventListener('input', render);
    render();
  });
}());



(function () {
  var widgets = document.querySelectorAll('[data-negbin-add-widget]');

  function padLeft(value, width) {
    var result = value;
    while (result.length < width) result = ' ' + result;
    return result.split('');
  }

  function cfLabel(value) {
    if (value === -1) return '◦';
    if (value === 1) return '•';
    return ' ';
  }

  function cfText(value) {
    if (value === -1) return 'CF=-1 (◦)';
    if (value === 1) return 'CF=1 (•)';
    return 'CF пустой';
  }

  function addNegbin(a, b) {
    var aDigits = a.split('').reverse().map(Number);
    var bDigits = b.split('').reverse().map(Number);
    var result = [];
    var carries = [];
    var steps = [];
    var carry = 0;
    var index = 0;

    while (index < aDigits.length || index < bDigits.length || carry !== 0) {
      var aBit = aDigits[index] || 0;
      var bBit = bDigits[index] || 0;
      var currentCarry = carry;
      var sum = aBit + bBit + currentCarry;
      var bit = ((sum % 2) + 2) % 2;
      var nextCarry = (bit - sum) / 2;

      result.push(String(bit));
      carries.push(cfLabel(currentCarry));

      var parts = [];
      if (currentCarry !== 0) parts.push(cfLabel(currentCarry));
      parts.push(String(aBit));
      parts.push(String(bBit));

      steps.push(parts.join(' + ') + ': пишем ' + bit + ', ' + cfText(nextCarry) + '.');

      carry = nextCarry;
      index++;
    }

    var resultDisplay = result.reverse().join('');
    var resultValue = resultDisplay.replace(/^0+(?=.)/, '') || '0';
    var width = Math.max(a.length, b.length, resultDisplay.length, carries.length);

    return {
      width: width,
      a: padLeft(a, width),
      b: padLeft(b, width),
      result: padLeft(resultDisplay, width),
      carries: padLeft(carries.reverse().join(''), width),
      resultValue: resultValue,
      decimalA: negbinToInt(a),
      decimalB: negbinToInt(b),
      decimalResult: negbinToInt(resultValue),
      steps: ['Наведи мышку справа налево: сначала видны только слагаемые.'].concat(steps)
    };
  }

  widgets.forEach(function (widget) {
    var rows = {
      carry: widget.querySelector('[data-row="carry"]'),
      a: widget.querySelector('[data-row="a"]'),
      b: widget.querySelector('[data-row="b"]'),
      result: widget.querySelector('[data-row="result"]')
    };
    var progress = widget.querySelector('[data-progress]');
    var stepText = widget.querySelector('[data-step-text]');
    var resultValue = widget.querySelector('[data-result-value]');
    var aValueNode = widget.querySelector('[data-value="a"]');
    var bValueNode = widget.querySelector('[data-value="b"]');

    if (!rows.carry || !rows.a || !rows.b || !rows.result || !progress || !stepText || !resultValue || !aValueNode || !bValueNode) return;

    var aValue = (widget.getAttribute('data-a') || '0').replace(/^0+(?=.)/, '');
    var bValue = (widget.getAttribute('data-b') || '0').replace(/^0+(?=.)/, '');
    var addition = addNegbin(aValue, bValue);
    var width = addition.width;
    var steps = addition.steps;

    widget.style.setProperty('--negbin-add-width', width);
    aValueNode.textContent = '( ' + addition.decimalA + ')';
    bValueNode.textContent = '( ' + addition.decimalB + ')';
    resultValue.textContent = '( ' + addition.decimalResult + ')';

    function fillRow(row, values) {
      row.innerHTML = '';
      values.forEach(function (value) {
        var cell = document.createElement('span');
        cell.className = 'negbin-add-digit';
        if (value === ' ') cell.className += ' is-empty';
        cell.textContent = value === ' ' ? '0' : value;
        row.appendChild(cell);
      });
    }

    function setVisibleRow(row, values, visibleFromRight, activeColumn) {
      Array.prototype.forEach.call(row.children, function (cell, index) {
        var bitFromRight = width - 1 - index;
        var visible = bitFromRight < visibleFromRight;
        var value = values[index];

        cell.textContent = visible ? value : '0';
        cell.classList.toggle('is-empty', !visible || value === ' ');
        cell.classList.toggle('is-active', index === activeColumn);
      });
    }

    fillRow(rows.carry, addition.carries);
    fillRow(rows.a, addition.a);
    fillRow(rows.b, addition.b);
    fillRow(rows.result, addition.result);

    function render(step) {
      var solvedBits = Math.max(0, step);
      var visibleCarryBits = step === 0 ? 0 : Math.min(width, solvedBits + 1);
      var activeColumn = step === 0 ? -1 : width - step;

      setVisibleRow(rows.carry, addition.carries, visibleCarryBits, activeColumn);
      setVisibleRow(rows.result, addition.result, solvedBits, activeColumn);

      Array.prototype.forEach.call(rows.a.children, function (cell, index) {
        cell.classList.toggle('is-active', index === activeColumn);
      });
      Array.prototype.forEach.call(rows.b.children, function (cell, index) {
        cell.classList.toggle('is-active', index === activeColumn);
      });

      resultValue.style.visibility = step === steps.length - 1 ? 'visible' : 'hidden';
      stepText.textContent = steps[step];
      progress.style.width = (step / (steps.length - 1) * 100) + '%';
    }

    function stepFromClientX(clientX) {
      var rect = widget.getBoundingClientRect();
      var x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      return Math.round((1 - x / rect.width) * (steps.length - 1));
    }

    widget.addEventListener('pointermove', function (event) {
      render(stepFromClientX(event.clientX));
    });

    widget.addEventListener('pointerdown', function (event) {
      widget.setPointerCapture(event.pointerId);
      render(stepFromClientX(event.clientX));
    });

    widget.addEventListener('mouseleave', function () {
      render(0);
    });

    render(0);
  });
}());
