/**
 * Convert a negabinary string to a decimal integer.
 */
function negbinToInt(n) {
  let m = 1, r = 0;
  for (let i = n.length - 1; i >= 0; i--) {
    r += (+n[i]) * m;
    m *= -2;
  }
  return r;
}

/**
 * Convert a decimal integer to its canonical negabinary representation.
 */
function intToNegbin(v) {
  const rec = v =>
    (v === 0)  ? '' :
    (v % 2 === 0) ? rec(- v / 2) + '0' :
                    rec(-(v - 1) / 2) + '1';
  return rec(v) || '0';
}


/**
 * Return the canonical negabinary representation of -n.
 */
function neg(n) {
  let r = '';
  for (let i = n.length - 1; i >= 0; i--) {
    if (n[i] === '0') r = '0' + r;
    else {
      i--;
      if (n[i] === '1') r = '01' + r;
      else r = '11' + r;
    }
  }
  return r.replace(/^0+/, '') || '0';
}


/**
 * Compare two canonical negabinary strings.
 *
 * Returns -1 if A < B, 0 if A === B, and 1 if A > B.
 */
function cmp(A, B) {
  A = A.replace(/^0+/, '') || '0';
  B = B.replace(/^0+/, '') || '0';

  if (A === B) return 0;

  const signA = A === '0' ? 0 : (A.length % 2 === 1 ? 1 : -1);
  const signB = B === '0' ? 0 : (B.length % 2 === 1 ? 1 : -1);

  if (signA !== signB) return signA > signB ? 1 : -1;

  if (A.length !== B.length) {
    return signA > 0
      ? (A.length > B.length ? 1 : -1)
      : (A.length < B.length ? 1 : -1);
  }

  for (let i = 0; i < A.length; i++) {
    if (A[i] === B[i]) continue;

    const power = A.length - 1 - i;
    const positiveWeight = power % 2 === 0;

    return positiveWeight
      ? (A[i] > B[i] ? 1 : -1)
      : (A[i] < B[i] ? 1 : -1);
  }

  return 0;
}


/**
 * Add two canonical negabinary strings.
 */
function add(A, B) {
  let cf = 0, R = '', r;
  for (let i = 1; A[A.length - i] || B[B.length - i] || cf; i++) {
    const a = +(A[A.length - i] || '0'), b = +(B[B.length - i] || '0');
    if (cf === 0) {
      if (a === 0 && b === 0) { r = 0; cf = 0 }
      else if (a === 1 && b === 1) { r = 0; cf = -1 }
      else { r = 1; cf = 0 }
    } else if (cf === -1) {
      if (a === 0 && b === 0) { r = 1; cf = 1 }
      else if (a === 1 && b === 1) { r = 1; cf = 0 }
      else { r = 0; cf = 0}
    } else { // CF === 1
      if (a === 0 && b === 0) { r = 1; cf = 0 }
      else if (a === 1 && b === 1) { r = 1; cf = -1 }
      else { r = 0; cf = -1 }
    }
    R = String(r) + R;
  }
  return R.replace(/^0+/, '') || '0';
}


/**
 * Multiply two canonical negabinary strings.
 */
function mul(A, B) {
  let R = '0';
  let right = '';
  for (let i = B.length - 1; i >= 0; i--) {
    if (B[i] === '1') {
      let a = A + right;
      R = add(R, a);
    }
    right += '0';
  }
  return R;
}
