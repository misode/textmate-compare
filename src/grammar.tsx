import { useEffect, useState } from 'preact/hooks'
import * as textmate from 'vscode-textmate'
import * as oniguruma from 'vscode-oniguruma'
import onigurumaUrl from '../node_modules/vscode-oniguruma/release/onig.wasm?url'

let onigurumaLib: Promise<textmate.IOnigLib> | undefined
async function getOnigLib() {
	if (!onigurumaLib) {
		onigurumaLib = (async () => {
			const response = await fetch(onigurumaUrl)
			return oniguruma.loadWASM(response).then<textmate.IOnigLib>(() => ({
        createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
        createOnigString: (s) => new oniguruma.OnigString(s),
      }))
		})()
	}
	return onigurumaLib
}

export type TokenData = {
  text: string,
  foreground: string,
	italic: boolean,
	bold: boolean,
	underline: boolean,
	striketrough: boolean,
	scopes: string[],
}

type Props = {
	text: string,
	grammar: string,
	theme: textmate.IRawTheme,
	inspect: TokenData | undefined,
	onInspect: (token: TokenData) => void,
}

export function GrammarPreview({ text, grammar, theme, inspect, onInspect }: Props) {
	const [loadedGrammar, setLoadedGrammar] = useState<textmate.IGrammar>()
  const [colormap, setColormap] = useState<string[]>()

  useEffect(() => {
		const registry = new textmate.Registry({
			onigLib: getOnigLib(),
			loadGrammar: async (scopeName) => {
				if (scopeName === 'source.mcfunction') {
					return textmate.parseRawGrammar(grammar)
				}
				return null
			},
			theme: theme,
		})
		registry.loadGrammar('source.mcfunction').then(loadedGrammar => {
			setLoadedGrammar(loadedGrammar ?? undefined)
		})
		const colormap = registry.getColorMap()
		colormap[1] = '#ffffff'
		colormap[2] = '#000000'
		setColormap(colormap)
		return () => registry.dispose()
  }, [grammar])

  const [tokens, setTokens] = useState<TokenData[][]>()

  useEffect(() => {
    if (!loadedGrammar || !colormap) return
    let ruleStack = textmate.INITIAL;
    const tokens: TokenData[][] = []
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]
      const lineData: TokenData[] = []
      const lineTokens = loadedGrammar.tokenizeLine2(line, ruleStack)
			const lineScopes = loadedGrammar.tokenizeLine(line, ruleStack)
      let prevIndex = lineTokens.tokens[0]
      for (let j = 1; j < lineTokens.tokens.length; j += 2) {
				const scopes = lineScopes.tokens[Math.floor(j/2)].scopes
        const metadata = lineTokens.tokens[j]
        const nextIndex = lineTokens.tokens[j+1]
        const text = line.substring(prevIndex, nextIndex)
        const foreground = colormap[(metadata & 0b00000000111111111000000000000000) >>> 15]
				const fontStyle = (metadata & 0b00000000000000000111100000000000) >> 11
        lineData.push({
					text,
					foreground,
					italic: Boolean(fontStyle & 1),
					bold: Boolean(fontStyle & 2),
					underline: Boolean(fontStyle & 4),
					striketrough: Boolean(fontStyle & 8),
					scopes,
				})
        prevIndex = nextIndex
      }
      ruleStack = lineTokens.ruleStack
      tokens.push(lineData)
    }
    setTokens(tokens)
  }, [loadedGrammar, text])

	return <>
		{tokens?.map(line => <div class="w-full">
			{line.map(token => <span class={inspect === token ? 'bg-neutral-700' : ''} style={`color: ${token.foreground};${token.italic ? 'font-style: italic;' : ''}${token.bold ? 'font-weight: bold;' : ''}text-decoration:${token.underline ? 'underline' : ''}${token.striketrough ? ' line-through': ''};`} onMouseEnter={() => onInspect(token)}>
				{token.text}
			</span>)}
			&#8203;
		</div>)}
	</>
}
