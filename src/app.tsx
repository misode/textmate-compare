import json5 from 'json5'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import * as textmate from 'vscode-textmate'
import { useAsync } from './async'
import { GrammarPreview } from './grammar'

export function App() {
  const [test, setTest] = useState<string>('')
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/MinecraftCommands/syntax-mcfunction/main/tests/vanilla.mcfunction').then(r => r.text()).then(setTest)
  }, [])

  const [grammar, setGrammar] = useState<string>()
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/Arcensoth/language-mcfunction/main/mcfunction.tmLanguage').then(r => r.text()).then(setGrammar)
  }, [])

  const otherGrammar = useAsync(() => fetch('https://raw.githubusercontent.com/MinecraftCommands/syntax-mcfunction/main/mcfunction.tmLanguage').then(r => r.text()))

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

  useEffect(() => {
    if (!ref0.current || !ref1.current || !ref2.current) return
    const refs = [ref0.current, ref1.current, ref2.current]
    const onScroll = (ref: HTMLElement) => () => {
      for (const r of refs) {
        if (r !== ref) {
          r.scrollTop = ref.scrollTop
          r.scrollLeft = ref.scrollLeft
        }
      }
    }
    for (const ref of refs) {
      ref.addEventListener('scroll', onScroll(ref))
    }
    return () => {
      for (const ref of refs) {
        ref.removeEventListener('scroll', onScroll(ref))
      }
    }
  }, [ref0, ref1, ref2])

  return <main class="h-screen grid grid-cols-2 overflow-hidden" style="color-scheme: dark;">
    {grammar !== undefined && otherGrammar !== undefined && theme !== undefined && <>
      <div class="h-[50vh]">
        <textarea class="h-full w-full bg-neutral-800 p-2 whitespace-pre text-sm font-mono outline-none resize-none" value={grammar} onInput={e => setGrammar((e.target as HTMLTextAreaElement).value)} />
      </div>
      <div class="h-[50vh]">
        <textarea ref={ref0} class="h-full w-full bg-neutral-800 p-2 whitespace-pre text-sm font-mono outline-none resize-none" value={test} onInput={e => setTest((e.target as HTMLTextAreaElement).value)} />
      </div>
      <div ref={ref1} class="overflow-scroll bg-neutral-800 p-2 whitespace-pre text-sm font-mono">
        <GrammarPreview text={test} grammar={grammar} theme={theme} />
      </div>
      <div ref={ref2} class="overflow-scroll bg-neutral-800 p-2 whitespace-pre text-sm font-mono">
        <GrammarPreview text={test} grammar={otherGrammar} theme={theme} />
      </div>
    </>}
  </main>
}
