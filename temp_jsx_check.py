from pathlib import Path
import re

path = Path('src/Components/Admin.jsx')
text = path.read_text(encoding='utf-8')
start = text.find('return (')
if start == -1:
    print('return not found')
    raise SystemExit(1)
text = text[start:]
line_offset = 1 + text[:start].count('\n')

# Remove string literals
out = []
i = 0
while i < len(text):
    ch = text[i]
    if ch in '"\'\`':
        quote = ch
        out.append(ch)
        i += 1
        while i < len(text):
            if text[i] == '\\':
                out.append(' ')
                i += 2
            elif text[i] == quote:
                out.append(quote)
                i += 1
                break
            else:
                out.append(' ')
                i += 1
    else:
        out.append(ch)
        i += 1
clean = ''.join(out)

stack = []
for m in re.finditer(r'<(/?)([A-Za-z0-9_:-]+)([^>]*)>', clean):
    whole = m.group(0)
    tag = m.group(2)
    start_idx = m.start()
    line = line_offset + clean[:start_idx].count('\n')
    if whole.startswith('</'):
        if not stack:
            print('extra closing', tag, 'at', line)
            break
        top = stack.pop()
        if top[0] != tag:
            print('tag mismatch', top[0], 'closed by', tag, 'at', line)
            break
    else:
        if whole.endswith('/>') or tag in ['img','input','br','hr','meta','link','path','rect','circle','line','stop']:
            continue
        stack.append((tag, line))
else:
    if stack:
        print('unclosed', stack[-1])
    else:
        print('balanced')
