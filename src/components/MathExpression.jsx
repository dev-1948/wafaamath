import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const expressionPattern = /(\$\$[\s\S]+?\$\$|\$[^$\n]+\$)/g;

export default function MathExpression({ value = '' }) {
  const parts = useMemo(() => String(value).split(expressionPattern), [value]);

  return (
    <span className="math-expression">
      {parts.map((part, index) => {
        const display = part.startsWith('$$') && part.endsWith('$$');
        const inline = !display && part.startsWith('$') && part.endsWith('$');
        if (!display && !inline) {
          return <span key={index}>{part}</span>;
        }
        const formula = display ? part.slice(2, -2) : part.slice(1, -1);
        const rendered = katex.renderToString(formula, {
          displayMode: display,
          throwOnError: false,
          strict: 'ignore',
        });
        return (
          <span
            className={display ? 'math-display' : 'math-inline'}
            dir="ltr"
            key={index}
            dangerouslySetInnerHTML={{ __html: rendered }}
          />
        );
      })}
    </span>
  );
}
