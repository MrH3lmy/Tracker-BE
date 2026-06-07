import { useState, type ReactNode } from 'react';
import type { NoteContentType } from './noteTypes';
import './CodePreview.css';

interface CodePreviewProps {
  body: string;
  contentType: NoteContentType;
  collapsedLineCount?: number;
  initiallyCollapsed?: boolean;
}

type TokenType = 'plain' | 'keyword' | 'name' | 'property' | 'string' | 'number' | 'boolean' | 'nil' | 'mark';

interface Token {
  type: TokenType;
  value: string;
}

const DEFAULT_COLLAPSED_LINE_COUNT = 12;

const LANGUAGE_LABELS: Record<NoteContentType, string> = {
  PLAIN_TEXT: 'Plain text',
  MARKDOWN: 'Markdown',
  SHELL_COMMANDS: 'Shell',
  XML: 'XML',
  JSON: 'JSON',
};

const XML_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_.:-]*/;

function splitLines(value: string): string[] {
  const normalized = value.replace(/\r\n/g, '\n');
  return normalized.length > 0 ? normalized.split('\n') : [''];
}

function pushToken(tokens: Token[], type: TokenType, value: string) {
  if (value) tokens.push({ type, value });
}

function readQuotedValue(line: string, start: number): number {
  const quote = line[start];
  let cursor = start + 1;
  while (cursor < line.length && line[cursor] !== quote) cursor++;
  return Math.min(cursor + 1, line.length);
}

function tokenizeMarkupLine(line: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;

  while (cursor < line.length) {
    const openIndex = line.indexOf('<', cursor);
    if (openIndex === -1) {
      pushToken(tokens, 'plain', line.slice(cursor));
      break;
    }

    pushToken(tokens, 'plain', line.slice(cursor, openIndex));
    pushToken(tokens, 'mark', '<');
    cursor = openIndex + 1;

    if (line[cursor] === '/') {
      pushToken(tokens, 'mark', '/');
      cursor++;
    }

    const nameMatch = line.slice(cursor).match(XML_NAME_PATTERN);
    if (nameMatch) {
      pushToken(tokens, 'name', nameMatch[0]);
      cursor += nameMatch[0].length;
    }

    while (cursor < line.length && line[cursor] !== '>') {
      if (line[cursor].trim() === '') {
        pushToken(tokens, 'plain', line[cursor]);
        cursor++;
        continue;
      }

      if (line[cursor] === '/' || line[cursor] === '=') {
        pushToken(tokens, 'mark', line[cursor]);
        cursor++;
        continue;
      }

      if (line[cursor] === '"' || line[cursor] === "'") {
        const end = readQuotedValue(line, cursor);
        pushToken(tokens, 'string', line.slice(cursor, end));
        cursor = end;
        continue;
      }

      const attrMatch = line.slice(cursor).match(XML_NAME_PATTERN);
      if (attrMatch) {
        pushToken(tokens, 'property', attrMatch[0]);
        cursor += attrMatch[0].length;
        continue;
      }

      pushToken(tokens, 'plain', line[cursor]);
      cursor++;
    }

    if (cursor < line.length && line[cursor] === '>') {
      pushToken(tokens, 'mark', '>');
      cursor++;
    }
  }

  return tokens;
}

function tokenizeJsonLine(line: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;

  while (cursor < line.length) {
    const char = line[cursor];

    if ('{}[],:'.includes(char)) {
      pushToken(tokens, 'mark', char);
      cursor++;
      continue;
    }

    if (char === '"') {
      const end = readQuotedValue(line, cursor);
      const nextNonSpace = line.slice(end).trimStart()[0];
      pushToken(tokens, nextNonSpace === ':' ? 'property' : 'string', line.slice(cursor, end));
      cursor = end;
      continue;
    }

    const rest = line.slice(cursor);
    const numberMatch = rest.match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (numberMatch) {
      pushToken(tokens, 'number', numberMatch[0]);
      cursor += numberMatch[0].length;
      continue;
    }

    if (rest.startsWith('true') || rest.startsWith('false')) {
      const value = rest.startsWith('true') ? 'true' : 'false';
      pushToken(tokens, 'boolean', value);
      cursor += value.length;
      continue;
    }

    if (rest.startsWith('null')) {
      pushToken(tokens, 'nil', 'null');
      cursor += 4;
      continue;
    }

    pushToken(tokens, 'plain', char);
    cursor++;
  }

  return tokens;
}

function tokensForLine(line: string, contentType: NoteContentType): Token[] {
  if (contentType === 'XML') return tokenizeMarkupLine(line);
  if (contentType === 'JSON') return tokenizeJsonLine(line);
  return [{ type: 'plain', value: line }];
}

function renderTokens(tokens: Token[], lineIndex: number): ReactNode {
  return tokens.map((token, tokenIndex) => (
    <span key={`${lineIndex}-${tokenIndex}`} className={`code-token code-token--${token.type}`}>
      {token.value}
    </span>
  ));
}

export function CodePreview({
  body,
  contentType,
  collapsedLineCount = DEFAULT_COLLAPSED_LINE_COUNT,
  initiallyCollapsed = true,
}: CodePreviewProps) {
  const lines = splitLines(body);
  const [expanded, setExpanded] = useState(!initiallyCollapsed);
  const isHighlighted = contentType === 'XML' || contentType === 'JSON';
  const canCollapse = lines.length > collapsedLineCount;
  const isCollapsed = canCollapse && !expanded;
  const visibleLines = isCollapsed ? lines.slice(0, collapsedLineCount) : lines;

  return (
    <div className={`code-preview${isHighlighted ? ' code-preview--highlighted' : ' code-preview--plain'}${isCollapsed ? ' code-preview--collapsed' : ''}`}>
      <div className="code-preview__header" aria-hidden="true">
        <span className="code-preview__dot" />
        <span className="code-preview__dot" />
        <span className="code-preview__dot" />
        <span className="code-preview__language">{LANGUAGE_LABELS[contentType]}</span>
      </div>
      <pre className="code-preview__body" aria-label={`${LANGUAGE_LABELS[contentType]} note body`}>
        <code>
          {visibleLines.map((line, index) => (
            <span className="code-preview__line" key={`line-${index}`}>
              <span className="code-preview__line-number" aria-hidden="true">{index + 1}</span>
              <span className="code-preview__line-content">
                {renderTokens(tokensForLine(line, contentType), index)}
              </span>
            </span>
          ))}
        </code>
      </pre>
      {canCollapse ? (
        <div className="code-preview__footer">
          <span>{expanded ? `${lines.length} lines shown` : `Showing first ${visibleLines.length} of ${lines.length} lines`}</span>
          <button type="button" className="code-preview__toggle" onClick={() => setExpanded((current) => !current)}>
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
