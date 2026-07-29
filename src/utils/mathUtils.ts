/**
 * Math text utility — converts Arabic math descriptions to LaTeX and renders with KaTeX
 * Supports both inline $...$ and block $$...$$ LaTeX notation
 */

export function arabicMathToLatex(text: string): string {
  let result = text;

  // Preserve already-existing LaTeX delimiters
  const latexPlaceholders: string[] = [];
  result = result.replace(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g, (match) => {
    latexPlaceholders.push(match);
    return `%%LATEX_${latexPlaceholders.length - 1}%%`;
  });

  // Arabic math vocabulary → LaTeX
  const replacements: [RegExp, string][] = [
    // Fractions: "كسر X على Y" / "X على Y"
    [/كسر\s+([^\s]+)\s+على\s+([^\s]+)/g, '\\frac{$1}{$2}'],
    [/(\d+)\s+على\s+(\d+)/g, '\\frac{$1}{$2}'],

    // Integral: "تكامل ... دي اكس" / "تكامل ..."
    [/تكامل\s+من\s+([^\s]+)\s+إلى\s+([^\s]+)\s+/g, '\\int_{$1}^{$2} '],
    [/تكامل\s*/g, '\\int '],

    // Derivative: "مشتقة ... بالنسبة لـ"
    [/مشتقة\s+([^\s]+)\s+بالنسبة\s+ل([^\s]+)/g, '\\frac{d($1)}{d$2}'],
    [/مشتقة\s*/g, '\\frac{d}{dx} '],

    // Square root: "جذر X" / "جذر تربيعي X"
    [/جذر\s+تربيعي\s+([^\s,،.؟!]+)/g, '\\sqrt{$1}'],
    [/جذر\s+([^\s,،.؟!]+)/g, '\\sqrt{$1}'],
    [/جذر\s+من\s+([^\s,،.؟!]+)/g, '\\sqrt{$1}'],

    // Powers: "X تربيع" / "X مربع" / "X أس Y" / "X^Y"
    [/([a-zA-Z0-9\u0600-\u06FF]+)\s+تربيع/g, '$1^2'],
    [/([a-zA-Z0-9\u0600-\u06FF]+)\s+مربع/g, '$1^2'],
    [/([a-zA-Z0-9\u0600-\u06FF]+)\s+مكعب/g, '$1^3'],
    [/([a-zA-Z0-9\u0600-\u06FF]+)\s+أس\s+([a-zA-Z0-9]+)/g, '$1^{$2}'],
    [/([a-zA-Z0-9\u0600-\u06FF]+)\s+^([0-9]+)/g, '$1^{$2}'],

    // Trigonometry
    [/جيب\s+تمام\s+([^\s,،]+)/g, '\\cos($1)'],
    [/جيب\s+([^\s,،]+)/g, '\\sin($1)'],
    [/ظل\s+([^\s,،]+)/g, '\\tan($1)'],

    // Logarithm
    [/لوغاريتم\s+طبيعي\s+([^\s,،]+)/g, '\\ln($1)'],
    [/لوغاريتم\s+([^\s,،]+)\s+أساس\s+([^\s,،]+)/g, '\\log_{$2}($1)'],
    [/لوغاريتم\s+([^\s,،]+)/g, '\\log($1)'],

    // Summation: "مجموع من i=1 إلى n"
    [/مجموع\s+من\s+([^\s]+)\s+إلى\s+([^\s]+)/g, '\\sum_{$1}^{$2}'],
    [/مجموع\s*/g, '\\sum '],

    // Limit: "نهاية عندما X تقترب من Y"
    [/نهاية\s+عندما\s+([^\s]+)\s+(?:تقترب|يقترب)\s+من\s+([^\s]+)/g, '\\lim_{$1 \\to $2}'],
    [/نهاية\s*/g, '\\lim '],

    // Infinity
    [/ما\s+لا\s+نهاية/g, '\\infty'],
    [/لانهاية/g, '\\infty'],

    // Operators
    [/\s+زائد\s+/g, ' + '],
    [/\s+ناقص\s+/g, ' - '],
    [/\s+ضرب\s+/g, ' \\times '],
    [/\s+في\s+/g, ' \\times '],
    [/\s+مقسوم\s+على\s+/g, ' \\div '],
    [/\s+يساوي\s+/g, ' = '],
    [/\s+يعادل\s+/g, ' = '],

    // Variable letters
    [/اكس(?!\s*تر)/g, 'x'],
    [/واي/g, 'y'],
    [/زد/g, 'z'],
    [/ان/g, 'n'],

    // Greek letters
    [/ألفا/g, '\\alpha'],
    [/بيتا/g, '\\beta'],
    [/غاما/g, '\\gamma'],
    [/دلتا/g, '\\Delta'],
    [/ثيتا/g, '\\theta'],
    [/باي|π/g, '\\pi'],
    [/لامدا/g, '\\lambda'],
    [/سيجما/g, '\\sigma'],

    // Absolute value
    [/قيمة\s+مطلقة\s+([^\s,،]+)/g, '|$1|'],

    // Matrix / Vector
    [/متجه\s+([^\s,،]+)/g, '\\vec{$1}'],
  ];

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  // Restore LaTeX placeholders
  result = result.replace(/%%LATEX_(\d+)%%/g, (_, i) => latexPlaceholders[parseInt(i)]);

  return result;
}

/**
 * Wrap detected math expressions in $...$
 * Used to make raw Arabic math AI text renderable
 */
export function wrapMathExpressions(text: string): string {
  // If text already has LaTeX markers, return as-is
  if (text.includes('$') || text.includes('\\frac') || text.includes('\\int')) {
    return text;
  }

  // Convert Arabic math first
  const converted = arabicMathToLatex(text);
  return converted;
}
