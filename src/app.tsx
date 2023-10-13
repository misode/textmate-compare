import json5 from 'json5'
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import * as textmate from 'vscode-textmate'
import { useAsync } from './async'
import { GrammarPreview, TokenData } from './grammar'
import * as yaml from 'js-yaml'

export function App() {
  const [test, setTest] = useState<string>('')
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/MinecraftCommands/syntax-mcfunction/main/tests/vanilla.mcfunction').then(r => r.text()).then(setTest)
  }, [])

  const [yamlGrammar, setGrammar] = useState<string>()
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/MinecraftCommands/syntax-mcfunction/main/mcfunction.tmLanguage.yaml').then(r => r.text()).then(setGrammar)
  }, [])
  const plistGrammar = useMemo(() => {
    if (!yamlGrammar) return undefined
    const data = yaml.load(yamlGrammar)
    const plist = toPlist(data)
    return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0">${plist}</plist>`
  }, [yamlGrammar])

  const otherGrammar = useAsync(() => fetch('https://raw.githubusercontent.com/Arcensoth/language-mcfunction/main/mcfunction.tmLanguage').then(r => r.text()))

  const theme1 = useAsync(() => fetch('https://raw.githubusercontent.com/microsoft/vscode/main/extensions/theme-defaults/themes/dark_vs.json').then(r => r.text()))
  const theme2 = useAsync(() => fetch('https://raw.githubusercontent.com/microsoft/vscode/main/extensions/theme-defaults/themes/dark_plus.json').then(r => r.text()))
  const theme = useMemo(() => {
    const combined: textmate.IRawTheme = { settings: [] }
    for (const text of [theme1, theme2]) {
      if (text === undefined) return undefined
      const theme = json5.parse(text)
      combined.settings.unshift(...theme.tokenColors)
    }
    return combined
  }, [theme1, theme2])

  const ref0 = useRef<HTMLTextAreaElement>(null)
  const ref1 = useRef<HTMLDivElement>(null)
  const ref2 = useRef<HTMLDivElement>(null)

  const onScroll = useCallback((e: Event) => {
    const refs = [ref0.current, ref1.current, ref2.current]
    const target = e.target as HTMLElement
    for (const r of refs) {
      if (!r || r === target) continue
      r.scrollTop = target.scrollTop
      r.scrollLeft = target.scrollLeft
    }
  }, [ref0, ref1, ref2])

	const [inspect, setInspect] = useState<TokenData>()

  return <main class="h-screen grid grid-cols-2 overflow-hidden" style="color-scheme: dark;">
    {plistGrammar !== undefined && otherGrammar !== undefined && theme !== undefined && <>
      <div class="h-[33vh]" onMouseEnter={() => setInspect(undefined)}>
        <textarea class="h-full w-full p-2 bg-neutral-900 whitespace-pre text-sm font-mono outline-none resize-none overflow-scroll" value={yamlGrammar} onInput={e => setGrammar((e.target as HTMLTextAreaElement).value)} />
      </div>
      <div class="h-[33vh]" onMouseEnter={() => setInspect(undefined)}>
        <textarea ref={ref0} class="h-full w-full p-2 bg-neutral-900 whitespace-pre text-sm font-mono outline-none resize-none overflow-scroll" value={test} onInput={e => setTest((e.target as HTMLTextAreaElement).value)} onScroll={onScroll}/>
      </div>
      <div ref={ref1} class="overflow-scroll p-2 whitespace-pre text-sm font-mono" onScroll={onScroll}>
        <GrammarPreview text={test} grammar={plistGrammar} theme={theme} inspect={inspect} onInspect={setInspect} />
      </div>
      <div ref={ref2} class="overflow-scroll p-2 whitespace-pre text-sm font-mono" onScroll={onScroll}>
        <GrammarPreview text={test} grammar={otherGrammar} theme={theme} inspect={inspect} onInspect={setInspect} />
      </div>
      {inspect && <div class="bg-neutral-800 col-span-2 font-mono px-2 py-1">
        <div>
          Style: <span class="inline-block relative top-0.5 w-4 h-4 align-baseline" style={`background-color: ${inspect.foreground}`}/> {inspect.foreground} {inspect.italic && 'italic'} {inspect.bold && 'bold'} {inspect.underline && 'underline'} {inspect.striketrough && 'strikethrough'}
        </div>
        <div>
          Scopes: {[...inspect.scopes].reverse().join(', ')}
        </div>
      </div>}
    </>}
  </main>
}

function toPlist(obj: unknown): string {
  if (Array.isArray(obj)) {
    return `<array>${obj.map(item => toPlist(item)).join('')}</array>`;
  } else if (typeof obj === 'object' && obj !== null) {
    const entries = Object.entries(obj);
    return `<dict>${entries.map(([key, value]) => `<key>${key}</key>${toPlist(value)}`).join('')}</dict>`;
  } else if (Number.isInteger(obj)) {
    return `<integer>${obj}</integer>`;
  } else if (typeof obj === 'number') {
    return `<real>${obj}</real>`;
  } else {
    return `<${typeof obj}>${obj}</${typeof obj}>`;
  }
}
